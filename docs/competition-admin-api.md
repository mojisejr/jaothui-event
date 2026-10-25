# Competition administration bridge

Related work: [#106](https://github.com/mojisejr/jaothui-event/issues/106).

The event application owns competition rules and Sanity mutations. Dashboard
operators use the existing shared dashboard login; its server calls this REST
bridge. The dashboard must not receive a Sanity writer credential in browser code.
Phases 1–4 implement the policy, bridge, dashboard workspace, application review,
onsite entry and exports. Phase 5 adds the opt-in legacy admin cutover and release
regression coverage. Production cutover remains pending complete engineering
verification, designated LINE proof and operator acceptance; code readiness is
not production acceptance.

## Configuration

| Variable                                                       | Purpose and default                                                                                                                                                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JAOTHUI_COMPETITION_ADMIN_API_KEY`                            | Source server bearer secret, at least 32 characters. Missing/short configuration fails closed. Match the dashboard server setting; never expose it through `NEXT_PUBLIC_*`.                                                                        |
| `JAOTHUI_COMPETITION_ADMIN_WRITES_ENABLED`                     | Only the exact value `true` permits bridge mutations, including cover uploads and impact report creation. Default: disabled. Reads still require the bearer secret.                                                                                |
| `SANITY_API_WRITE_TOKEN`                                       | Preferred server-only Sanity writer token. Provision the appropriate project/dataset permissions.                                                                                                                                                  |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` | Existing Sanity project/dataset selection. The server writer and public readers must target the intended same dataset.                                                                                                                             |
| `LINE_LOGIN_CHANNEL_ID`                                        | Preferred LINE Login channel used to verify public applicant credentials. If absent, the channel prefix of `NEXT_PUBLIC_LIFF_ID` is used.                                                                                                          |
| `COMPETITION_LINE_NOTIFICATIONS_ENABLED`                       | Only exact `true` enables the new admin notification retry path. Default: disabled. Approval persistence remains separate from delivery.                                                                                                           |
| `oa_token`                                                     | Existing LINE Messaging API credential, needed for enabled delivery. Keep server-only.                                                                                                                                                             |
| `COMPETITION_LEGACY_ADMIN_DISABLED`                            | Only exact `true` disables old competition admin procedures/services and redirects old competition admin pages. Missing/false retains source-first compatibility. Independent of bridge write/LINE switches.                                       |
| `JAOTHUI_COMPETITION_DASHBOARD_URL`                            | Source-server destination: HTTPS origin or exact `/dashboard/competitions` base. No credentials, query, fragment or other path. Loopback HTTP only outside production. Invalid/missing config with cutover on serves safe503 with no old controls. |

The server writer temporarily falls back to the old `NEXT_PUBLIC_SANITY_TOKEN`
value when `SANITY_API_WRITE_TOKEN` is absent. That lookup is confined to the
server client; the shared browser client no longer receives the token. Configure
the new server-only token first, verify all affected consumers and deployments,
then rotate/revoke the old exposed credential and remove its environment value.
Do not revoke it before dependent consumers are ready.

The dashboard server additionally needs
`JAOTHUI_COMPETITION_ADMIN_API_BASE_URL` pointing to this source application and
the same bridge key. Use the source origin without an API path suffix.

## Routes and mutation contracts

All routes live under `/api/admin/competitions` and require
`Authorization: Bearer <server secret>`. Responses use `{data: ...}` or a
sanitized `{error: {code, message}}`; responses are not cached.

| Method/path                                                                                | Operation                                                                                                  |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `GET /`                                                                                    | Search, composed lifecycle/registration/type/date filters, paging and counts.                              |
| `POST /`                                                                                   | Create a hidden competition draft and its catalogs atomically.                                             |
| `GET /:id`, `PATCH /:id`                                                                   | Read or replace editable configuration.                                                                    |
| `POST /:id/publish`, `/close-registration`, `/open-registration`, `/close-event`, `/clone` | Publish, manual controls, or copy configuration/catalogs into a new draft. Cloning does not copy entrants. |
| `POST /cover`                                                                              | Raw JPEG/PNG/WebP/GIF upload, maximum 4 MiB; validates the file signature.                                 |
| `POST /:id/impact-report`, `/apply-reviewed-rules`                                         | Report proposed rule changes and apply them with an external review reference/reason.                      |
| `GET /:id/applications`, `GET /:id/applications/:registrationId`                           | Application list/detail; the registration must belong to the event.                                        |
| `POST /:id/onsite`, `POST /:id/applications/:registrationId/approval`                      | Staff entry or approval/rejection, with separate actor provenance.                                         |
| `POST /:id/applications/:registrationId/retry-notification`                                | Explicit delivery retry; requires notification enablement and an actual applicant recipient.               |
| `GET /:id/export`                                                                          | Authoritative event configuration and stored application data for dashboard exports.                       |

Create/configuration/action/onsite/approval requests carry a UUID `operationId`.
Reuse it with the identical payload when retrying an uncertain request. Reusing
it with changed data is rejected. Mutations of an existing record also carry
`expectedRevision`, taken from `_rev`; a conflict requires a fresh read and
operator review. Do not automatically overwrite a newer revision.

Event/catalog/operation changes are transactional. Registrations and event
controls share an event revision fence so a stale form cannot race a close or
rule change. Missing legacy counters are initialized before incrementing.
Impact reports bind event/catalog revisions and proposed configuration; stale
reports or a lagging registration index must be refreshed. Existing entrants
are never silently reclassified. After applications exist, ordinary age cutoff,
catalog, and form-type changes are locked; exceptional changes require an
impact report and the recorded external review reference. The shared login
records a shared actor, not an authenticated individual reviewer.

## Date, identity and compatibility rules

Dates are calendar days in `Asia/Bangkok`. A closing day remains open through
that entire Thai day regardless of the server timezone. Public registration
and event closure are independent. A manual public signup close still permits
staff onsite entry until the inclusive event end day; manually closing the
event or passing its end day blocks onsite entry. An expired signup deadline
must be extended before registration can reopen. Age uses the dedicated age
cutoff, preserving the existing Royal albino adjustment and stored historical
values.

Changed public signup/upload paths verify a LINE ID token against the official
LINE endpoint. When an ID token is unavailable, they can verify a LIFF access
token's channel and expiry, then obtain the applicant subject from the official
profile endpoint. The verified subject must match the applicant. An invalid
supplied ID token never falls back to an access token; ambiguous credentials
are rejected. Staff provenance is separate from applicant identity; onsite
entrants need not have a LINE account.

The notification state `sent` means LINE accepted the API request; it does not
prove user delivery or reading. Before the first provider call, the service
persists the server-resolved recipient/message and first-attempt server time.
Retries keep that immutable request and UUID key, and stop at 24 hours rather
than risk a duplicate after LINE's retry-key window expires. A new approval
decision resets the snapshot and key; operators must check uncertain earlier
delivery before deciding to send again. A provider409 is treated as accepted
only when its response includes `x-line-accepted-request-id`. See the
[official LINE retry contract](https://developers.line.biz/en/docs/messaging-api/retrying-api-request/).

Legacy event IDs, references, nullable supplementary documents and history stay
compatible. Events without the additive `competitionState` use the documented
legacy flags/date fallbacks. New managed events require explicit valid dates
and configuration before publication. Canonical drafts are excluded from the
application's public readers/export listings; closed and ended events remain
readable. A public Sanity dataset is not confidential storage for draft content.
Vote/raffle behavior is outside this migration.

## Preview, rollout and rollback

Use the existing Sanity `dev` dataset and synthetic records for preview and
mutation proof. Set the dataset explicitly on both source and dashboard and
keep notification delivery disabled. Never point a proof script at production
or send to a real recipient without the designated operator boundary.

Feature PRs target `staging`. Source production is Vercel project
`jaothui-events`, branch `main`, default host `jaothui-events.vercel.app`.
Dashboard production is `jaothui-dashboard`, branch `main`, public host
`dboard.jaothui.com`. Preview deployment or staging merge is not production
acceptance. No Sanity schema migration or bulk historical repair is required.

1. Complete engineering/preview proof on isolated `dev`; keep LINE disabled
   until a designated test recipient and send authorization are supplied. Preserve
   the deployed-source recovery checkpoint.
2. Release source feature → `staging` → `main` first, with legacy cutover false,
   bridge writes false and LINE false. Provision the server-only Sanity writer
   and matching bridge secret (>=32 chars); verify authorized reads and matching
   Sanity project/dataset. Public LINE login/signup/status/history must still work.
3. Release dashboard feature → `staging` → `main`, configuring its source base URL
   and matching server-only key. Retain existing shared username/password/JWT
   secret. Verify login, event IDs, application history and old/new exports.
4. After release gates and explicit production authorization, enable bridge writes
   for the controlled operator journey. Enable admin LINE separately only for the
   approved test recipient; verify physical receipt, not merely `sent`.
5. Set `JAOTHUI_COMPETITION_DASHBOARD_URL=https://dboard.jaothui.com` and
   `COMPETITION_LEGACY_ADMIN_DISABLED=true` on source, redeploy, then verify old
   page redirects and direct obsolete API denial. A valid but unavailable dashboard
   remains the destination; an outage never restores old writes. Invalid/missing
   destination serves safe503 with no legacy controls.

Legacy route mapping (temporary redirect, private/no-store):

| Source page                                                           | Dashboard destination                                           |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| `/admin`, `/admin?tab=event`, `/admin?tab=registration`               | `/dashboard/competitions`                                       |
| `/admin/event-manage/:eventId`                                        | `/dashboard/competitions/:eventId/applications`                 |
| `/admin/event-manage/:eventId/register/:registrationId/:legacyUserId` | `/dashboard/competitions/:eventId/applications/:registrationId` |

Profile admin navigation goes through the controlled `/admin?tab=event` entry.
Redirects use validated server route params, never caller query destinations,
tokens or old LINE/user IDs. Dashboard authorization and event/application
association checks still run. `/admin?tab=votes`, `/admin/roll`, vote/raffle APIs
and public LINE login/signup/status/history retain existing behavior. Cutover
guards only old competition APIs: onsite, duplicate checks, event registrant
lists and Royal admin detail/approval. Public `royal.getStatus` stays available.
Guards run before caller-userId admin lookup and storage/provider work, including
direct forged-ID requests.

To stop new dashboard changes, set
`JAOTHUI_COMPETITION_ADMIN_WRITES_ENABLED=false` on the source and redeploy/reload
its environment. Keep `COMPETITION_LINE_NOTIFICATIONS_ENABLED=false` to stop new
admin delivery retries. Preserve additive schema fields, IDs and records; do
not run a destructive down-migration or automatically restore obsolete admin
write paths. Keep `COMPETITION_LEGACY_ADMIN_DISABLED=true` after cutover even
when dashboard writes are stopped; authenticated bridge reads/export remain
usable. Recover forward from the compatible checkpoint; never deploy a reader
predating `@jaothui/class:v1:` after managed catalogs exist. Public signup still
follows its authoritative event policy. Existing malformed historical labels
remain unchanged and require explicit review before copying/reusing them.

## Class builder refinement (#106, #56)

Catalog schema remains `data: string[]`. Managed rules use `@jaothui/class:v1:`
plus validated JSON containing display name, age/special kind, optional integer
month bounds, inclusive/exclusive minimum, group and manual criteria. The maximum
is inclusive. Admin DTOs preserve the stored strings for lossless editing;
public options and new registration `type` values contain human names only.
No historical entry is rewritten. Recognized legacy Thai/Arabic month phrases
remain readable; malformed/unknown encodings and ambiguous age phrases fail
closed and require operator review. Plain teeth/manual classes remain special,
and calf-age text is never inferred as the mother's age.

Public normal/Royal queries, both registration write paths, staff onsite and
impact reports use the same codec. There is no upward age entry: only the
eligible interval is offered/accepted. Age remains ceiling calendar months with
the existing Royal non-black one-day birthday adjustment. Special rules can set
optional minimum/maximum ages; other criteria remain staff checks. Specials are
never automatic normal-class assignments. The admin bridge accepts at most200
rows/catalog,2000 characters/stored row; streamed JSON cap is3MiB. New dashboard
events use national-backed catalogs while province legacy reads stay supported.
Phase4 adds application review/onsite/export UI. Phase5 supplies opt-in cutover
and integration proof; actual LINE receipt and operator acceptance are separate
pending gates. No Sanity schema or vote behavior changes are included.
