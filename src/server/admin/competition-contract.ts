import { z } from "zod";

export const documentId = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/)
  .refine((id) => !id.startsWith("drafts."), "Use the canonical event ID");
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");
const catalog = z
  .array(z.string().trim().min(1).max(300))
  .max(200)
  .refine(
    (labels) => new Set(labels).size === labels.length,
    "Duplicate class labels",
  );
export const competitionInputSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.string().max(20000).default(""),
    location: z.string().max(1000).default(""),
    startAt: day.optional(),
    endAt: day.optional(),
    registrationStartAt: day.optional(),
    registrationDeadline: day.optional(),
    buffaloAgeDeadline: day.optional(),
    eventType: z.enum(["normal", "royal"]).optional(),
    imageAssetId: z
      .string()
      .regex(/^image-[a-zA-Z0-9_-]+$/)
      .optional(),
    catalogs: z.object({ national: catalog, province: catalog }),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.startAt && input.endAt && input.startAt > input.endAt)
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "วันจบงานต้องไม่ก่อนวันเริ่มงาน",
      });
    if (
      input.registrationStartAt &&
      input.registrationDeadline &&
      input.registrationStartAt > input.registrationDeadline
    )
      ctx.addIssue({
        code: "custom",
        path: ["registrationDeadline"],
        message: "วันปิดรับสมัครต้องไม่ก่อนวันเปิดรับสมัคร",
      });
    if (
      input.registrationDeadline &&
      input.endAt &&
      input.registrationDeadline > input.endAt
    )
      ctx.addIssue({
        code: "custom",
        path: ["registrationDeadline"],
        message: "วันปิดรับสมัครต้องไม่หลังวันจบงาน",
      });
  });
export type CompetitionInput = z.infer<typeof competitionInputSchema>;
export const mutationSchema = z.object({
  operationId: z.string().uuid(),
  expectedRevision: z.string().min(1),
});
export const createSchema = z.object({
  operationId: z.string().uuid(),
  input: competitionInputSchema,
});
export const updateSchema = mutationSchema.extend({
  input: competitionInputSchema,
});
export const listSchema = z.object({
  search: z.string().max(300).default(""),
  lifecycle: z
    .enum(["draft", "upcoming", "ongoing", "ended", "closed"])
    .optional(),
  registrationStatus: z
    .enum([
      "not-yet",
      "open",
      "closed-manual",
      "closed-date",
      "unavailable",
      "invalid",
    ])
    .optional(),
  eventType: z.enum(["normal", "royal"]).optional(),
  startFrom: day.optional(),
  startTo: day.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type CompetitionPolicyDTO = {
  today: string;
  lifecycle: string;
  publicRegistration: string;
  publicVisible: boolean;
  onsiteAllowed: boolean;
  warnings: string[];
};
export interface CompetitionDTO extends Omit<CompetitionInput, "catalogs"> {
  _id: string;
  _rev: string;
  competitionState?: string;
  isActive?: boolean;
  registrationActive?: boolean;
  imageUrl?: string;
  catalogs: { national: string[]; province: string[] };
  registrationCount: number;
  policy: CompetitionPolicyDTO;
}
export interface CompetitionListDTO {
  items: CompetitionDTO[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
}
export class CompetitionAdminError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
