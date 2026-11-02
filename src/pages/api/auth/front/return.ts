import type { NextApiRequest, NextApiResponse } from "next";
import {
  frontReturnDestination,
  privateResponse,
} from "~/server/services/front-sso.service";
/** Fixed navigation only: no user-supplied destination, session mutation or logout. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  privateResponse(res);
  if (req.method !== "GET") return res.status(405).end();
  try {
    return res.redirect(303, frontReturnDestination());
  } catch {
    return res
      .status(503)
      .json({ error: "เว็บไซต์เจ้าทุยยังไม่พร้อม กรุณาลองใหม่" });
  }
}
