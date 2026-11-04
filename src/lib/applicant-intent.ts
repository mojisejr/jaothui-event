export const FRONT_RETURN_PATH = "/api/auth/front/return" as const;

export type ApplicantIntent = "registration" | "history";
export function applicantIntent(value: unknown): ApplicantIntent | null {
  return value === undefined || value === "registration"
    ? "registration"
    : value === "history"
      ? "history"
      : null;
}

/** Both destinations are fixed local routes; an ID is only ever a query/path value. */
export function applicantDestination(eventId: string, intent: ApplicantIntent) {
  if (!isApplicantEventId(eventId)) throw new Error("Invalid event ID");
  return intent === "history"
    ? `/profile/my-events?${new URLSearchParams({ eventId })}`
    : `/events/${encodeURIComponent(eventId)}`;
}

/** Frozen v1 event intent; only a validated document ID can become a local route. */
export function isApplicantEventId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(value) &&
    !value.includes("..") &&
    !/^(drafts|versions)\./.test(value)
  );
}
