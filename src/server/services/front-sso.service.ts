import { isApplicantEventId } from "~/lib/applicant-intent";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

export const SSO_COOKIE = "jaothui_event_sso";
export const TRANSACTION_COOKIE = "jaothui_event_sso_transaction";
export const SSO_MODE_COOKIE = "jaothui_event_auth_mode";
export function hasFrontApplicantIdentity(req: NextApiRequest | undefined) {
  return (
    req?.cookies?.[SSO_COOKIE] !== undefined ||
    req?.cookies?.[SSO_MODE_COOKIE] !== undefined
  );
}
const token = z.string().regex(/^[A-Za-z0-9_-]{32,256}$/);
const accountSchema = z.object({
  accountId: z.string().min(1),
  lineId: z.string().min(1),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  email: z.string().nullable(),
});
const sessionSchema = z.object({
  expiresAt: z.string().datetime(),
  account: accountSchema,
});
export type FrontSession = z.infer<typeof sessionSchema>;
export class FrontSsoError extends Error {
  constructor(
    public status: number,
    message = "ไม่สามารถยืนยันตัวตนได้ กรุณาลองใหม่",
  ) {
    super(message);
  }
}
function exactOrigin(value: string | undefined) {
  if (!value) throw new FrontSsoError(503);
  const url = new URL(value);
  if (
    url.origin !== value ||
    url.username ||
    url.password ||
    !(
      url.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
  )
    throw new FrontSsoError(503);
  return url.origin;
}
/** Public navigation uses only the configured exact origin, including during flag-off rollback. */
export function frontReturnDestination() {
  return `${exactOrigin(process.env.JAOTHUI_FRONT_ORIGIN)}/v2`;
}
export function ssoConfig() {
  if (process.env.JAOTHUI_EVENT_SSO_ENABLED !== "true") return null;
  try {
    const frontOrigin = exactOrigin(process.env.JAOTHUI_FRONT_ORIGIN);
    const eventOrigin = exactOrigin(process.env.JAOTHUI_EVENT_ORIGIN);
    const clientSecret = process.env.JAOTHUI_EVENT_SSO_CLIENT_SECRET;
    const stateSecret = process.env.JAOTHUI_EVENT_SSO_STATE_SECRET;
    if (
      !clientSecret ||
      clientSecret.length < 32 ||
      !stateSecret ||
      stateSecret.length < 32
    )
      throw new Error();
    return {
      frontOrigin,
      eventOrigin,
      clientSecret,
      stateSecret,
      callback: `${eventOrigin}/api/auth/front/callback`,
      secure: eventOrigin.startsWith("https:"),
    };
  } catch {
    throw new FrontSsoError(503, "ระบบเข้าสู่ระบบยังไม่พร้อม กรุณาลองใหม่");
  }
}
export function privateResponse(res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
}
export function cookie(
  name: string,
  value: string,
  maxAge: number,
  secure: boolean,
) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0, Math.floor(maxAge))}${secure ? "; Secure" : ""}`;
}
export function assertCookieWrite(req: NextApiRequest) {
  const config = ssoConfig();
  if (
    !config ||
    req.headers.origin !== config.eventOrigin ||
    req.headers["x-jaothui-csrf"] !== "1" ||
    (req.headers["sec-fetch-site"] &&
      req.headers["sec-fetch-site"] !== "same-origin")
  )
    throw new FrontSsoError(403, "คำขอไม่ถูกต้อง");
}
export async function frontRequest(
  path: "exchange" | "introspect" | "revoke",
  body: unknown,
) {
  const config = ssoConfig();
  if (!config) throw new FrontSsoError(401);
  let response: Response;
  try {
    response = await fetch(`${config.frontOrigin}/api/auth/event-sso/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.clientSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new FrontSsoError(503, "ระบบยืนยันตัวตนไม่พร้อม กรุณาลองใหม่");
  }
  if (!response.ok)
    throw new FrontSsoError(
      [401, 403, 409].includes(response.status) ? response.status : 503,
    );
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new FrontSsoError(503);
  }
}
export async function introspectSession(
  sessionToken: string,
): Promise<FrontSession> {
  if (!token.safeParse(sessionToken).success) throw new FrontSsoError(401);
  const result = z
    .object({ ok: z.literal(true), data: sessionSchema })
    .safeParse(await frontRequest("introspect", { sessionToken }));
  if (!result.success) throw new FrontSsoError(503);
  if (Date.parse(result.data.data.expiresAt) <= Date.now())
    throw new FrontSsoError(401);
  return result.data.data;
}
const transactionSchema = z.object({
  state: token,
  verifier: token,
  eventId: z.string().refine(isApplicantEventId),
  expiresAt: z.number().int(),
});
export function createTransaction(eventId: string) {
  const config = ssoConfig();
  if (!config) throw new FrontSsoError(404);
  const transaction = transactionSchema.parse({
    eventId,
    state: randomBytes(32).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    expiresAt: Date.now() + 120000,
  });
  const data = Buffer.from(JSON.stringify(transaction)).toString("base64url");
  const signed = `${data}.${createHmac("sha256", config.stateSecret).update(data).digest("base64url")}`;
  const url = new URL("/api/auth/event-sso/authorize", config.frontOrigin);
  url.search = new URLSearchParams({
    eventId,
    state: transaction.state,
    code_challenge: createHash("sha256")
      .update(transaction.verifier)
      .digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  return { signed, url: url.toString(), config };
}
export function readTransaction(value: string | undefined, state: unknown) {
  const config = ssoConfig();
  if (!config || !value || value.length > 2000) throw new FrontSsoError(400);
  try {
    const [data, signature, extra] = value.split(".");
    if (!data || !signature || extra) throw new Error();
    const expected = createHmac("sha256", config.stateSecret)
      .update(data)
      .digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new Error();
    const transaction = transactionSchema.parse(
      JSON.parse(Buffer.from(data, "base64url").toString()),
    );
    if (
      transaction.state !== state ||
      transaction.expiresAt <= Date.now() ||
      transaction.expiresAt > Date.now() + 120000
    )
      throw new Error();
    return transaction;
  } catch {
    throw new FrontSsoError(400, "คำขอเข้าสู่ระบบหมดอายุ กรุณาเริ่มใหม่");
  }
}
export async function exchangeSession(code: string, codeVerifier: string) {
  const config = ssoConfig();
  if (!config || !token.safeParse(code).success) throw new FrontSsoError(400);
  const result = z
    .object({
      ok: z.literal(true),
      data: sessionSchema.extend({ sessionToken: token, eventId: z.string() }),
    })
    .safeParse(
      await frontRequest("exchange", {
        code,
        codeVerifier,
        redirectUri: config.callback,
      }),
    );
  if (!result.success) throw new FrontSsoError(503);
  if (Date.parse(result.data.data.expiresAt) <= Date.now())
    throw new FrontSsoError(401);
  return result.data.data;
}
export function applicantAuthError(error: unknown): never {
  if (!(error instanceof FrontSsoError)) throw error;
  throw new TRPCError({
    code:
      error.status === 401
        ? "UNAUTHORIZED"
        : error.status === 403
          ? "FORBIDDEN"
          : error.status === 409
            ? "CONFLICT"
            : "INTERNAL_SERVER_ERROR",
    message: error.message,
    cause: error,
  });
}
