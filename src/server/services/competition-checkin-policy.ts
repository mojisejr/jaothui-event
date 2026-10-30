import {
  registrationPolicy,
  type ApprovalPolicyEvent,
} from "./competition-approval-policy";
import {
  competitionDay,
  getBangkokDay,
  isPublicCompetition,
  type CompetitionPolicyEvent,
} from "./competition-policy";

export type CheckInEvent = ApprovalPolicyEvent & CompetitionPolicyEvent;
export type CheckInRecord = {
  [key: string]: unknown;
  checkInStatus?: unknown;
  checkedInAt?: unknown;
  checkedInBy?: unknown;
};
export type CheckInStatus = "not_checked_in" | "checked_in";

/** Arrival is a separate fact from application approval and desk registration. */
export function checkInState(record: CheckInRecord) {
  const checked =
    record.checkInStatus === "checked_in" &&
    typeof record.checkedInAt === "string" &&
    Number.isFinite(Date.parse(record.checkedInAt));
  return {
    checkInVersion: 1 as const,
    checkInStatus: checked
      ? ("checked_in" as const)
      : ("not_checked_in" as const),
    checkedInAt: checked ? (record.checkedInAt as string) : null,
    checkedInBy:
      checked && record.checkedInBy === "dashboard-shared"
        ? ("dashboard-shared" as const)
        : null,
  };
}

export function checkInEligibility(
  event: CheckInEvent | undefined,
  approval?: { [key: string]: unknown; approvementResult?: unknown } | null,
  now = new Date(),
) {
  const policy = registrationPolicy(event, approval);
  let reason: string | null = null;
  if (
    !event ||
    !isPublicCompetition(event) ||
    event.competitionState === "closed" ||
    event.isActive === false
  )
    reason = "งานนี้ยังไม่เปิดหรือปิดงานแล้ว";
  else if (policy.approvalRequirement === "unknown")
    reason = "ต้องตรวจประเภทงานก่อนรายงานตัว";
  else if (!["registered", "accepted"].includes(policy.registrationStatus))
    reason = "ใบสมัครต้องผ่านการอนุมัติก่อนรายงานตัว";
  const start = competitionDay(event?.startAt ?? event?.eventAt);
  const end = competitionDay(event?.endAt);
  if (!reason && (!start || !end || start > end))
    reason = "ยังไม่มีช่วงวันจัดงานที่ถูกต้อง";
  const today = getBangkokDay(now);
  const qrAvailable = !reason && !!end && today <= end;
  if (!reason && start && today < start) reason = "ยังไม่ถึงวันเปิดรายงานตัว";
  if (!reason && end && today > end) reason = "พ้นช่วงวันรายงานตัวแล้ว";
  return { checkInEligibility: { eligible: !reason, reason }, qrAvailable };
}
