import { TRPCError } from "@trpc/server";
type ApplicantAuthorization = { idToken?: string; lineAccessToken?: string };
const unauthorized = () =>
  new TRPCError({
    code: "UNAUTHORIZED",
    message: "กรุณาเข้าสู่ระบบ LINE ใหม่เพื่อยืนยันตัวตน",
  });
async function lineRequest(url: string, init: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw unauthorized();
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw unauthorized();
  }
}
/** ID tokens are preferred; an invalid supplied ID token never falls back to another credential. */
export async function verifyApplicantAuthorization(
  auth: ApplicantAuthorization,
  expectedUserId?: string,
): Promise<string> {
  const channelId =
    process.env.LINE_LOGIN_CHANNEL_ID ??
    process.env.NEXT_PUBLIC_LIFF_ID?.split("-")[0];
  if (!channelId || !!auth.idToken === !!auth.lineAccessToken)
    throw unauthorized();
  let subject: unknown;
  if (auth.idToken) {
    const verified = await lineRequest(
      "https://api.line.me/oauth2/v2.1/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          id_token: auth.idToken,
          client_id: channelId,
        }),
      },
    );
    if (
      verified.aud !== channelId ||
      typeof verified.exp !== "number" ||
      !Number.isFinite(verified.exp) ||
      verified.exp * 1000 <= Date.now()
    )
      throw unauthorized();
    subject = verified.sub;
  } else {
    const verified = await lineRequest(
      `https://api.line.me/oauth2/v2.1/verify?${new URLSearchParams({ access_token: auth.lineAccessToken! })}`,
    );
    if (
      verified.client_id !== channelId ||
      typeof verified.expires_in !== "number" ||
      !Number.isFinite(verified.expires_in) ||
      verified.expires_in <= 0
    )
      throw unauthorized();
    const profile = await lineRequest("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${auth.lineAccessToken!}` },
    });
    subject = profile.userId;
  }
  if (
    typeof subject !== "string" ||
    !subject ||
    (expectedUserId && subject !== expectedUserId)
  )
    throw unauthorized();
  return subject;
}
export async function verifyApplicantIdToken(
  idToken: string,
  expectedUserId?: string,
) {
  return verifyApplicantAuthorization({ idToken }, expectedUserId);
}
