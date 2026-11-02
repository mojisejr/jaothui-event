import type { NextApiRequest } from "next";
import { TRPCError } from "@trpc/server";
import { verifyApplicantAuthorization } from "./line-auth.service";
import {
  applicantAuthError,
  assertCookieWrite,
  introspectSession,
  SSO_MODE_COOKIE,
  SSO_COOKIE,
} from "./front-sso.service";
export async function resolveApplicantOwner(
  req: NextApiRequest | undefined,
  auth: { idToken?: string; lineAccessToken?: string } = {},
  expectedUserId?: string,
) {
  try {
    if (req?.cookies?.[SSO_COOKIE] !== undefined) {
      if (req.method !== "GET" && req.method !== "HEAD") assertCookieWrite(req);
      const owner = (await introspectSession(req.cookies[SSO_COOKIE]!)).account
        .lineId;
      if (expectedUserId && owner !== expectedUserId)
        throw new TRPCError({ code: "UNAUTHORIZED" });
      return owner;
    }
    if (req?.cookies?.[SSO_MODE_COOKIE] !== undefined)
      throw new TRPCError({ code: "UNAUTHORIZED" });
    const authorization = { ...auth };
    if (!authorization.idToken && !authorization.lineAccessToken && req) {
      const id = req.headers["x-line-id-token"],
        access = req.headers["x-line-access-token"];
      if (typeof id === "string" && id.length <= 10000)
        authorization.idToken = id;
      else if (typeof access === "string" && access.length <= 10000)
        authorization.lineAccessToken = access;
    }
    return await verifyApplicantAuthorization(authorization, expectedUserId);
  } catch (error) {
    return applicantAuthError(error);
  }
}
