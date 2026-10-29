import { type NextApiRequest, type NextApiResponse } from "next";
import { z } from "zod";
import { CompetitionAdminService } from "~/server/admin/competition-service";
import { assertCompetitionBridgeAuth } from "~/server/admin/competition-auth";
import {
  CompetitionAdminError,
  createSchema,
  documentId,
  mutationSchema,
  updateSchema,
} from "~/server/admin/competition-contract";
import { client } from "~/server/sanity/client";
export const config = { api: { bodyParser: false } };
const MAX_IMAGE = 4 * 1024 * 1024;
// Two legacy-backed catalogs, each <=200 rows of <=2000 UTF-16 characters.
const MAX_JSON = 3 * 1024 * 1024;
async function read(req: NextApiRequest, max: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > max)
      throw new CompetitionAdminError(
        413,
        "PAYLOAD_TOO_LARGE",
        "ไฟล์หรือข้อมูลมีขนาดเกินกำหนด",
      );
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store");
  try {
    assertCompetitionBridgeAuth(req.headers.authorization);
    const path = Array.isArray(req.query.path) ? req.query.path : [];
    const method = req.method ?? "GET";
    const write = method !== "GET";
    if (
      write &&
      process.env.JAOTHUI_COMPETITION_ADMIN_WRITES_ENABLED !== "true"
    )
      throw new CompetitionAdminError(
        503,
        "WRITES_DISABLED",
        "ยังไม่เปิดการแก้ไขข้อมูลการแข่งขัน",
      );
    if (path[0] === "cover" && path.length === 1 && method === "POST") {
      const mime = req.headers["content-type"]?.split(";")[0] ?? "";
      if (
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime)
      )
        throw new CompetitionAdminError(
          415,
          "INVALID_IMAGE",
          "รองรับ JPEG, PNG, WebP และ GIF",
        );
      const body = await read(req, MAX_IMAGE);
      const valid =
        (mime === "image/jpeg" &&
          body[0] === 255 &&
          body[1] === 216 &&
          body[2] === 255) ||
        (mime === "image/png" &&
          body
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
        (mime === "image/webp" &&
          body.toString("ascii", 0, 4) === "RIFF" &&
          body.toString("ascii", 8, 12) === "WEBP") ||
        (mime === "image/gif" &&
          ["GIF87a", "GIF89a"].includes(body.toString("ascii", 0, 6)));
      if (!valid)
        throw new CompetitionAdminError(
          415,
          "INVALID_IMAGE",
          "เนื้อหาไฟล์ไม่ตรงกับชนิดรูป",
        );
      const rawName =
        typeof req.headers["x-file-name"] === "string"
          ? req.headers["x-file-name"]
          : "competition-cover";
      const asset = await client.assets.upload("image", body, {
        contentType: mime,
        filename: rawName.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 120),
      });
      return res
        .status(200)
        .json({ data: { assetId: asset._id, url: asset.url } });
    }
    let body: unknown = {};
    if (write) {
      const buffer = await read(req, MAX_JSON);
      try {
        body = JSON.parse(buffer.toString("utf8"));
      } catch {
        throw new CompetitionAdminError(
          400,
          "INVALID_JSON",
          "ข้อมูล JSON ไม่ถูกต้อง",
        );
      }
    }
    const service = new CompetitionAdminService();
    let data: unknown;
    if (path.length === 0 && method === "GET")
      data = await service.list(req.query);
    else if (path.length === 0 && method === "POST") {
      const input = createSchema.parse(body);
      data = await service.create(input.operationId, input.input);
    } else if (path[0]) {
      const id = documentId.parse(path[0]);
      const action = path[1];
      if (path.length === 1 && method === "GET")
        data = await service.detail(id);
      else if (path.length === 1 && method === "PATCH") {
        const input = updateSchema.parse(body);
        data = await service.update(
          id,
          input.operationId,
          input.expectedRevision,
          input.input,
        );
      } else if (
        path.length === 2 &&
        method === "POST" &&
        [
          "publish",
          "close-registration",
          "open-registration",
          "close-event",
          "clone",
        ].includes(action ?? "")
      ) {
        const input = mutationSchema.parse(body);
        data = await service.action(
          id,
          input.operationId,
          input.expectedRevision,
          action as
            | "publish"
            | "close-registration"
            | "open-registration"
            | "close-event"
            | "clone",
        );
      } else if (
        action === "impact-report" &&
        path.length === 2 &&
        method === "POST"
      ) {
        const input = updateSchema.parse(body);
        data = await service.impact(id, input.expectedRevision, input.input);
      } else if (
        action === "apply-reviewed-rules" &&
        path.length === 2 &&
        method === "POST"
      ) {
        const input = updateSchema
          .extend({
            review: z.object({
              reportId: documentId,
              reviewReference: z.string().trim().min(10).max(1000),
              reason: z.string().trim().min(10).max(3000),
            }),
          })
          .parse(body);
        data = await service.update(
          id,
          input.operationId,
          input.expectedRevision,
          input.input,
          input.review,
        );
      } else if (
        action === "applications" &&
        path.length === 2 &&
        method === "GET"
      )
        data = await service.applications(id, req.query);
      else if (action === "metadata" && path.length === 2 && method === "GET")
        data = await service.metadata(id, req.query.microchip);
      else if (
        action === "applications" &&
        path.length === 3 &&
        method === "GET"
      )
        data = await service.application(id, documentId.parse(path[2]));
      else if (
        action === "applications" &&
        path.length === 4 &&
        path[3] === "approval" &&
        method === "POST"
      ) {
        const input = mutationSchema
          .extend({
            result: z.boolean(),
            comment: z.string().trim().max(3000).default(""),
          })
          .parse(body);
        data = await service.approval(
          id,
          documentId.parse(path[2]),
          input.operationId,
          input.expectedRevision,
          input.result,
          input.comment,
        );
      } else if (
        action === "applications" &&
        path.length === 4 &&
        path[3] === "delete" &&
        method === "POST"
      ) {
        const input = mutationSchema
          .extend({
            registrationRevision: z.string().min(1),
            reason: z.string().trim().min(10).max(3000),
          })
          .parse(body);
        data = await service.deleteApplication(
          id,
          documentId.parse(path[2]),
          input.operationId,
          input.expectedRevision,
          input.registrationRevision,
          input.reason,
        );
      } else if (
        action === "recount" &&
        path.length === 2 &&
        method === "POST"
      ) {
        const input = mutationSchema.parse(body);
        data = await service.recountRegistrations(
          id,
          input.operationId,
          input.expectedRevision,
        );
      } else if (
        action === "applications" &&
        path.length === 4 &&
        path[3] === "retry-notification" &&
        method === "POST"
      ) {
        const input = z
          .object({ expectedRevision: z.string().min(1) })
          .parse(body);
        data = await service.retryNotification(
          id,
          documentId.parse(path[2]),
          input.expectedRevision,
        );
      } else if (
        action === "onsite" &&
        path.length === 2 &&
        method === "POST"
      ) {
        const input = mutationSchema
          .extend({ registration: z.unknown() })
          .parse(body);
        data = await service.onsite(
          id,
          input.operationId,
          input.expectedRevision,
          input.registration,
        );
      } else if (action === "export" && path.length === 2 && method === "GET")
        data = await service.export(id);
      else
        throw new CompetitionAdminError(
          405,
          "METHOD_NOT_ALLOWED",
          "ไม่รองรับเส้นทางหรือวิธีนี้",
        );
    } else
      throw new CompetitionAdminError(
        405,
        "METHOD_NOT_ALLOWED",
        "ไม่รองรับเส้นทางหรือวิธีนี้",
      );
    return res.status(200).json({ data });
  } catch (cause) {
    if (cause instanceof CompetitionAdminError)
      return res
        .status(cause.status)
        .json({ error: { code: cause.code, message: cause.message } });
    if (cause instanceof z.ZodError)
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: cause.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; "),
        },
      });
    const status = (cause as { statusCode?: number })?.statusCode;
    if (status === 409)
      return res.status(409).json({
        error: {
          code: "REVISION_CONFLICT",
          message: "ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุด",
        },
      });
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง",
      },
    });
  }
}
