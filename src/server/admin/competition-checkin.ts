import { type SanityClient } from "next-sanity";
import { CompetitionAdminError } from "./competition-contract";
import {
  findOperation,
  operationDocument,
} from "./competition-registration-admin";
import {
  checkInEligibility,
  checkInState,
} from "~/server/services/competition-checkin-policy";

export type CheckInDocument = Record<string, any> & {
  _id: string;
  _rev: string;
  eventType?: unknown;
  approvementResult?: unknown;
};
const fail = (status: number, code: string, message: string): never => {
  throw new CompetitionAdminError(status, code, message);
};

/** The indexed event revision proves approval discovery has caught up with all fenced admin writes. */
export async function checkInContext(
  db: SanityClient,
  eventId: string,
  registrationId: string,
) {
  const event = await db.getDocument<CheckInDocument>(eventId);
  const registration = await db.getDocument<CheckInDocument>(registrationId);
  if (event?._type !== "event")
    return fail(404, "NOT_FOUND", "ไม่พบงานแข่งขัน");
  if (
    registration?._type !== "eventRegister" ||
    registration.event?._ref !== eventId
  )
    return fail(404, "APPLICATION_NOT_FOUND", "ไม่พบใบสมัครในงานนี้");
  const indexed = await db.fetch<{
    _rev: string;
    approval: { _id: string; _rev: string } | null;
  } | null>(
    '*[_type=="event" && _id==$id][0]{_rev,"approval":*[_type=="approvment" && event._ref==$id && eventRegister._ref==$registrationId] | order(coalesce(approvementDate,_updatedAt,_createdAt) desc,_id desc)[0]{_id,_rev}}',
    { id: eventId, registrationId },
  );
  if (indexed?._rev !== event._rev)
    return fail(
      409,
      "CHECKIN_INDEX_PENDING",
      "ข้อมูลการสมัครกำลังอัปเดต กรุณาโหลดใหม่",
    );
  const approval = indexed.approval
    ? await db.getDocument<CheckInDocument>(indexed.approval._id)
    : null;
  if (
    indexed.approval &&
    (!approval ||
      approval._rev !== indexed.approval._rev ||
      approval._type !== "approvment" ||
      approval.event?._ref !== eventId ||
      approval.eventRegister?._ref !== registrationId)
  )
    return fail(
      409,
      "CHECKIN_INDEX_PENDING",
      "ผลอนุมัติกำลังอัปเดต กรุณาโหลดใหม่",
    );
  return { event, registration, approval };
}

/** A replay only reads current state. It can never re-apply a confirmation after an undo. */
export async function changeCheckIn(
  db: SanityClient,
  eventId: string,
  registrationId: string,
  operationId: string,
  expectedRevision: string,
  action: "confirm" | "undo",
  reason = "",
  now = new Date(),
) {
  const payload = {
    action: `checkin-${action}`,
    eventId,
    registrationId,
    expectedRevision,
    reason,
  };
  const previous = await findOperation(db, operationId, payload);
  if (previous) return;
  const { event, registration, approval } = await checkInContext(
    db,
    eventId,
    registrationId,
  );
  const state = checkInState(registration);
  // A different request confirming an already-arrived animal is also a harmless read.
  if (action === "confirm" && state.checkInStatus === "checked_in") return;
  if (registration._rev !== expectedRevision)
    return fail(
      409,
      "REVISION_CONFLICT",
      "ใบสมัครเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด",
    );
  if (action === "confirm") {
    const eligibility = checkInEligibility(
      event,
      approval,
      now,
    ).checkInEligibility;
    if (!eligibility.eligible)
      return fail(409, "CHECKIN_NOT_ALLOWED", eligibility.reason!);
  } else {
    if (reason.trim().length < 10)
      return fail(
        422,
        "CHECKIN_REASON_REQUIRED",
        "กรุณาระบุเหตุผลยกเลิกอย่างน้อย 10 ตัวอักษร",
      );
    if (state.checkInStatus !== "checked_in")
      return fail(409, "NOT_CHECKED_IN", "ใบสมัครนี้ยังไม่ได้รายงานตัว");
  }
  const at = now.toISOString();
  const change = {
    checkInStatus: action === "confirm" ? "checked_in" : "not_checked_in",
    checkedInAt: action === "confirm" ? at : null,
    checkedInBy: action === "confirm" ? "dashboard-shared" : null,
    checkInGeneration: (Number(registration.checkInGeneration) || 0) + 1,
  };
  let tx = db
    .transaction()
    .patch(eventId, (p) =>
      p
        .ifRevisionId(event._rev)
        .setIfMissing({ competitionWriteFence: 0 })
        .inc({ competitionWriteFence: 1 }),
    )
    .patch(registrationId, (p) => p.ifRevisionId(expectedRevision).set(change));
  if (approval)
    tx = tx.patch(approval._id, (p) =>
      p
        .ifRevisionId(approval._rev)
        .setIfMissing({ checkInReadFence: 0 })
        .inc({ checkInReadFence: 1 }),
    );
  await tx
    .create({
      ...operationDocument(operationId, eventId, payload, `checkin-${action}`),
      registrationId,
      checkInAction: action,
      at,
      reason: reason.trim() || null,
      before: state,
      after: change,
    })
    .commit({ visibility: "sync" });
}
