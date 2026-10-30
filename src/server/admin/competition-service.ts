import {
  normalizeCompetitionLevel,
  requiresLevelDuplicateOverride,
} from "~/lib/normal-competition-levels";
import { createHash, randomUUID } from "node:crypto";
import { type SanityClient } from "next-sanity";
import { client } from "~/server/sanity/client";
import {
  competitionInputSchema,
  competitionExistingInputSchema,
  CompetitionAdminError,
  type CompetitionDTO,
  type CompetitionInput,
  type CompetitionListDTO,
  listSchema,
} from "./competition-contract";
import {
  assertCompetitionRegistration,
  calculateCompetitionAge,
  calculateRegistrationAge,
  getCompetitionPolicy,
} from "~/server/services/competition-policy";
import {
  registrationPolicy,
  registrationStatuses,
  type ApprovalPolicyEvent,
} from "~/server/services/competition-approval-policy";
import { z } from "zod";
import dayjs from "dayjs";
import {
  normalizeClassName,
  parseCompetitionClass,
  validateCompetitionCatalog,
} from "~/lib/competition-classes";
import { getPossibleEvents, getSpecialEvents } from "~/utils/getPossibleEvents";
import {
  deleteApplication,
  findOperation,
  operationDocument,
  recountRegistrations,
} from "./competition-registration-admin";

type Doc = Record<string, any> & { _id: string; _rev: string };
const projection = `{...,"imageAssetId":image.asset._ref,"imageUrl":image.asset->url,"catalogDocuments":*[_type in ["nationalEventType","provinceEventType"] && event._ref == ^._id] | order(_id asc) {_id,_rev,_type,data},"registrationCount":count(*[_type == "eventRegister" && event._ref == ^._id])}`;
const ref = (id: string) => ({ _type: "reference", _ref: id });
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const error = (status: number, code: string, message: string): never => {
  throw new CompetitionAdminError(status, code, message);
};
export function toCompetitionDTO(doc: Doc): CompetitionDTO {
  const catalogs = (doc.catalogDocuments ?? []) as Doc[];
  const policy = getCompetitionPolicy(doc);
  if (
    catalogs.filter((d) => d._type === "nationalEventType").length > 1 ||
    catalogs.filter((d) => d._type === "provinceEventType").length > 1
  )
    policy.warnings.push("duplicate-catalog-documents");
  return {
    _id: doc._id,
    _rev: doc._rev,
    title: doc.title ?? "",
    description: doc.description ?? "",
    location: doc.location ?? "",
    startAt: typeof doc.startAt === "string" ? doc.startAt : undefined,
    endAt: typeof doc.endAt === "string" ? doc.endAt : undefined,
    registrationStartAt:
      typeof doc.registrationStartAt === "string"
        ? doc.registrationStartAt
        : undefined,
    registrationDeadline:
      typeof doc.registrationDeadline === "string"
        ? doc.registrationDeadline
        : undefined,
    buffaloAgeDeadline:
      typeof doc.buffaloAgeDeadline === "string"
        ? doc.buffaloAgeDeadline
        : undefined,
    eventType: ["normal", "royal"].includes(doc.eventType)
      ? doc.eventType
      : undefined,
    imageAssetId: doc.imageAssetId ?? doc.image?.asset?._ref,
    imageUrl: typeof doc.imageUrl === "string" ? doc.imageUrl : undefined,
    competitionState:
      typeof doc.competitionState === "string"
        ? doc.competitionState
        : undefined,
    isActive: typeof doc.isActive === "boolean" ? doc.isActive : undefined,
    registrationActive:
      typeof doc.registrationActive === "boolean"
        ? doc.registrationActive
        : undefined,
    registrationCount: Math.max(
      doc.registrationCount ?? 0,
      doc.competitionRegistrationCount ?? 0,
    ),
    catalogs: {
      national: catalogs
        .filter((c) => c._type === "nationalEventType")
        .flatMap((c) => c.data ?? []),
      province: catalogs
        .filter((c) => c._type === "provinceEventType")
        .flatMap((c) => c.data ?? []),
    },
    policy,
  };
}
function exactAge(
  birthday: unknown,
  cutoff: unknown,
): { months: number; days: number } | null {
  if (typeof birthday !== "string" || typeof cutoff !== "string") return null;
  try {
    calculateCompetitionAge(birthday, cutoff);
    const birth = dayjs(birthday.slice(0, 10));
    const end = dayjs(cutoff.slice(0, 10));
    const months = end.diff(birth, "month");
    return { months, days: end.diff(birth.add(months, "month"), "day") };
  } catch {
    return null;
  }
}
function config(doc: Doc): CompetitionInput {
  const dto = toCompetitionDTO(doc);
  return {
    title: dto.title,
    description: dto.description,
    location: dto.location,
    startAt: dto.startAt,
    endAt: dto.endAt,
    registrationStartAt: dto.registrationStartAt,
    registrationDeadline: dto.registrationDeadline,
    buffaloAgeDeadline: dto.buffaloAgeDeadline,
    eventType: dto.eventType,
    imageAssetId: dto.imageAssetId,
    catalogs: dto.catalogs,
  };
}
function fields(input: CompetitionInput) {
  const { imageAssetId, ...restWithCatalogs } = input;
  const rest = Object.fromEntries(
    Object.entries(restWithCatalogs).filter(([key]) => key !== "catalogs"),
  );
  return {
    ...Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    ),
    ...(imageAssetId
      ? { image: { _type: "image", asset: ref(imageAssetId) } }
      : {}),
  };
}
export function validatePublish(
  input: CompetitionInput,
  preserveLegacyCatalogs = false,
) {
  (preserveLegacyCatalogs
    ? competitionExistingInputSchema
    : competitionInputSchema
  ).parse(input);
  for (const key of [
    "startAt",
    "endAt",
    "registrationStartAt",
    "registrationDeadline",
    "buffaloAgeDeadline",
    "eventType",
    "imageAssetId",
    "location",
  ] as const)
    if (!input[key])
      error(422, "INCOMPLETE_EVENT", `กรุณาระบุ ${key} ก่อนเปิดงาน`);
  if (!input.catalogs.national.length && !input.catalogs.province.length)
    error(422, "INCOMPLETE_CATALOG", "กรุณาระบุอย่างน้อยหนึ่งรุ่นแข่งขัน");
}
function validateChangedCatalogs(
  old: CompetitionInput,
  next: CompetitionInput,
) {
  for (const level of ["national", "province"] as const) {
    if (hash(old.catalogs[level]) === hash(next.catalogs[level])) continue;
    const errors = validateCompetitionCatalog(next.catalogs[level]);
    if (errors.length) error(422, "INVALID_CATALOG", errors.join("; "));
  }
}
const stringValue = (value: unknown) =>
  typeof value === "string" ? value : "";
