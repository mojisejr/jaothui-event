# Front applicant SSO — #129

Feature flag defaults OFF. This Event consumer has no new Prisma schema, migrations or durable identity store. Front owns browser families, one-use PKCE grants, child token hashes and revocation. Keep the existing LIFF channel and callback configuration.

## Configuration and activation

Configure the same exact `JAOTHUI_FRONT_ORIGIN` and `JAOTHUI_EVENT_ORIGIN` on both apps (HTTPS in production; local HTTP only on loopback outside production). Configure a dedicated shared `JAOTHUI_EVENT_SSO_CLIENT_SECRET` of at least 32 unpredictable characters, and a per-app `JAOTHUI_EVENT_SSO_STATE_SECRET` signing key (independently generated for Front and Event; the same variable name does not mean the same value) of at least 32 unpredictable characters. Do not reuse admin, bridge, QR, LINE or wallet credentials. No secret is browser exposed.

Front's additive migration must be applied under the separately authorized production change before activation. Deploy both apps with `JAOTHUI_EVENT_SSO_ENABLED=false`; verify configuration/readiness, then enable on both. This PR does not authorize production migrations, secret changes or deployment. Disable the flag to stop new handoffs; retained SSO cookies fail closed rather than changing to another LINE identity. Explicitly starting a new event login can replace an invalid cookie. Keep the Front revocation records and existing registrations.

## Version 1 handoff

1. `/api/auth/front/start?eventId=<id>` accepts only validated event IDs. It creates a host-only HttpOnly SameSite=Lax two-minute signed transaction cookie containing random state, PKCE verifier and event ID; sends PKCE S256 to Front's `/api/auth/event-sso/authorize`.
2. Front redirects only to the fixed `JAOTHUI_EVENT_ORIGIN/api/auth/front/callback`. Event verifies signed transaction, state and expiry before exchanging `{code,codeVerifier,redirectUri}` with the dedicated server Bearer credential. Grant consumption/replay protection belongs to Front's durable transaction.
3. Event accepts only a matching event ID and unexpired response, sets a host-only HttpOnly SameSite=Lax opaque session cookie (Secure on HTTPS), expires the transaction and sets a separate host-only HttpOnly auth-mode marker for 365 days, then cleans the URL with a 303 to `/events/<id>`.
4. `/api/auth/front/session` bootstraps a small trusted applicant profile before LIFF initializes. It returns `mode:liff` only when no SSO cookie or auth-mode marker exists. Invalid, empty, revoked or unavailable SSO never starts the LIFF SDK. Existing direct LIFF event entry continues when the flag is OFF without contacting Front.

Every private use introspects Front freshly. The account's verified `lineId` is the owner for member enrollment, member statistics, Normal/Royal signup, images, history, status, passes and legacy owned reads; browser `userId` can only be checked against that owner. SSO provides no admin role. Legacy admin/royal procedures explicitly reject SSO cookies, including forged client admin IDs. Public catalog/status policy remains unchanged.

POST cookie-authenticated operations require the exact Event Origin, same-origin Fetch Metadata when present and `X-Jaothui-CSRF: 1`. Browser credentials use POST bodies or bounded LINE headers on private tRPC batches; no LINE ID/access token is put into URL inputs. Responses are no-store; callback/handoff referrers are suppressed. Image signatures and the streamed 4MB bound remain enforced.

`POST /api/auth/front/logout` revokes through Front before clearing cookies; failures retain the current session. The host-only auth-mode marker outlives the session (365 days), including natural expiry, and prevents an old LIFF identity from silently reappearing. Logout retains this marker. A new event selection/login is explicit. Root Front logout/account switch invalidates the browser family, so Event's next private read/write fails; temporary Front outages return HTTP 503 (tRPC internal error), retain cookie/form/operation state and never masquerade as 401.

## Verification limits

Deterministic Vitest, mounted React contracts, typecheck, lint and build are the gates. Tests use synthetic identities and mocked backchannels; no production applicant data is written. Actual same-browser cookie/provider login, first LINE attachment, account switch and linked logout remain owner acceptance after rollout configuration. No browser automation/provider console change is included.

## Same-tab return to the Front website

For SSO or retained Front-mode sessions, bootstrap exposes only the relative `/api/auth/front/return` endpoint. The persistent “กลับเว็บไซต์เจ้าทุย” link opens in the same tab and never logs out. The GET endpoint ignores caller destinations and redirects to the exact configured `JAOTHUI_FRONT_ORIGIN` plus `/v2`; it needs no client/state secret and remains available while the SSO flag is OFF. Direct LIFF entry has no extra return link.
