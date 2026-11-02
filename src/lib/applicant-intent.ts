/** Frozen v1 event intent; only a validated document ID can become a local route. */
export function isApplicantEventId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(value) &&
    !value.includes("..") &&
    !/^(drafts|versions)\./.test(value)
  );
}
