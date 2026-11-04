import {
  isApplicantEventId,
  applicantIntent,
  applicantDestination,
} from "~/lib/applicant-intent";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  cookie,
  createTransaction,
  FrontSsoError,
  privateResponse,
  TRANSACTION_COOKIE,
} from "~/server/services/front-sso.service";
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  privateResponse(res);
  if (req.method !== "GET") return res.status(405).end();
  try {
    const intent = applicantIntent(req.query.intent);
    if (
      !isApplicantEventId(req.query.eventId) ||
      !intent ||
      Object.keys(req.query).some((key) => !["eventId", "intent"].includes(key))
    )
      return res.status(400).json({ error: "งานไม่ถูกต้อง" });
    if (
      intent === "history" &&
      process.env.JAOTHUI_EVENT_SSO_ENABLED !== "true"
    )
      return res.redirect(302, applicantDestination(req.query.eventId, intent));
    const transaction = createTransaction(req.query.eventId, intent);
    res.setHeader(
      "Set-Cookie",
      cookie(
        TRANSACTION_COOKIE,
        transaction.signed,
        120,
        transaction.config.secure,
      ),
    );
    return res.redirect(302, transaction.url);
  } catch (error) {
    return res
      .status(error instanceof FrontSsoError ? error.status : 503)
      .json({ error: "ระบบเข้าสู่ระบบยังไม่พร้อม" });
  }
}
