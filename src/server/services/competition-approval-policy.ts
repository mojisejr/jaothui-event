/** Registration success and an approval decision are separate concepts. */
export const registrationStatuses = [
  "registered",
  "pending",
  "accepted",
  "rejected",
  "needs_type_review",
] as const;
export type RegistrationStatus = (typeof registrationStatuses)[number];
export type ApprovalRequirement = "required" | "not_required" | "unknown";
export interface ApprovalPolicyEvent {
  eventType?: unknown;
}

export function registrationPolicy(
  event: ApprovalPolicyEvent | undefined,
  approval?: { approvementResult?: unknown } | null,
) {
  const approvalRequirement: ApprovalRequirement =
    event?.eventType === "normal"
      ? "not_required"
      : event?.eventType === "royal"
        ? "required"
        : "unknown";
  const registrationStatus: RegistrationStatus =
    approvalRequirement === "not_required"
      ? "registered"
      : approvalRequirement === "unknown"
        ? "needs_type_review"
        : approval?.approvementResult === true
          ? "accepted"
          : approval?.approvementResult === false
            ? "rejected"
            : "pending";
  return {
    registrationPolicyVersion: 1 as const,
    approvalRequirement,
    registrationStatus,
  };
}
