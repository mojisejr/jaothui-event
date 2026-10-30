import { createHash } from "node:crypto";
import type { SanityClient } from "next-sanity";
import { z } from "zod";
import {
  exportLayoutSchema,
  type ExportLayout,
  type ExportDiagnostic,
} from "~/lib/competition-export-layout";
import {
  classDisplayName,
  normalizeClassName,
} from "~/lib/competition-classes";
import {
  compileCompetitionExport,
  exportCatalogFingerprint,
  resolveExportControlledValue,
} from "~/server/services/competition-export-presentation";
import {
  CompetitionAdminError,
  type CompetitionDTO,
} from "./competition-contract";
import {
  findOperation,
  operationDocument,
} from "./competition-registration-admin";
import type { exportRegistration } from "./competition-service";

type Doc = Record<string, any> & { _id: string; _rev: string };
type Registration = ReturnType<typeof exportRegistration>;
type Adapter = {
  source: (id: string) => Promise<Doc>;
  toEvent: (doc: Doc) => CompetitionDTO;
  registration: (row: Doc, event: CompetitionDTO) => Registration;
  approvalProjection: string;
};
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const exportLayoutSaveSchema = z
  .object({
    operationId: z.string().uuid(),
    expectedRevision: z.string().min(1),
    expectedCatalogFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    layout: exportLayoutSchema,
  })
  .strict();
const fail = (
  code: string,
  message: string,
  diagnostics?: ExportDiagnostic[],
): never => {
  throw new CompetitionAdminError(
    409,
    code,
    message,
    diagnostics ? { diagnostics } : undefined,
  );
};
const pending = (): never =>
  fail(
    "EXPORT_SOURCE_PENDING",
    "ข้อมูลต้นทางกำลังเปลี่ยนหรือจำนวนใบสมัครไม่ตรง กรุณาโหลดข้อมูลใหม่ หากยังไม่ตรงให้ตรวจนับใบสมัครก่อนส่งออก",
  );
const catalogState = (source: Doc) =>
  (source.catalogDocuments as Doc[]).map((d) => ({
    _id: d._id,
    _rev: d._rev,
    _type: d._type,
    data: d.data ?? [],
  }));
const thaiProposalLabel = (raw: string): string | null => {
  const display = (classDisplayName(raw) || raw)
    .replace(/^\[SP\]\s*/i, "")
    .replace(/\((?:Calf|Intermediate|Junior|Senior) division\)/gi, "")
    .replace(/Reserve Grand Champion/gi, "รองควายยอดเยี่ยม")
    .replace(/Grand Champion/gi, "ควายยอดเยี่ยม")
    .replace(/\s+/g, " ")
    .trim();
  return /[ก-๙]/.test(display) &&
    !/[a-z]/i.test(display) &&
    display.length <= 1000
    ? display
    : null;
};
export function remapExportLayoutDraft(
  value: unknown,
  targetId: string,
  catalogs: CompetitionDTO["catalogs"],
): ExportLayout | undefined {
  const parsed = exportLayoutSchema.safeParse(value);
  if (!parsed.success) return undefined;
  return {
    ...parsed.data,
    reviewedCatalogFingerprint: exportCatalogFingerprint(catalogs),
    categories: parsed.data.categories.map((category) => ({
      ...category,
      id: `category-${digest([targetId, category.id]).slice(0, 20)}`,
    })),
  };
}

/** Source-owned metadata operations. Reading/previewing never writes or repairs source data. */
export class CompetitionExportAdmin {
  constructor(
    private readonly db: SanityClient,
    private readonly adapter: Adapter,
  ) {}

  private async snapshot(id: string) {
    const source = await this.adapter.source(id);
    if (source.competitionIndexedRevision !== source._rev) pending();
    const catalogs = source.catalogDocuments as Doc[];
    if (
      ["nationalEventType", "provinceEventType"].some(
        (type) => catalogs.filter((doc) => doc._type === type).length > 1,
      )
    )
      fail(
        "DUPLICATE_CATALOG",
        "พบเอกสารชุดรุ่นซ้ำ กรุณาตรวจข้อมูลต้นทางก่อนจัดรูปแบบไฟล์",
      );
    // Count, event revision and complete rows describe ONE indexed query snapshot.
    const raw = await this.db.fetch<unknown>(
      `*[_type=="event" && _id==$id][0]{"exportSnapshot":true,_rev,"recordCount":count(*[_type=="eventRegister" && event._ref==$id]),"records":*[_type=="eventRegister" && event._ref==$id] | order(_createdAt asc,_id asc){...,"sex":coalesce(sex,gender),${this.adapter.approvalProjection}}}`,
      { id },
    );
    const parsed = z
      .object({
        _rev: z.string(),
        recordCount: z.number().int().nonnegative(),
        records: z.array(
          z.object({ _id: z.string(), _rev: z.string() }).passthrough(),
        ),
      })
      .safeParse(raw);
    if (!parsed.success) return pending();
    const snapshot = parsed.data;
    const counter = source.competitionRegistrationCount;
    if (
      snapshot._rev !== source._rev ||
      snapshot.records.length !== snapshot.recordCount ||
      (counter !== undefined &&
        (typeof counter !== "number" ||
          !Number.isInteger(counter) ||
          counter !== snapshot.recordCount))
    )
      pending();
    const after = await this.adapter.source(id);
    if (
      after._rev !== source._rev ||
      after.competitionIndexedRevision !== after._rev ||
      digest(catalogState(after)) !== digest(catalogState(source))
    )
      pending();
    const event = this.adapter.toEvent(source);
    const registrations = snapshot.records.map((row) =>
      this.adapter.registration(row, event),
    );
    return {
      source,
      event,
      registrations,
      rowCount: snapshot.recordCount,
      ageWarningCount: registrations.filter((row) => !!row.ageWarning).length,
    };
  }