const validAge = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
// Keep approval identity and precedence identical for application screens and exports.
const approvalProjection = `"approval":*[_type=="approvment" && event._ref==$id && eventRegister._ref==^._id] | order(coalesce(approvementDate,_updatedAt,_createdAt) desc,_id desc)[0]`;
const applicationProjection = `{...,"sex":coalesce(sex,gender),"applicant":user->{_id,lineId},${approvalProjection},"images":*[_type=="eventImage" && event._ref==$id && eventRegister._ref==^._id] | order(_createdAt asc,_id asc){_id,"images":imageArray[]{imageTitle,"url":imageAsset.asset->url}},"address":*[_type=="eventAddress" && event._ref==$id && eventRegister._ref==^._id] | order(_updatedAt desc,_id desc)[0]}`;
export function normalizeApplication(doc: Doc, event?: ApprovalPolicyEvent) {
  const approval =
    doc.approval && typeof doc.approval === "object"
      ? {
          ...doc.approval,
          _id: stringValue(doc.approval._id),
          _rev: stringValue(doc.approval._rev),
          approvementResult:
            typeof doc.approval.approvementResult === "boolean"
              ? doc.approval.approvementResult
              : null,
          comment: stringValue(doc.approval.comment),
          approvementDate: stringValue(doc.approval.approvementDate) || null,
          notificationState:
            doc.approval.notificationAttemptAt &&
            (!doc.approval.notificationUpdatedAt ||
              Date.parse(doc.approval.notificationAttemptAt) >
                Date.parse(doc.approval.notificationUpdatedAt))
              ? "uncertain"
              : stringValue(doc.approval.notificationState) || "unknown",
          notificationUpdatedAt:
            stringValue(doc.approval.notificationUpdatedAt) || null,
        }
      : null;
  const applicant =
    doc.applicant && typeof doc.applicant === "object"
      ? {
          _id: stringValue(doc.applicant._id),
          lineId: stringValue(doc.applicant.lineId) || null,
        }
      : null;
  const result = {
    ...doc,
    ...Object.fromEntries(
      [
        "name",
        "birthday",
        "microchip",
        "ownerName",
        "ownerTel",
        "type",
        "level",
        "farmName",
        "province",
        "fatherName",
        "motherName",
        "color",
      ].map((key) => [key, stringValue(doc[key])]),
    ),
    sex: stringValue(doc.sex) || stringValue(doc.gender),
    buffaloAge: validAge(doc.buffaloAge) ? doc.buffaloAge : null,
    approval,
    ...registrationPolicy(event, approval),
    approvalStatus:
      approval?.approvementResult === true
        ? ("accepted" as const)
        : approval?.approvementResult === false
          ? ("rejected" as const)
          : ("pending" as const),
    applicant,
    hasLineRecipient:
      !!applicant?.lineId ||
      !!stringValue(doc.approval?.notificationPayload?.to).trim(),
    deliveryEnabled:
      process.env.COMPETITION_LINE_NOTIFICATIONS_ENABLED === "true",
    images: Array.isArray(doc.images)
      ? doc.images
          .filter((image: unknown) => image && typeof image === "object")
          .map((image: Doc) => ({
            _id: stringValue(image._id),
            images: Array.isArray(image.images)
              ? image.images.map((part: Doc) => ({
                  imageTitle: stringValue(part?.imageTitle),
                  url: stringValue(part?.url) || null,
                }))
              : [],
          }))
      : [],
    address:
      doc.address && typeof doc.address === "object"
        ? Object.fromEntries(
            ["_id", "address", "district", "amphoe", "province", "zipcode"].map(
              (key) => [key, stringValue(doc.address[key])],
            ),
          )
        : null,
    isAdminRegistration: doc.isAdminRegistration === true,
    registeredAt:
      stringValue(doc.registeredAt) || stringValue(doc._createdAt) || null,
  };
  return result as typeof result & Doc;
}
export const applicationListSchema = z.object({
  search: z.string().trim().max(300).default(""),
  status: z.enum(["pending", "accepted", "rejected"]).optional(),
  registrationStatus: z.enum(registrationStatuses).optional(),
  type: z.string().max(2000).optional(),
  level: z.enum(["national", "province"]).optional(),
  sex: z.string().max(100).optional(),
  color: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export function applicationList(
  records: Doc[],
  raw: unknown,
  event?: ApprovalPolicyEvent,
) {
  const input = applicationListSchema.parse(raw);
  const all = records.map((record) => normalizeApplication(record, event));
  const term = input.search.toLocaleLowerCase();
  const filtered = all.filter(
    (row) =>
      (!term ||
        [row.name, row.ownerName, row.microchip, row.ownerTel, row.farmName]
          .join(" ")
          .toLocaleLowerCase()
          .includes(term)) &&
      (!input.type ||
        normalizeClassName(row.type) === normalizeClassName(input.type)) &&
      (!input.level ||
        (row.level === "จังหวัด" || row.level === "province"
          ? "province"
          : row.level === "ประเทศ" || row.level === "national"
            ? "national"
            : "") === input.level) &&
      (!input.sex ||
        row.sex.toLocaleLowerCase() === input.sex.toLocaleLowerCase()) &&
      (!input.color ||
        row.color.toLocaleLowerCase() === input.color.toLocaleLowerCase()),
  );
  const counts = {
    total: filtered.length,
    pending: 0,
    accepted: 0,
    rejected: 0,
  };
  for (const row of filtered) counts[row.approvalStatus]++;
  const registrationCounts = {
    total: filtered.length,
    registered: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    needs_type_review: 0,
  };
  for (const row of filtered) registrationCounts[row.registrationStatus]++;
  const selected = filtered.filter(
    (row) =>
      (!input.status || row.approvalStatus === input.status) &&
      (!input.registrationStatus ||
        row.registrationStatus === input.registrationStatus),
  );
  const unique = (key: "type" | "level" | "sex" | "color") =>
    [...new Set(all.map((row) => stringValue(row[key])).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, "th"),
    );
  return {
    items: selected.slice(
      (input.page - 1) * input.pageSize,
      input.page * input.pageSize,
    ),
    total: selected.length,
    page: input.page,
    pageSize: input.pageSize,
    counts,
    registrationPolicyVersion: 1 as const,
    approvalRequirement: registrationPolicy(event).approvalRequirement,
    registrationCounts,
    facets: {
      types: unique("type"),
      levels: unique("level"),
      sexes: unique("sex"),
      colors: unique("color"),
    },
  };
}
export function exportRegistration(row: Doc, event: CompetitionDTO) {
  let exportAge: number | null = null;
  let ageSource: "stored" | "cutoff" | "missing" = "missing";
  let ageWarning: string | null = null;
  if (validAge(row.buffaloAge)) {
    exportAge = row.buffaloAge;
    ageSource = "stored";
  } else {
    try {
      // Never substitute today's date or the registration deadline for the age cutoff.
      if (!event.buffaloAgeDeadline) throw new Error("missing cutoff");
      exportAge = calculateRegistrationAge(event, row.birthday, row.color);
      ageSource = "cutoff";
      ageWarning = "calculated-from-cutoff";
    } catch {
      ageWarning = "missing-or-invalid-age";
    }
  }
  return {
    ...normalizeApplication(row, event),
    type: normalizeClassName(stringValue(row.type)),
    exportAge,
    ageSource,
    ageWarning,
  };
}

export class CompetitionAdminService {
  constructor(private readonly db: SanityClient = client) {}
  async detail(id: string) {
    const doc = await this.source(id);
    return toCompetitionDTO(doc);
  }
  async source(id: string): Promise<Doc> {
    const joined = await this.db.fetch<Doc | null>(
      `*[_type=="event" && _id==$id][0]${projection}`,
      { id },
    );
    const strong = await this.db.getDocument<Doc>(id);
    if (!strong || strong._type !== "event")
      return error(404, "NOT_FOUND", "ไม่พบงานแข่งขัน");
    return {
      ...joined,
      ...strong,
      competitionIndexedRevision: joined?._rev,
      imageAssetId: strong.image?.asset?._ref,
      imageUrl: joined?.imageUrl,
      catalogDocuments: (
        await Promise.all(
          ((joined?.catalogDocuments ?? []) as Doc[]).map((catalog) =>
            this.db.getDocument<Doc>(catalog._id),
          ),
        )
      ).filter(
        (catalog): catalog is NonNullable<typeof catalog> =>
          !!catalog &&
          ["nationalEventType", "provinceEventType"].includes(catalog._type) &&
          catalog.event?._ref === id,
      ),
      registrationCount: Math.max(
        joined?.registrationCount ?? 0,
        strong.competitionRegistrationCount ?? 0,
      ),
    };
  }
  async list(raw: unknown): Promise<CompetitionListDTO> {
    const input = listSchema.parse(raw);
    const docs = await this.db.fetch<Doc[]>(
      `*[_type=="event" && !(_id in path("drafts.**"))] | order(startAt desc,_createdAt desc) ${projection}`,
    );
    const all = docs.map(toCompetitionDTO);
    const counts: Record<string, number> = { total: all.length };
    for (const item of all)
      counts[item.policy.lifecycle] = (counts[item.policy.lifecycle] ?? 0) + 1;
    const term = input.search.toLocaleLowerCase();
    const filtered = all.filter(
      (item) =>
        (!term ||
          `${item.title} ${item.location}`
            .toLocaleLowerCase()
            .includes(term)) &&
        (!input.lifecycle || item.policy.lifecycle === input.lifecycle) &&
        (!input.registrationStatus ||
          item.policy.publicRegistration === input.registrationStatus) &&
        (!input.eventType || item.eventType === input.eventType) &&
        (!input.startFrom ||
          (!!item.startAt && item.startAt >= input.startFrom)) &&
        (!input.startTo || (!!item.startAt && item.startAt <= input.startTo)),
    );
    const start = (input.page - 1) * input.pageSize;
    return {
      items: filtered.slice(start, start + input.pageSize),
      total: filtered.length,
      page: input.page,
      pageSize: input.pageSize,
      counts,
    };
  }
  private async previous(
    operationId: string,
    payload: unknown,
  ): Promise<string | null> {
    const doc = await findOperation(this.db, operationId, payload);
    return doc ? (doc.eventId as string) : null;
  }
  private operation(
    operationId: string,
    eventId: string,
    payload: unknown,
    action: string,
  ) {
    return operationDocument(operationId, eventId, payload, action);
  }
  deleteApplication(
    id: string,
    registrationId: string,
    operationId: string,
    revision: string,
    registrationRevision: string,
    reason: string,
  ) {
    return deleteApplication(
      this.db,
      id,
      registrationId,
      operationId,
      revision,
      registrationRevision,
      reason,
    );
  }
  recountRegistrations(id: string, operationId: string, revision: string) {
    return recountRegistrations(this.db, id, operationId, revision);
  }
  private async asset(input: CompetitionInput) {
    if (input.imageAssetId) {
      const asset = await this.db.getDocument<{ _id: string; _type: string }>(
        input.imageAssetId,
      );
      if (asset?._type !== "sanity.imageAsset")
        error(422, "INVALID_ASSET", "ไม่พบไฟล์รูปปก");
    }
  }
  async create(
    operationId: string,
    raw: CompetitionInput,
    sourcePayload?: unknown,
  ) {
    const input = competitionInputSchema.parse(raw);
    const payload = sourcePayload ?? { action: "create", input };
    const previous = await this.previous(operationId, payload);
    if (previous) return this.detail(previous);
    await this.asset(input);
    const id = `competition-${operationId}`;
    let tx = this.db.transaction().create({
      _id: id,
      _type: "event",
      ...fields(input),
      competitionState: "draft",
      isActive: false,
      registrationActive: false,
      competitionWriteFence: 0,
      competitionRegistrationCount: 0,
      competitionActor: "dashboard-shared",
    });
    for (const [level, labels] of Object.entries(input.catalogs))
      if (labels.length)
        tx = tx.create({
          _id: `${id}-${level}`,
          _type:
            level === "national" ? "nationalEventType" : "provinceEventType",
          event: ref(id),
          eventName: input.title,
          data: labels,
        });
    tx = tx.create(this.operation(operationId, id, payload, "create"));
    await tx.commit({ visibility: "sync" });
    return this.detail(id);
  }
  async update(
    id: string,
    operationId: string,
    revision: string,
    raw: CompetitionInput,
    review?: { reportId: string; reviewReference: string; reason: string },
  ) {
    const input = competitionExistingInputSchema.parse(raw);
    const payload = { action: "update", id, revision, input, review };
    const previous = await this.previous(operationId, payload);
    if (previous) return this.detail(previous);
    const doc = await this.source(id);
    this.revision(doc, revision);
    const old = config(doc);
    validateChangedCatalogs(old, input);
    const rulesChanged =
      old.buffaloAgeDeadline !== input.buffaloAgeDeadline ||
      old.eventType !== input.eventType ||
      hash(old.catalogs) !== hash(input.catalogs);
    if (doc.registrationCount > 0 && rulesChanged) {
      if (!review)
        return error(
          409,
          "RULES_LOCKED",
          "มีผู้สมัครแล้ว ต้องตรวจผลกระทบและอ้างอิงการตรวจจากคุณนนท์ก่อนแก้กติกา",
        );
      const report = await this.db.getDocument<Doc>(review.reportId);
      if (
        !report ||
        report.eventId !== id ||
        report.eventRevision !== revision ||
        report.proposedHash !== hash(input) ||
        report.catalogHash !== hash(doc.catalogDocuments)
      )
        return error(
          409,
          "STALE_IMPACT_REPORT",
          "รายงานผลกระทบเก่าหรือไม่ตรงกับข้อมูลที่แก้ไข",
        );
    }
    if (
      doc.competitionState === "published" ||
      (!doc.competitionState && doc.isActive)
    )
      validatePublish(input, true);
    await this.asset(input);
    let tx = this.db.transaction().patch(id, (p) =>
      p
        .ifRevisionId(revision)
        .set({ ...fields(input), competitionActor: "dashboard-shared" })
        .setIfMissing({ competitionWriteFence: 0 })
        .inc({ competitionWriteFence: 1 })
        .unset(
          [
            "startAt",
            "endAt",
            "registrationStartAt",
            "registrationDeadline",
            "buffaloAgeDeadline",
            "eventType",
            "image",
          ].filter((k) =>
            k === "image" ? !input.imageAssetId : !(k in fields(input)),
          ),
        ),
    );
    for (const [level, labels] of Object.entries(input.catalogs)) {
      const type =
        level === "national" ? "nationalEventType" : "provinceEventType";
      const catalogs = (doc.catalogDocuments as Doc[]).filter(
        (c) => c._type === type,
      );
      if (catalogs.length > 1)
        return error(
          409,
          "DUPLICATE_CATALOG",
          "พบเอกสารรุ่นซ้ำ กรุณาตรวจข้อมูลเดิมก่อนแก้ไข",
        );
      const existing = catalogs[0];
      if (
        existing &&
        hash(existing.data ?? []) === hash(labels) &&
        existing.eventName === input.title
      )
        continue;
      if (existing)
        tx = tx.patch(existing._id, (p) =>
          p
            .ifRevisionId(existing._rev)
            .set({ eventName: input.title, data: labels }),
        );
      else if (labels.length)
        tx = tx.create({
          _id: `${id}-${level}`,
          _type: type,
          event: ref(id),
          eventName: input.title,
          data: labels,
        });
    }
    tx = tx.create({
      ...this.operation(operationId, id, payload, "update"),
      ...(review ? { review } : {}),
      before: old,
      after: input,
    });
    await tx.commit({ visibility: "sync" });
    return this.detail(id);
  }
  private revision(doc: Doc, revision: string) {
    if (doc._rev !== revision)
      error(
        409,
        "REVISION_CONFLICT",
        "ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุด",
      );
  }
  async action(
    id: string,
    operationId: string,
    revision: string,
    action:
      | "publish"
      | "close-registration"
      | "open-registration"
      | "close-event"
      | "clone",
  ) {
    const payload = { action, id, revision };
    const previous = await this.previous(operationId, payload);
    if (previous) return this.detail(previous);
    const doc = await this.source(id);
    this.revision(doc, revision);
    if (action === "clone")
      return this.create(
        operationId,
        { ...config(doc), title: `${doc.title} (สำเนา)` },
        payload,
      );
    let change: Record<string, unknown> = {};
    if (action === "publish") {
      if (doc.competitionState !== "draft")
        return error(
          409,
          "NOT_A_DRAFT",
          "เปิดเผยแพร่ได้เฉพาะงานร่าง กรุณาใช้คำสั่งเปิดรับสมัครสำหรับงานที่เผยแพร่แล้ว",
        );
      validatePublish(config(doc));
      change = {
        competitionState: "published",
        isActive: true,
        registrationActive: true,
      };
    }
    if (action === "close-registration") change = { registrationActive: false };
    if (action === "close-event" && doc.competitionState === "draft")
      return error(
        409,
        "NOT_PUBLISHED",
        "งานร่างยังไม่เปิดเผยแพร่ กรุณาเก็บเป็นร่างไว้",
      );
    if (action === "close-event")
      change = {
        competitionState: "closed",
        isActive: false,
        registrationActive: false,
      };
    if (action === "open-registration") {
      validatePublish(config(doc));
      const policy = getCompetitionPolicy({ ...doc, registrationActive: true });
      if (policy.publicRegistration !== "open")
        return error(
          409,
          "REOPEN_REQUIRES_SCHEDULE",
          "กรุณาปรับช่วงรับสมัครและตรวจสถานะงานก่อนเปิดรับสมัครอีกครั้ง",
        );
      change = { registrationActive: true };
    }
    await this.db
      .transaction()
      .patch(id, (p) =>
        p
          .ifRevisionId(revision)
          .set({ ...change, competitionActor: "dashboard-shared" })
          .setIfMissing({ competitionWriteFence: 0 })
          .inc({ competitionWriteFence: 1 }),
      )
      .create({
        ...this.operation(operationId, id, payload, action),
        before: {
          competitionState:
            typeof doc.competitionState === "string"
              ? doc.competitionState
              : undefined,
          isActive:
            typeof doc.isActive === "boolean" ? doc.isActive : undefined,
          registrationActive:
            typeof doc.registrationActive === "boolean"
              ? doc.registrationActive
              : undefined,
        },
        after: change,
      })
      .commit({ visibility: "sync" });
    return this.detail(id);
  }
  async impact(id: string, revision: string, raw: CompetitionInput) {
    const input = competitionExistingInputSchema.parse(raw);
    const doc = await this.source(id);
    this.revision(doc, revision);
    validateChangedCatalogs(config(doc), input);
    if (doc.competitionIndexedRevision !== doc._rev)
      return error(
        409,
        "REGISTRATION_INDEX_PENDING",
        "ข้อมูลผู้สมัครกำลังอัปเดต กรุณาลองรายงานผลกระทบอีกครั้ง",
      );
    const applicants = await this.db.fetch<Doc[]>(
      '*[_type=="eventRegister" && event._ref==$id]{_id,birthday,color,buffaloAge,type,level}',
      { id },
    );
    if (applicants.length < (doc.competitionRegistrationCount ?? 0))
      return error(
        409,
        "REGISTRATION_INDEX_PENDING",
        "ข้อมูลผู้สมัครกำลังอัปเดต กรุณาลองรายงานผลกระทบอีกครั้ง",
      );
    const rows = applicants.map((a) => {
      const level =
        a.level === "จังหวัด" || a.level === "province"
          ? "province"
          : "national";
      const previousCatalog = config(doc).catalogs[level],
        nextCatalog = input.catalogs[level];
      let oldAge: number | null = null,
        newAge: number | null = null;
      const nextEvent: Doc = { ...doc, ...fields(input) };
      try {
        oldAge = calculateRegistrationAge(doc, a.birthday, a.color);
        newAge = calculateRegistrationAge(nextEvent, a.birthday, a.color);
      } catch {
        /* invalid legacy date explicitly retained */
      }
      const oldPossibleClasses =
        oldAge === null
          ? []
          : [
              ...new Set(
                [
                  ...getPossibleEvents(oldAge, previousCatalog),
                  ...getSpecialEvents(previousCatalog, oldAge),
                ].filter((label): label is string => !!label),
              ),
            ];
      const newPossibleClasses =
        newAge === null
          ? []
          : [
              ...new Set(
                [
                  ...getPossibleEvents(newAge, nextCatalog),
                  ...getSpecialEvents(nextCatalog, newAge),
                ].filter((label): label is string => !!label),
              ),
            ];
      const oldEligible = oldPossibleClasses.some(
        (label) =>
          normalizeClassName(label) === normalizeClassName(a.type ?? ""),
      );
      const newEligible = newPossibleClasses.some(
        (label) =>
          normalizeClassName(label) === normalizeClassName(a.type ?? ""),
      );
      const adjustedBirthday =
        doc.eventType === "royal" &&
        a.color !== "black" &&
        typeof a.birthday === "string"
          ? dayjs(a.birthday.slice(0, 10))
              .subtract(1, "day")
              .format("YYYY-MM-DD")
          : a.birthday;
      return {
        registrationId: a._id,
        birthday: a.birthday,
        color: a.color,
        storedAge: a.buffaloAge ?? null,
        oldAge,
        newAge,
        oldExactAge: exactAge(adjustedBirthday, doc.buffaloAgeDeadline),
        newExactAge: exactAge(
          nextEvent.eventType === "royal" &&
            a.color !== "black" &&
            typeof a.birthday === "string"
            ? dayjs(a.birthday.slice(0, 10))
                .subtract(1, "day")
                .format("YYYY-MM-DD")
            : a.birthday,
          input.buffaloAgeDeadline,
        ),
        oldPossibleClasses,
        newPossibleClasses,
        oldEligible,
        newEligible,
        type: a.type,
        level: a.level,
        special: previousCatalog.some(
          (label) =>
            parseCompetitionClass(label)?.kind === "special" &&
            normalizeClassName(label) === normalizeClassName(a.type ?? ""),
        ),
        affected:
          oldAge !== newAge || oldEligible !== newEligible || !newEligible,
        invalidAge: oldAge === null || newAge === null,
      };
    });
    const idReport = `competition-impact-${hash({ id, revision, input, catalogs: doc.catalogDocuments }).slice(0, 40)}`;
    await this.db.createIfNotExists({
      _id: idReport,
      _type: "competitionImpactReport",
      eventId: id,
      eventRevision: revision,
      proposedHash: hash(input),
      catalogHash: hash(doc.catalogDocuments),
      createdAt: new Date().toISOString(),
      rows,
    });
    return {
      reportId: idReport,
      eventRevision: revision,
      total: rows.length,
      affected: rows.filter((r) => r.affected).length,
      rows,
    };
  }
  async applications(id: string, raw: unknown) {
    const event = await this.source(id);
    const records = await this.db.fetch<Doc[]>(
      '*[_type=="eventRegister" && event._ref==$id] | order(_createdAt desc,_id desc)' +
        applicationProjection,
      { id },
    );
    return applicationList(records, raw, { eventType: event.eventType });
  }
  async application(id: string, registrationId: string) {
    const registration = await this.db.fetch<Doc | null>(
      '*[_type=="eventRegister" && _id==$registrationId && event._ref==$id][0]' +
        applicationProjection,
      { id, registrationId },
    );
    if (!registration)
      return error(404, "APPLICATION_NOT_FOUND", "ไม่พบใบสมัครในงานนี้");
    const event = await this.source(id);
    return normalizeApplication(registration, { eventType: event.eventType });
  }
  async metadata(id: string, rawMicrochip: unknown) {
    await this.source(id);
    const microchip = z.string().trim().min(1).max(100).parse(rawMicrochip);
    const duplicates = await this.db.fetch<Doc[]>(
      '*[_type=="eventRegister" && event._ref==$id && microchip==$microchip] | order(_createdAt desc,_id desc){_id,name,type,ownerName,level}',
      { id, microchip },
    );
    const { getMetadataByMicrochipId } = await import(
      "~/server/services/metadata.service"
    );
    let metadata: Awaited<ReturnType<typeof getMetadataByMicrochipId>>;
    let lookupTimeout: ReturnType<typeof setTimeout> | undefined;
    let lookupUnavailable = false;
    try {
      metadata = await Promise.race([
        getMetadataByMicrochipId(microchip, { throwOnError: true }),
        new Promise<never>((_resolve, reject) => {
          lookupTimeout = setTimeout(
            () => reject(new Error("Metadata lookup timed out")),
            8000,
          );
        }),
      ]);
    } catch {
      // Duplicate warnings remain authoritative even if the external registry is down.
      lookupUnavailable = true;
    } finally {
      if (lookupTimeout !== undefined) clearTimeout(lookupTimeout);
    }
    const found =
      !!metadata?.name?.trim() &&
      metadata.certify?.microchip?.trim() === microchip;
    const birthdate = metadata?.birthdate
      ? new Date(metadata.birthdate * 1000)
      : null;
    return {
      found,
      microchip,
      lookupUnavailable,
      lookupWarning: lookupUnavailable
        ? "ไม่สามารถค้นทะเบียนได้ในขณะนี้ กรุณาตรวจและกรอกข้อมูลเอง"
        : null,
      metadata: found
        ? {
            name: metadata!.name,
            birthday:
              birthdate && Number.isFinite(birthdate.getTime())
                ? birthdate.toISOString().slice(0, 10)
                : "",
            sex: stringValue(metadata!.sex).toLowerCase(),
            color: stringValue(metadata!.color).toLowerCase(),
            imageUrl: stringValue(metadata!.imageUri),
            fatherName: "",
            motherName: "",
          }
        : null,
      duplicateCount: duplicates.length,
      duplicateRegistrations: duplicates.map((row) => ({
        _id: row._id,
        name: stringValue(row.name),
        type: stringValue(row.type),
        ownerName: stringValue(row.ownerName),
        level: normalizeCompetitionLevel(row.level),
      })),
    };
  }
  async export(id: string) {
    const event = await this.detail(id);
    const records = await this.db.fetch<Doc[]>(
      `*[_type=="eventRegister" && event._ref==$id] | order(_createdAt asc,_id asc){...,"sex":coalesce(sex,gender),${approvalProjection}}`,
      { id },
    );
    const registrations = records.map((row) => exportRegistration(row, event));
    return {
      event,
      registrations,
      rowCount: registrations.length,
      registrationPolicyVersion: 1 as const,
    };
  }
  async onsite(
    id: string,
    operationId: string,
    revision: string,
    raw: unknown,
  ) {
    const data = z
      .object({
        name: z.string().min(1),
        birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        microchip: z.string().min(1),
        ownerName: z.string().min(1),
        ownerTel: z.string().min(1),
        type: z.string().min(1),
        level: z.enum(["national", "province"]),
        sex: z.enum(["male", "female"]),
        color: z.enum(["black", "albino", "white"]),
        farmName: z.string().default(""),
        province: z.string().default(""),
        fatherName: z.string().default(""),
        motherName: z.string().default(""),
        duplicateOverrideReason: z.string().trim().min(10).optional(),
      })
      .strict()
      .parse(raw);
    const payload = { action: "onsite", id, revision, data };
    const previous = await this.previous(operationId, payload);
    if (previous)
      return this.application(id, `competition-entry-${operationId}`);
    const doc = await this.source(id);
    this.revision(doc, revision);
    try {
      assertCompetitionRegistration(doc, "onsite");
    } catch {
      return error(409, "ONSITE_CLOSED", "งานนี้ไม่เปิดลงทะเบียนหน้างานแล้ว");
    }
    const catalogs = config(doc).catalogs[data.level];
    let authoritativeAge: number;
    try {
      authoritativeAge = calculateRegistrationAge(
        doc,
        data.birthday,
        data.color,
      );
    } catch {
      return error(422, "INVALID_BIRTHDAY", "วันเกิดหรือวันตัดอายุไม่ถูกต้อง");
    }
    const allowed = [
      ...getPossibleEvents(authoritativeAge, catalogs),
      ...getSpecialEvents(catalogs, authoritativeAge),
    ].filter((label): label is string => !!label);
    if (
      !allowed.some(
        (label) => normalizeClassName(label) === normalizeClassName(data.type),
      )
    )
      return error(422, "INVALID_CLASS", "รุ่นแข่งขันไม่อยู่ในรายการของงาน");
    if (doc.competitionIndexedRevision !== doc._rev)
      return error(
        409,
        "REGISTRATION_INDEX_PENDING",
        "ข้อมูลผู้สมัครกำลังอัปเดต กรุณาลองลงทะเบียนอีกครั้ง",
      );
    const duplicates = await this.db.fetch<Array<{ level?: unknown }>>(
      '*[_type=="eventRegister" && event._ref==$id && microchip==$microchip]{level}',
      { id, microchip: data.microchip },
    );
    if (
      requiresLevelDuplicateOverride(doc.eventType, data.level, duplicates) &&
      !data.duplicateOverrideReason
    )
      return error(
        409,
        "DUPLICATE_MICROCHIP",
        "มีเลขไมโครชิพนี้แล้ว ต้องระบุเหตุผลการลงทะเบียนซ้ำ",
      );
    const registrationId = `competition-entry-${operationId}`;
    await this.db
      .transaction()
      .patch(id, (p) =>
        p
          .ifRevisionId(revision)
          .setIfMissing({
            competitionWriteFence: 0,
            competitionRegistrationCount: 0,
          })
          .inc({ competitionWriteFence: 1, competitionRegistrationCount: 1 }),
      )
      .create({
        _id: registrationId,
        _type: "eventRegister",
        ...data,
        type: normalizeClassName(
          allowed.find(
            (label) =>
              normalizeClassName(label) === normalizeClassName(data.type),
          )!,
        ),
        buffaloAge: authoritativeAge,
        level: data.level === "province" ? "จังหวัด" : "ประเทศ",
        event: ref(id),
        isAdminRegistration: true,
        registeredAt: new Date().toISOString(),
        competitionActor: "dashboard-shared",
      })
      .create({
        _id: `competition-approval-${operationId}`,
        _type: "approvment",
        event: ref(id),
        eventRegister: ref(registrationId),
        approvementResult: true,
        comment: "ลงทะเบียนหน้างาน",
        notificationState: "not-applicable",
        competitionActor: "dashboard-shared",
      })
      .create(this.operation(operationId, id, payload, "onsite"))
      .commit({ visibility: "sync" });
    return this.application(id, registrationId);
  }
  private async approvalEvent(id: string) {
    const event = await this.source(id);
    const policy = registrationPolicy({ eventType: event.eventType });
    if (policy.approvalRequirement === "not_required")
      return error(
        409,
        "APPROVAL_NOT_REQUIRED",
        "งานประเภท Normal ไม่ต้องอนุมัติใบสมัคร",
      );
    if (policy.approvalRequirement === "unknown")
      return error(
        422,
        "EVENT_TYPE_REQUIRED",
        "ข้อมูลย้อนหลังไม่ระบุประเภทงาน จึงดูผลเดิมได้อย่างเดียว",
      );
    return event;
  }
  async approval(
    id: string,
    registrationId: string,
    operationId: string,
    revision: string,
    result: boolean,
    comment: string,
  ) {
    const event = await this.approvalEvent(id);
    if (!result && !comment.trim())
      return error(
        422,
        "REJECTION_REASON_REQUIRED",
        "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
      );
    const payload = {
      action: "approval",
      id,
      registrationId,
      revision,
      result,
      comment,
    };
    const previous = await this.previous(operationId, payload);
    if (previous) return this.application(id, registrationId);
    const entry = await this.application(id, registrationId);
    if (entry._rev !== revision)
      return error(
        409,
        "REVISION_CONFLICT",
        "ใบสมัครเปลี่ยนแล้ว กรุณาโหลดใหม่",
      );
    const approval = entry.approval as Doc | undefined;
    const approvalId = approval?._id ?? `competition-approval-${operationId}`;
    const update = {
      approvementResult: result,
      comment,
      approvementDate: new Date().toISOString(),
      competitionActor: "dashboard-shared",
      notificationState: entry.applicant?.lineId ? "pending" : "not-applicable",
      notificationRetryKey: operationId,
      notificationFirstAttemptAt: null,
      notificationPayload: null,
      notificationAttemptId: null,
      notificationAttemptAt: null,
      notificationUpdatedAt: null,
    };
    let tx = this.db
      .transaction()
      .patch(id, (p) =>
        p
          .ifRevisionId(event._rev)
          .setIfMissing({ competitionWriteFence: 0 })
          .inc({ competitionWriteFence: 1 }),
      )
      .patch(registrationId, (p) =>
        p
          .ifRevisionId(revision)
          .setIfMissing({ competitionWriteFence: 0 })
          .inc({ competitionWriteFence: 1 }),
      );
    if (approval)
      tx = tx.patch(approvalId, (p) =>
        p.ifRevisionId(approval._rev).set(update),
      );
    else
      tx = tx.create({
        _id: approvalId,
        _type: "approvment",
        event: ref(id),
        eventRegister: ref(registrationId),
        ...update,
      });
    await tx
      .create(this.operation(operationId, id, payload, "approval"))
      .commit({ visibility: "sync" });
    return this.application(id, registrationId);
  }
  async retryNotification(
    id: string,
    registrationId: string,
    expectedApprovalRevision?: string,
  ) {
    const event = await this.approvalEvent(id);
    const entry = await this.application(id, registrationId);
    const approval = entry.approval as Doc | undefined;
    if (expectedApprovalRevision && approval?._rev !== expectedApprovalRevision)
      return error(
        409,
        "REVISION_CONFLICT",
        "ผลพิจารณาเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนส่ง LINE",
      );
    if (!approval || typeof approval.approvementResult !== "boolean")
      return error(409, "NO_APPROVAL", "ยังไม่มีผลพิจารณา");
    if (
      approval.notificationState === "sent" ||
      (!entry.applicant?.lineId && !approval.notificationPayload)
    )
      return entry;
    if (process.env.COMPETITION_LINE_NOTIFICATIONS_ENABLED !== "true")
      return error(
        503,
        "NOTIFICATION_DISABLED",
        "ยังไม่เปิดการส่ง LINE สำหรับหลังบ้านใหม่",
      );
    if (!z.string().uuid().safeParse(approval.notificationRetryKey).success)
      return error(
        409,
        "NOTIFICATION_REVIEW_REQUIRED",
        "ผลพิจารณาเดิมยังไม่มีรหัสส่ง LINE กรุณาบันทึกผลพิจารณาอีกครั้งก่อนส่ง",
      );
    const existingAttempt =
      approval.notificationFirstAttemptAt != null ||
      approval.notificationPayload != null;
    const firstAttemptAt = existingAttempt
      ? Date.parse(approval.notificationFirstAttemptAt)
      : Date.now();
    if (
      !Number.isFinite(firstAttemptAt) ||
      Date.now() - firstAttemptAt >= 24 * 60 * 60 * 1000 ||
      firstAttemptAt > Date.now()
    )
      return error(
        409,
        "NOTIFICATION_REVIEW_REQUIRED",
        "หมดช่วงส่ง LINE ซ้ำอย่างปลอดภัย กรุณาตรวจผลการส่งก่อนดำเนินการอีกครั้ง",
      );
    // A stable LINE retry key deduplicates delivery if the network fails after acceptance.
    const { messagingApi } = await import("@line/bot-sdk");
    const { royalApprovementMessageParser } = await import(
      "~/server/messaging/message-parser"
    );
    const payloadSchema = z.object({
      to: z.string().min(1),
      messages: z
        .array(z.object({ type: z.literal("text"), text: z.string().min(1) }))
        .length(1),
    });
    const payload = payloadSchema.safeParse(
      existingAttempt
        ? approval.notificationPayload
        : {
            to: entry.applicant?.lineId,
            messages: [
              {
                type: "text",
                text: royalApprovementMessageParser({
                  ownerName: entry.ownerName,
                  buffaloName: entry.name,
                  microchip: entry.microchip,
                  comment: approval.comment,
                  success: approval.approvementResult,
                  docId: approval._id,
                }),
              },
            ],
          },
    );
    if (!payload.success)
      return error(
        409,
        "NOTIFICATION_REVIEW_REQUIRED",
        "ข้อมูลส่ง LINE เดิมไม่ครบ กรุณาตรวจผลการส่งก่อนดำเนินการอีกครั้ง",
      );
    // Persist the immutable request before contacting LINE; stale claims fail before any send.
    const claims = await this.db
      .transaction()
      .patch(id, (p) =>
        p
          .ifRevisionId(event._rev)
          .setIfMissing({ competitionWriteFence: 0 })
          .inc({ competitionWriteFence: 1 }),
      )
      .patch(approval._id, (p) =>
        p.ifRevisionId(approval._rev).set({
          notificationFirstAttemptAt: new Date(firstAttemptAt).toISOString(),
          notificationPayload: payload.data,
          notificationAttemptId: randomUUID(),
          notificationAttemptAt: new Date().toISOString(),
        }),
      )
      .commit({ visibility: "sync", returnDocuments: true });
    const claimed = claims.find((doc) => doc._id === approval._id);
    if (!claimed)
      return error(
        409,
        "NOTIFICATION_REVIEW_REQUIRED",
        "ไม่พบหลักฐานการบันทึกคำขอส่ง LINE",
      );
    let notificationState: "sent" | "failed" = "sent";
    try {
      const line = new messagingApi.MessagingApiClient({
        channelAccessToken: process.env.oa_token ?? "",
      });
      await line.pushMessage(payload.data, approval.notificationRetryKey);
    } catch (cause) {
      // SDK8 HTTPError retains Axios response headers in originalError.response.
      // LINE409 acknowledges an accepted retry only with this response header.
      const rejected = cause as {
        statusCode?: number;
        originalError?: {
          response?: { status?: number; headers?: Record<string, unknown> };
        };
      } | null;
      const acceptedId =
        rejected?.originalError?.response?.headers?.[
          "x-line-accepted-request-id"
        ];
      const acceptedRetry =
        rejected?.statusCode === 409 &&
        rejected.originalError?.response?.status === 409 &&
        typeof acceptedId === "string" &&
        acceptedId.trim().length > 0;
      notificationState = acceptedRetry ? "sent" : "failed";
    }
    await this.db
      .patch(approval._id)
      .ifRevisionId(claimed._rev)
      .set({
        notificationState,
        notificationUpdatedAt: new Date().toISOString(),
      })
      .commit({ visibility: "sync" });
    return this.application(id, registrationId);
  }
}
