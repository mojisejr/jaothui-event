import type { NextApiRequest, NextApiResponse } from "next";
import {
  FrontSsoError,
  introspectSession,
  SSO_MODE_COOKIE,
  privateResponse,
  SSO_COOKIE,
  ssoConfig,
} from "~/server/services/front-sso.service";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  privateResponse(res);
  if (req.method !== "GET") return res.status(405).end();
  try {
    if (
      req.cookies[SSO_MODE_COOKIE] !== undefined &&
      req.cookies[SSO_COOKIE] === undefined
    )
      return res.status(401).json({ mode: "blocked" });
    if (req.cookies[SSO_COOKIE] === undefined)
      return res.status(200).json({ mode: "liff", enabled: !!ssoConfig() });
    const session = await introspectSession(req.cookies[SSO_COOKIE]!);
    return res.status(200).json({
      mode: "sso",
      profile: {
        userId: session.account.lineId,
        displayName: session.account.displayName ?? undefined,
        pictureUrl: session.account.avatarUrl ?? undefined,
        email: session.account.email ?? undefined,
      },
    });
  } catch (error) {
    return res
      .status(error instanceof FrontSsoError ? error.status : 503)
      .json({ mode: "blocked", error: "ไม่สามารถยืนยันตัวตนได้ กรุณาลองใหม่" });
  }
}
