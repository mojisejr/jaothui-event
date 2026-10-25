import type { NextApiRequest, NextApiResponse } from "next";
import { client } from "~/server/sanity/client";
import { verifyApplicantAuthorization } from "~/server/services/line-auth.service";
import {
  assertCompetitionRegistration,
  type CompetitionPolicyEvent,
} from "~/server/services/competition-policy";
export const config = { api: { bodyParser: false } };
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
    const userId = await verifyApplicantAuthorization(
      req.headers["x-line-token-type"] === "access"
        ? { lineAccessToken: token }
        : { idToken: token },
    );
    const eventId =
      typeof req.query.eventId === "string" ? req.query.eventId : "";
    const event = await client.fetch<CompetitionPolicyEvent | null>(
      '*[_type == "event" && _id == $eventId][0]',
      { eventId },
    );
    if (!event) return res.status(404).json({ error: "ไม่พบงานแข่งขัน" });
    assertCompetitionRegistration(event, "public");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_IMAGE_BYTES)
        return res.status(413).json({ error: "รูปต้องไม่เกิน 4MB" });
      chunks.push(buffer);
    }
    const body = Buffer.concat(chunks);
    const jpeg = body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
    const png = body
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      body.subarray(0, 4).toString() === "RIFF" &&
      body.subarray(8, 12).toString() === "WEBP";
    if (!jpeg && !png && !webp)
      return res
        .status(400)
        .json({ error: "รองรับเฉพาะรูป JPEG, PNG และ WebP" });
    const image = await client.assets.upload("image", body, {
      filename: `competition.${jpeg ? "jpg" : png ? "png" : "webp"}`,
      source: {
        id: `competition:${eventId}:${userId}`,
        name: "competition-applicant",
      },
    });
    return res.status(201).json({ _id: image._id });
  } catch (error) {
    const unauthorized =
      error instanceof Error &&
      "code" in error &&
      error.code === "UNAUTHORIZED";
    return res.status(unauthorized ? 401 : 400).json({
      error: unauthorized
        ? "กรุณาเข้าสู่ระบบ LINE ใหม่"
        : "ไม่สามารถอัพโหลดรูปได้ กรุณาตรวจสถานะรับสมัคร",
    });
  }
}
