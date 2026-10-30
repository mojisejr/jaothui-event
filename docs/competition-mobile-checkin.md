# Mobile QR and competition arrival

Each application/class has its own QR and arrival record. Normal applications
must be successfully registered; Royal applications must be approved. Unknown
event types and pending/rejected Royal applications cannot confirm arrival.
Arrival is separate from approval. Existing onsite registration creates an
application and does not imply that the animal has reported to the venue.

Staff scan with the phone's ordinary camera, open the Dashboard link, review the
animal/event/class, and explicitly confirm. No webcam feature is required.
Opening or previewing the link never confirms arrival. Confirmation is available
only from the event start through end day, inclusive in Asia/Bangkok, regardless
of whether public signup has closed. Staff can undo a mistake with a reason;
the original and correction records remain in the audit history.

## Configuration and release order

Production preparation for issue #120: both QR variables below have already
been added to the existing `jaothui-events` Vercel project, with a sensitive
server-only production signing key. No deployment or promotion was triggered.
Do not replace that key when merging; a replacement invalidates existing QR.
Preview/development keys and destination overrides are separate and must never
reuse the production signing key for a different environment.

- `CHECKIN_QR_SECRET`: a new server-only random secret of at least 32 characters.
  Generate with `openssl rand -hex 32` and save through the deployment secret
  manager. Never use a `NEXT_PUBLIC_` name, commit it, or paste it into an issue.
- `CHECKIN_DASHBOARD_URL`: the HTTPS Dashboard origin. Production is
  `https://dboard.jaothui.com`. For an isolated preview, use that preview's
  Dashboard origin so test QR links cannot open production by accident.
- Existing Sanity server write credentials, LINE verification configuration,
  admin bridge credentials, and the admin-write switch continue to apply.

Review the implementation's configuration validation before rollout. Missing QR
configuration must leave existing signup and approval functionality operational,
and return a useful unavailable message when someone requests a QR.

1. Merge the source feature PR into `staging`, then promote source `staging` to
   `main` using the repository release process. Configure the QR variables in the
   corresponding environment before the source deployment.
2. Wait for the source deployment of that exact commit to be Ready.
3. Merge and promote the Dashboard feature. Its bridge must point to the source
   environment that supports check-in. An old source must fail clearly rather
   than fall back to approval as an arrival status.
4. Perform the phone checklist below with designated test applications.

The implementation handoff stops at unmerged PRs. No live application was
checked in by the agent. No destructive data migration or approval backfill is
required. Store only hashed QR lookup values and scalar identity links; do not
add strong references that block the existing application deletion contract.

## Owner phone checklist

Prepare two phones, the applicant's LINE login, and the existing shared staff
Dashboard login. Use a designated event whose dates include the actual test
day. Do not change an unrelated live event's dates just to bypass the window.
Prepare a Normal application and an approved Royal application; add another
class for the same animal to check separation, plus pending/rejected Royal
applications to check the restrictions. Staff-created registrations with no
applicant owner are handled through Dashboard search rather than another
person's LINE account.

1. On the applicant phone, open application history. Confirm that the card is a
   compact summary, details are available on demand, and opening QR does not
   make every card longer. The QR view must identify the animal, microchip,
   event, and class clearly.
2. On the staff phone, scan using the ordinary camera. First try while logged
   out: login must return to the same application. Camera/LINE browsers may
   have different staff sessions; log in to the browser that actually opens.
3. Before pressing confirm, verify that both phones still show no arrival.
   Confirm once. The staff page should show the recorded time, and the applicant
   should see the same result after refresh or the visible-view status update.
4. Scan again and try a repeated confirmation. The recorded time should stay the
   same. The other class must remain unconfirmed.
5. Find the same application by microchip in Dashboard and verify identical
   arrival state. Exercise the arrived/not-arrived filter and compare counts.
6. Undo with a meaningful reason. Confirm that the current arrival status resets
   on both phones after refresh and the previous confirmation plus correction
   remain in the staff history. A fresh confirmation in the event window should
   create a new auditable arrival rather than overwrite the previous record.
7. Confirm that pending/rejected Royal applications and unknown event types
   cannot bypass eligibility. Before/after the event window, confirmation must
   explain why it is unavailable. Signup closure during the event must not
   prevent an otherwise eligible application from reporting.
8. Disconnect the network temporarily. Loading/error/stale states must be clear;
   neither phone should claim a successful write that the server did not accept.
   Restore connectivity and load the current state.

No LINE message is sent by checking in. The shared staff account identifies the
actor as the shared Dashboard account, not an individual employee. Redact QR
codes/tokens and personal details from screenshots attached to public issues.

## Rollback and QR key rotation

Keep the checkpoint commit IDs from the PR. Revert the Dashboard feature first
to remove new entry points, then consider the source revert once no deployed
client needs its new contract. Use ordinary reviewed revert commits; do not
reset branches or force push. Existing arrival/audit records remain stored and
approvals are not rewritten. Undoing one mistaken arrival is an authenticated
business operation, not a reason to delete history.

Rotating `CHECKIN_QR_SECRET` invalidates old QR signatures. After deploying the
new key, applicants must reopen/request their pass to display a fresh QR. This
must not erase recorded arrivals. A deleted application must never resolve as
an eligible application from a retained lookup/audit record.
