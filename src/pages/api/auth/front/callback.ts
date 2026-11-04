import type { NextApiRequest, NextApiResponse } from "next";
import { applicantDestination } from "~/lib/applicant-intent";
import {
  cookie,
  exchangeSession,
  FrontSsoError,
  SSO_MODE_COOKIE,
  privateResponse,
  readTransaction,
  SSO_COOKIE,
  ssoConfig,
  TRANSACTION_COOKIE,
} from "~/server/services/front-sso.service";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  privateResponse(res);
  if (req.method !== "GET") return res.status(405).end();
  try {
    const config = ssoConfig();
    if (!config) return res.status(404).end();
    const transaction = readTransaction(
      req.cookies[TRANSACTION_COOKIE],
      req.query.state,
    );
    if (typeof req.query.code !== "string") throw new FrontSsoError(400);
    const session = await exchangeSession(req.query.code, transaction.verifier);
    if (session.eventId !== transaction.eventId) throw new FrontSsoError(400);
    res.setHeader("Set-Cookie", [
      cookie(
        SSO_COOKIE,
        session.sessionToken,
        (Date.parse(session.expiresAt) - Date.now()) / 1000,
        config.secure,
      ),
      cookie(TRANSACTION_COOKIE, "", 0, config.secure),
      cookie(SSO_MODE_COOKIE, "front", 86400 * 365, config.secure),
    ]);
    return res.redirect(
      303,
      applicantDestination(transaction.eventId, transaction.intent),
    );
  } catch (error) {
    return res
      .status(error instanceof FrontSsoError ? error.status : 503)
      .json({ error: "เข้าสู่ระบบไม่สำเร็จ กรุณาเริ่มใหม่" });
  }
}
