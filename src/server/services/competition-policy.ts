import dayjs from "dayjs";

export type CompetitionState = "draft" | "published" | "closed";
export interface CompetitionPolicyEvent {
  _id?: string;
  competitionState?: CompetitionState | string;
  isActive?: boolean;
  registrationActive?: boolean;
  startAt?: string;
  eventAt?: string;
  endAt?: string;
  registrationStartAt?: string;
  registrationDeadline?: string;
  buffaloAgeDeadline?: string;
  deadline?: string;
}
export type RegistrationStatus =
  | "not-yet"
  | "open"
  | "closed-manual"
  | "closed-date"
  | "unavailable"
  | "invalid";

/** Calendar days are compared as ISO strings; host timezone must never decide eligibility. */
export function getBangkokDay(now: Date = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid current time");
  return new Date(now.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
export function competitionDay(value?: string): string | null {
  if (!value) return null;
  if (
    value.length !== 10 &&
    (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))
  )
    return null;
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === day
    ? day
    : null;
}
export function isPublicCompetition(event: CompetitionPolicyEvent): boolean {
  return (
    !event._id?.startsWith("drafts.") && event.competitionState !== "draft"
  );
}
export function getAgeCutoff(event: CompetitionPolicyEvent): string {
  const day = competitionDay(event.buffaloAgeDeadline ?? event.deadline);
  if (!day) throw new Error("ไม่พบวันตัดอายุที่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่");
  return day;
}
export function calculateCompetitionAge(
  birthday: string,
  cutoff: string,
): number {
  const birth = competitionDay(birthday);
  const end = competitionDay(cutoff);
  if (!birth || !end || birth > end)
    throw new Error("วันเกิดหรือวันตัดอายุไม่ถูกต้อง");
  // Fixed local calendar strings retain the established month-ceiling rule in every host TZ.
  const start = dayjs(`${birth}T00:00:00`);
  const finish = dayjs(`${end}T00:00:00`);
  const months = finish.diff(start, "month");
  return months + (finish.diff(start.add(months, "month"), "day") > 0 ? 1 : 0);
}
export function getCompetitionPolicy(
  event: CompetitionPolicyEvent,
  now: Date = new Date(),
) {
  const today = getBangkokDay(now);
  const managed = event.competitionState !== undefined;
  const start = competitionDay(event.startAt ?? event.eventAt);
  const end = competitionDay(event.endAt);
  const signupStart = competitionDay(event.registrationStartAt);
  // Legacy only: retain old age-cutoff fallback without reinterpreting managed events.
  const signupEnd = competitionDay(
    event.registrationDeadline ??
      (!managed ? (event.buffaloAgeDeadline ?? event.deadline) : undefined),
  );
  const warnings: string[] = [];
  if (!signupStart || !signupEnd)
    warnings.push("incomplete-registration-dates");
  if (!start || !end) warnings.push("incomplete-event-dates");
  const invalid =
    (!!event.endAt && !end) ||
    (!!event.registrationStartAt && !signupStart) ||
    (!!event.registrationDeadline && !signupEnd) ||
    (!!start && !!end && start > end) ||
    (!!signupStart && !!signupEnd && signupStart > signupEnd) ||
    (managed && (!start || !end || !signupStart || !signupEnd));
  if (invalid) warnings.push("invalid-dates");
  const publicVisible = isPublicCompetition(event);
  const closed =
    event.competitionState === "closed" || event.isActive === false;
  const ended = !!end && today > end;
  const lifecycle = !publicVisible
    ? "draft"
    : closed
      ? "closed"
      : ended
        ? "ended"
        : start && today < start
          ? "upcoming"
          : "ongoing";
  let publicRegistration: RegistrationStatus = "open";
  if (!publicVisible || closed || ended) publicRegistration = "unavailable";
  else if (invalid) publicRegistration = "invalid";
  else if (event.registrationActive === false)
    publicRegistration = "closed-manual";
  else if (signupStart && today < signupStart) publicRegistration = "not-yet";
  else if (signupEnd && today > signupEnd) publicRegistration = "closed-date";
  return {
    today,
    lifecycle,
    publicRegistration,
    publicVisible,
    onsiteAllowed: publicVisible && !closed && !ended && !invalid,
    warnings,
  };
}
export function assertCompetitionRegistration(
  event: CompetitionPolicyEvent,
  audience: "public" | "onsite",
  now: Date = new Date(),
): void {
  const policy = getCompetitionPolicy(event, now);
  if (
    audience === "onsite"
      ? !policy.onsiteAllowed
      : policy.publicRegistration !== "open"
  ) {
    throw new Error("กิจกรรมนี้ไม่เปิดรับสมัครในขณะนี้");
  }
}

/** Royal albino age keeps the established one-day birthday adjustment; normal/black do not. */
export function calculateRegistrationAge(
  event: CompetitionPolicyEvent & { eventType?: string },
  birthday: string,
  color?: string,
): number {
  const birth = competitionDay(birthday);
  if (!birth) throw new Error("วันเกิดไม่ถูกต้อง");
  const adjusted =
    event.eventType === "royal" && color !== "black"
      ? dayjs(`${birth}T00:00:00`).subtract(1, "day").format("YYYY-MM-DD")
      : birth;
  return calculateCompetitionAge(adjusted, getAgeCutoff(event));
}
