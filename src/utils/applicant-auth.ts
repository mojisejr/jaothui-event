import type { Liff } from "@line/liff";
let mode: "liff" | "sso" | "blocked" = "blocked";
let sdk: Liff | undefined;
export function setApplicantTransport(next: typeof mode, liff?: Liff) {
  mode = next;
  sdk = liff;
}
export function isSsoApplicant() {
  return mode === "sso";
}
export function applicantHeaders(
  includeCredentials = true,
): Record<string, string> {
  const headers: Record<string, string> = { "X-Jaothui-CSRF": "1" };
  if (includeCredentials && mode === "liff" && sdk) {
    const id = sdk.getIDToken();
    const access = !id ? sdk.getAccessToken() : null;
    if (id && id.length <= 10000) headers["X-Line-Id-Token"] = id;
    else if (access && access.length <= 10000)
      headers["X-Line-Access-Token"] = access;
  }
  return headers;
}
