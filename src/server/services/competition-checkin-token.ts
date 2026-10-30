import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { type SanityClient } from "next-sanity";
import { CompetitionAdminError } from "~/server/admin/competition-contract";
import {
  checkInContext,
  type CheckInDocument,
} from "~/server/admin/competition-checkin";

const invalid = (): never => {
  throw new CompetitionAdminError(
    404,
    "CHECKIN_TOKEN_INVALID",
    "ไม่พบ QR นี้หรือใบสมัครถูกเปลี่ยน กรุณาเปิด QR ใหม่",
  );
};
function secret() {
  const key = process.env.CHECKIN_QR_SECRET;
  if (!key || key.length < 32)
    throw new CompetitionAdminError(
      503,
      "CHECKIN_QR_UNAVAILABLE",
      "ยังไม่พร้อมแสดง QR รายงานตัว กรุณาติดต่อเจ้าหน้าที่",
    );
  return key;
}
const generation = (registration: CheckInDocument) =>
  Number.isSafeInteger(registration.checkInQrGeneration)
    ? (registration.checkInQrGeneration as number)
    : 0;
function tokenFor(eventId: string, registration: CheckInDocument) {
  const payload = JSON.stringify([
    "competition-checkin",
    1,
    eventId,
    registration._id,
    registration._createdAt ?? "",
    generation(registration),
  ]);
  return `v1.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
const registryId = (token: string) =>
  `competition-checkin-token-${createHash("sha256").update(token).digest("hex")}`;
function dashboardURL(token: string) {
  const base = new URL(
    process.env.CHECKIN_DASHBOARD_URL ?? "https://dboard.jaothui.com",
  );
  if (
    base.protocol !== "https:" &&
    !(process.env.NODE_ENV !== "production" && base.hostname === "localhost")
  )
    throw new CompetitionAdminError(
      503,
      "CHECKIN_QR_UNAVAILABLE",
      "ยังไม่ได้ตั้งค่าหน้ารายงานตัว",
    );
  return new URL(
    `/dashboard/competitions/check-in/${encodeURIComponent(token)}`,
    base.origin,
  ).href;
}

/** Only the digest is persisted. A public Sanity dataset cannot disclose a usable QR. */
export async function issueCheckInToken(
  db: SanityClient,
  eventId: string,
  registration: CheckInDocument,
) {
  const token = tokenFor(eventId, registration);
  const qrUrl = dashboardURL(token);
  const id = registryId(token);
  const existing = await db.getDocument<CheckInDocument>(id);
  if (!existing) {
    try {
      await db
        .transaction()
        .patch(registration._id, (p) =>
          p
            .ifRevisionId(registration._rev)
            .setIfMissing({ checkInQrGeneration: generation(registration) }),
        )
        .create({
          _id: id,
          _type: "competitionCheckInToken",
          eventId,
          registrationId: registration._id,
          registrationCreatedAt: registration._createdAt ?? "",
          generation: generation(registration),
          version: 1,
        })
        .commit({ visibility: "sync" });
    } catch (cause) {
      // A second legitimate issuance may win the same deterministic registry creation.
      const replay = await db.getDocument<CheckInDocument>(id);
      if (
        !replay ||
        replay.eventId !== eventId ||
        replay.registrationId !== registration._id
      )
        throw cause;
    }
  } else if (
    existing.eventId !== eventId ||
    existing.registrationId !== registration._id
  )
    invalid();
  return qrUrl;
}

/** Staff-authenticated read only; lookup never creates arrival or approval state. */
export async function resolveCheckInToken(db: SanityClient, token: string) {
  if (!/^v1\.[A-Za-z0-9_-]{43}$/.test(token)) return invalid();
  const registry = await db.getDocument<CheckInDocument>(registryId(token));
  if (
    registry?._type !== "competitionCheckInToken" ||
    registry.version !== 1 ||
    typeof registry.eventId !== "string" ||
    typeof registry.registrationId !== "string"
  )
    return invalid();
  const { event, registration } = await checkInContext(
    db,
    registry.eventId,
    registry.registrationId,
  );
  if (
    registry.registrationCreatedAt !== (registration._createdAt ?? "") ||
    registry.generation !== generation(registration)
  )
    return invalid();
  const expected = tokenFor(event._id, registration);
  if (
    token.length !== expected.length ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  )
    return invalid();
  return {
    checkInVersion: 1 as const,
    eventId: event._id,
    registrationId: registration._id,
  };
}