  private bindings(event: CompetitionDTO, registrations: Registration[]) {
    const values = new Map<
      string,
      {
        rawType: string;
        level: string;
        color: string;
        sex: string;
        count: number;
        catalogValue?: string;
      }
    >();
    for (const row of registrations) {
      const key = JSON.stringify([row.rawType, row.level, row.color, row.sex]);
      const existing = values.get(key);
      if (existing) {
        existing.count++;
        continue;
      }
      const level = resolveExportControlledValue("level", row.level)?.key;
      const catalog =
        level === "national" || level === "province"
          ? event.catalogs[level]
          : [];
      const exact = catalog.filter((raw) => raw === row.rawType);
      const normalized = normalizeClassName(row.rawType);
      const matches = exact.length
        ? exact
        : normalized
          ? catalog.filter((raw) => normalizeClassName(raw) === normalized)
          : [];
      values.set(key, {
        rawType: row.rawType,
        level: row.level,
        color: row.color,
        sex: row.sex,
        count: 1,
        ...(matches.length === 1 ? { catalogValue: matches[0] } : {}),
      });
    }
    return [...values.values()];
  }

  private proposal(
    event: CompetitionDTO,
    registrations: Registration[],
    existing?: unknown,
  ): ExportLayout {
    const parsed = exportLayoutSchema.safeParse(existing);
    const fingerprint = exportCatalogFingerprint(event.catalogs);
    if (parsed.success)
      return { ...parsed.data, reviewedCatalogFingerprint: fingerprint };
    const layout: ExportLayout = {
      version: 1,
      reviewedCatalogFingerprint: fingerprint,
      categories: [],
      aliases: [],
    };
    const bindings = this.bindings(event, registrations);
    for (const level of ["national", "province"] as const) {
      for (const raw of event.catalogs[level]) {
        const label = thaiProposalLabel(raw);
        if (!label) continue;
        const matches = bindings.filter(
          (binding) =>
            binding.catalogValue === raw &&
            resolveExportControlledValue("level", binding.level)?.key === level,
        );
        const normalized = normalizeClassName(raw);
        const unique =
          event.catalogs[level].filter(
            (v) => normalizeClassName(v) === normalized,
          ).length === 1;
        const types = [
          ...new Set([
            raw,
            ...(unique && normalized ? [normalized] : []),
            ...matches.map((b) => b.rawType),
          ]),
        ].slice(0, 200);
        const colors = new Set(["black", "albino"]);
        for (const binding of matches) {
          const color = resolveExportControlledValue("color", binding.color);
          if (color) colors.add(color.key);
        }
        layout.categories.push({
          id: `category-${digest([event._id, level, raw, layout.categories.length]).slice(0, 20)}`,
          level,
          catalogValue: raw,
          registrationTypeValues: types,
          posterNumber: String(layout.categories.length + 1).padStart(2, "0"),
          fullLabelTh: label,
          shortLabelTh: label.slice(0, 100),
          groups: [...colors].flatMap((color) => [
            { color, sex: "male" },
            { color, sex: "female" },
          ]),
        });
      }
    }
    // Removed historical classes need explicit review in the UI, never an inferred binding.
    return exportLayoutSchema.parse(layout);
  }

