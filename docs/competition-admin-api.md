# Competition administration bridge

Related work: [#106](https://github.com/mojisejr/jaothui-event/issues/106).

The event application owns competition rules and Sanity mutations. Dashboard
operators use the existing shared dashboard login; its server calls this REST
bridge. The dashboard must not receive a Sanity writer credential in browser code.
This checkpoint covers source foundations and the event workspace. Production
admin cutover remains on hold until phases 4–5, application/onsite UI verification,
and the designated LINE operator proof are complete.

## Configuration

| Variable | Purpose and default |
| --- | --- |
| `JAOTHUI_COMPETITION_ADMIN_API_KEY` | Source server bearer secret, at least 32 characters. Missing/short configuration fails closed. Match the dashboard server setting; never expose it through `NEXT_PUBLIC_*`. |
| `JAOTHUI_COMPETITION_ADMIN_WRITES_ENABLED` | Only the exact value `true` permits bridge mutations, including cover uploads and impact report creation. Default: disabled. Reads still require the bearer secret. |
| `SANITY_API_WRITE_TOKEN` | Preferred server-only Sanity writer token. Provision the appropriate project/dataset permissions. |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` | Existing Sanity project/dataset selection. The server writer and public readers must target the intended same dataset. |
| `LINE_LOGIN_CHANNEL_ID` | Preferred LINE Login channel used to verify public applicant credentials. If absent, the channel prefix of `NEXT_PUBLIC_LIFF_ID` is used. |
| `COMPETITION_LINE_NOTIFICATIONS_ENABLED` | Only exact `true` enables the new admin notification retry path. Default: disabled. Approval persistence remains separate from delivery. |
| `oa_token` | Existing LINE Messaging API credential, needed for enabled delivery. Keep server-only. |

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

| Method/path | Operation |
| --- | --- |
| `GET /` | Search, composed lifecycle/registration/type/date filters, paging and counts. |
| `POST /` | Create a hidden competition draft and its catalogs atomically. |
| `GET /:id`, `PATCH /:id` | Read or replace editable configuration. |
| `POST /:id/publish`, `/close-registration`, `/open-registration`, `/close-event`, `/clone` | Publish, manual controls, or copy configuration/catalogs into a new draft. Cloning does not copy entrants. |
| `POST /cover` | Raw JPEG/PNG/WebP/GIF upload, maximum 4 MiB; validates the file signature. |
| `POST /:id/impact-report`, `/apply-reviewed-rules` | Report proposed rule changes and apply them with an external review reference/reason. |
| `GET /:id/applications`, `GET /:id/applications/:registrationId` | Application list/detail; the registration must belong to the event. |
| `POST /:id/onsite`, `POST /:id/applications/:registrationId/approval` | Staff entry or approval/rejection, with separate actor provenance. |
| `POST /:id/applications/:registrationId/retry-notification` | Explicit delivery retry; requires notification enablement and an actual applicant recipient. |
| `GET /:id/export` | Authoritative event configuration and stored application data for dashboard exports. |

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

1. Deploy source policy/read compatibility and the authenticated bridge first,
   with bridge writes and new admin notifications disabled.
2. Provision the server-only writer and bridge settings; verify authorized
   reads, credential boundaries and the intended dataset.
3. Deploy the dashboard workspace and finish phases 4–5, regression, legacy
   cutover and operator verification, including real LINE credentials/delivery.
4. Enable production writes only after those release gates are satisfied.
   Enable new admin LINE delivery separately after its operator proof.

To stop new dashboard changes, set
`JAOTHUI_COMPETITION_ADMIN_WRITES_ENABLED=false` on the source and redeploy/reload
its environment. Keep `COMPETITION_LINE_NOTIFICATIONS_ENABLED=false` to stop new
admin delivery retries. Preserve additive schema fields, IDs and records; do
not run a destructive down-migration or automatically restore obsolete admin
write paths. These switches control the new admin bridge; public signup still
follows its authoritative event policy.
