import { createHash, timingSafeEqual } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { documentId } from "~/server/admin/competition-contract";
import { CompetitionAdminError } from "~/server/admin/competition-contract";
import { CompetitionApplicantCheckInService } from "./competition-applicant-checkin";
import { isApplicantEventId } from "~/lib/applicant-intent";

const owner = z.string().min(1).max(300);
const input = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("history"),
      owner,
      limit: z.number().int().min(1).max(20).default(20),
      period: z.enum(["active", "past", "all"]).default("all"),
      q: z.string().max(2000).default(""),
      eventId: z.string().refine(isApplicantEventId).optional(),
      cursor: z.string().max(500).optional(),
    })
    .strict(),
  z
    .object({ action: z.literal("status"), owner, registrationId: documentId })
    .strict(),
  z
    .object({ action: z.literal("pass"), owner, registrationId: documentId })
    .strict(),
]);

export function assertApplicantBridge(
  authorization: string | undefined,
  key = process.env.JAOTHUI_COMPETITION_APPLICANT_BRIDGE_KEY,
) {
  if (!key || key.length < 32)
    throw new CompetitionAdminError(
      503,
      "BRIDGE_NOT_CONFIGURED",
      "ระบบใบสมัครยังไม่พร้อมใช้งาน",
    );
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  const digest = (s: string) => createHash("sha256").update(s).digest();
  if (!supplied || !timingSafeEqual(digest(supplied), digest(key)))
    throw new CompetitionAdminError(
      401,
      "UNAUTHORIZED",
      "ไม่มีสิทธิ์ใช้บริการ",
    );
}

export function applicantBridgeHandler(
  service = new CompetitionApplicantCheckInService(),
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({
          ok: false,
          error: {
            code: "METHOD_NOT_ALLOWED",
            message: "Method not allowed",
          },
        });
      }
      assertApplicantBridge(req.headers.authorization);
      const chunks: Buffer[] = [];
      let length = 0;
      for await (const chunk of req) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        length += bytes.length;
        if (length > 16384)
          throw new CompetitionAdminError(
            413,
            "PAYLOAD_TOO_LARGE",
            "คำขอมีขนาดเกินกำหนด",
          );
        chunks.push(bytes);
      }
      let raw: unknown;
      try {
        raw = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        throw new CompetitionAdminError(
          422,
          "INVALID_FIELDS",
          "ข้อมูลคำขอไม่ถูกต้อง",
        );
      }
      const parsed = input.safeParse(raw);
      if (!parsed.success)
        throw new CompetitionAdminError(
          422,
          "INVALID_FIELDS",
          "ข้อมูลคำขอไม่ถูกต้อง",
        );
      const body = parsed.data;
      const data =
        body.action === "history"
          ? await service.historyPageForOwner(body.owner, body)
          : body.action === "status"
            ? await service.statusForOwner(body.owner, body.registrationId)
            : await service.passForOwner(body.owner, body.registrationId);
      return res.status(200).json({ ok: true, version: 1, data });
    } catch (cause) {
      if (cause instanceof CompetitionAdminError)
        return res.status(cause.status).json({
          ok: false,
          error: { code: cause.code, message: cause.message },
        });
      if (cause instanceof TRPCError) {
        const status =
          cause.code === "NOT_FOUND"
            ? 404
            : cause.code === "FORBIDDEN"
              ? 403
              : cause.code === "CONFLICT"
                ? 409
                : cause.code === "BAD_REQUEST"
                  ? 422
                  : 503;
        return res.status(status).json({
          ok: false,
          error: {
            code: cause.code,
            message:
              status === 503 ? "ระบบใบสมัครยังไม่พร้อมใช้งาน" : cause.message,
          },
        });
      }
      return res.status(503).json({
        ok: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "ระบบใบสมัครยังไม่พร้อมใช้งาน กรุณาลองใหม่",
        },
      });
    }
  };
}