  private detailFrom(
    snapshot: Awaited<ReturnType<CompetitionExportAdmin["snapshot"]>>,
  ) {
    const { source, event, registrations, rowCount, ageWarningCount } =
      snapshot;
    const saved = exportLayoutSchema.safeParse(source.exportLayout);
    const layout = saved.success ? saved.data : null;
    return {
      exportPresentationVersion: 1 as const,
      event,
      layout,
      proposedLayout: this.proposal(
        event,
        registrations,
        layout ?? source.exportLayoutDraft,
      ),
      plan: compileCompetitionExport({
        event,
        registrations,
        layout: source.exportLayout,
      }),
      bindings: this.bindings(event, registrations),
      rowCount,
      ageWarningCount,
    };
  }
  async detail(id: string) {
    return this.detailFrom(await this.snapshot(id));
  }
  async preview(id: string, layout: unknown) {
    const snapshot = await this.snapshot(id);
    return {
      exportPresentationVersion: 1 as const,
      plan: compileCompetitionExport({
        event: snapshot.event,
        registrations: snapshot.registrations,
        layout,
      }),
      rowCount: snapshot.rowCount,
      ageWarningCount: snapshot.ageWarningCount,
      persisted: false as const,
    };
  }
  async save(id: string, raw: unknown) {
    const input = exportLayoutSaveSchema.parse(raw);
    const payload = { action: "save-export-layout", id, ...input };
    const previous = await findOperation(this.db, input.operationId, payload);
    if (previous) return this.detail(id);
    const snapshot = await this.snapshot(id);
    if (snapshot.event._rev !== input.expectedRevision)
      fail(
        "REVISION_CONFLICT",
        "ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุด โดยเก็บรูปแบบที่กำลังแก้ไว้ก่อน",
      );
    if (
      exportCatalogFingerprint(snapshot.event.catalogs) !==
      input.expectedCatalogFingerprint
    )
      fail(
        "EXPORT_CATALOG_CONFLICT",
        "ชุดรุ่นเปลี่ยนแล้ว กรุณาตรวจการผูกรุ่นใหม่ก่อนบันทึก",
      );
    const plan = compileCompetitionExport({
      event: snapshot.event,
      registrations: snapshot.registrations,
      layout: input.layout,
    });
    if (plan.state !== "ready")
      fail(
        "EXPORT_LAYOUT_NOT_READY",
        "รูปแบบไฟล์ยังไม่ครบ กรุณาแก้รายการที่ระบุก่อนบันทึก",
        plan.diagnostics,
      );
    let tx = this.db
      .transaction()
      .patch(id, (patch) =>
        patch
          .ifRevisionId(input.expectedRevision)
          .set({
            exportLayout: input.layout,
            competitionActor: "dashboard-shared",
          })
          .setIfMissing({ competitionWriteFence: 0 })
          .inc({ competitionWriteFence: 1 }),
      );
    // Fence catalog-only concurrent edits; the semantic fingerprint ignores these revision-only writes.
    for (const catalog of snapshot.source.catalogDocuments as Doc[])
      tx = tx.patch(catalog._id, (patch) =>
        patch.ifRevisionId(catalog._rev).set({ data: catalog.data ?? [] }),
      );
    tx = tx.create({
      ...operationDocument(
        input.operationId,
        id,
        payload,
        "save-export-layout",
      ),
      before: snapshot.source.exportLayout ?? null,
      after: input.layout,
    });
    await tx.commit({ visibility: "sync" });
    return this.detail(id);
  }
  async export(id: string) {
    const snapshot = await this.snapshot(id);
    const exportPlan = compileCompetitionExport({
      event: snapshot.event,
      registrations: snapshot.registrations,
      layout: snapshot.source.exportLayout,
    });
    if (exportPlan.state !== "ready")
      fail(
        "EXPORT_NOT_READY",
        "ยังดาวน์โหลดไม่ได้ กรุณาจัดรูปแบบและแก้รายการที่ขาดก่อน",
        exportPlan.diagnostics,
      );
    return {
      event: snapshot.event,
      registrations: snapshot.registrations,
      rowCount: snapshot.rowCount,
      registrationPolicyVersion: 1 as const,
      exportPresentationVersion: 1 as const,
      exportPlan,
    };
  }
  async inventory(raw: unknown) {
    const input = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(raw);
    const result = await this.db.fetch<{ inventoryIds: string[] }>(
      `{"inventoryIds":*[_type=="event" && !(_id in path("drafts.**"))] | order(_id asc)._id}`,
    );
    const ids = result.inventoryIds;
    const start = (input.page - 1) * input.pageSize;
    const readItem = async (eventId: string) => {
      try {
        const detail = await this.detail(eventId);
        return {
          eventId,
          title: detail.event.title,
          state: detail.plan.state,
          rowCount: detail.rowCount,
          diagnostics: detail.plan.diagnostics.map(
            ({ code, message, path, categoryId }) => ({
              code,
              message,
              path,
              categoryId,
            }),
          ),
          eventRevision: detail.event._rev,
          catalogFingerprint: detail.plan.catalogFingerprint,
          layoutFingerprint: detail.plan.layoutFingerprint,
        };
      } catch (cause) {
        if (!(cause instanceof CompetitionAdminError)) throw cause;
        const event = await this.db.getDocument<Doc>(eventId);
        return {
          eventId,
          title: typeof event?.title === "string" ? event.title : "",
          state: "needs-review" as const,
          rowCount: null,
          diagnostics: [{ code: cause.code, message: cause.message }],
          eventRevision: event?._rev ?? "",
          catalogFingerprint: null,
          layoutFingerprint: null,
        };
      }
    };
    const selected = ids.slice(start, start + input.pageSize);
    const items: Array<Awaited<ReturnType<typeof readItem>>> = [];
    for (let offset = 0; offset < selected.length; offset += 8)
      items.push(
        ...(await Promise.all(
          selected.slice(offset, offset + 8).map(readItem),
        )),
      );
    return {
      exportPresentationVersion: 1 as const,
      items,
      total: ids.length,
      page: input.page,
      pageSize: input.pageSize,
      hasMore: start + items.length < ids.length,
    };
  }
}
