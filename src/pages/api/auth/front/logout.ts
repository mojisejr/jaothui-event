import type { NextApiRequest, NextApiResponse } from "next";
import {
  assertCookieWrite,
  cookie,
  frontRequest,
  FrontSsoError,
  SSO_MODE_COOKIE,
  privateResponse,
  SSO_COOKIE,
  ssoConfig,
  TRANSACTION_COOKIE,
} from "~/server/services/front-sso.service";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  privateResponse(res);
  if (req.method !== "POST") return res.status(405).end();
  try {
    assertCookieWrite(req);
    const config = ssoConfig()!;
    if (req.cookies[SSO_COOKIE])
      await frontRequest("revoke", { sessionToken: req.cookies[SSO_COOKIE] });
    res.setHeader("Set-Cookie", [
      cookie(SSO_COOKIE, "", 0, config.secure),
      cookie(TRANSACTION_COOKIE, "", 0, config.secure),
      cookie(SSO_MODE_COOKIE, "front", 86400 * 365, config.secure),
    ]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res
      .status(error instanceof FrontSsoError ? error.status : 503)
      .json({ error: "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่" });
  }
}
