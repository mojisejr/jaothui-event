import { describe, expect, it, vi } from "vitest";
import type { SanityClient } from "next-sanity";
vi.mock("~/server/sanity/client", () => ({ client: {} }));
import { CompetitionAdminService } from "~/server/admin/competition-service";
import { exportCatalogFingerprint } from "~/server/services/competition-export-presentation";
import type { ExportLayout } from "~/lib/competition-export-layout";

const OP = "11111111-1111-4111-8111-111111111111";
type Doc = Record<string, any> & { _id: string; _rev: string };
function fixture(
  options: {
    missingCounter?: boolean;
    count?: number;
    lag?: boolean;
    truncated?: boolean;
    fail?: boolean;
    afterSnapshot?: (docs: Map<string, Doc>) => void;
    commitRace?: (docs: Map<string, Doc>) => void;
  } = {},
) {
  const event: Doc = {
    _id: "event",
    _rev: "e1",
    _type: "event",
    title: "งานทดสอบ",
    eventType: "normal",
    competitionWriteFence: 0,
    ...(options.missingCounter
      ? {}
      : { competitionRegistrationCount: options.count ?? 1 }),
  };
  const catalog: Doc = {
    _id: "catalog",
    _rev: "c1",
    _type: "nationalEventType",
    event: { _ref: "event" },
    data: ["ลูกควาย"],
  };
  const registration: Doc = {
    _id: "row1",
    _rev: "r1",
    _type: "eventRegister",
    event: { _ref: "event" },
    type: "ลูกควาย",
    level: "ประเทศ",
    color: "black",
    sex: "male",
    buffaloAge: 0,
    name: "PRIVATE NAME",
    ownerTel: "PRIVATE PHONE",
  };
  const docs = new Map([event, catalog, registration].map((d) => [d._id, d]));
  let revision = 1;
  const source = (id: string) => ({
    ...docs.get(id)!,
    competitionIndexedRevision: options.lag ? "older" : docs.get(id)!._rev,
    catalogDocuments: [...docs.values()].filter(
      (d) =>
        ["nationalEventType", "provinceEventType"].includes(d._type) &&
        d.event?._ref === id,
    ),
    registrationCount: [...docs.values()].filter(
      (d) => d._type === "eventRegister" && d.event?._ref === id,
    ).length,
  });
  const db = {
    getDocument: vi.fn(async (id: string) =>
      structuredClone(docs.get(id) ?? null),
    ),
    fetch: vi.fn(async (query: string, params: Record<string, any> = {}) => {
      if (query.includes('"exportSnapshot"')) {
        const rows = [...docs.values()].filter(
          (d) => d._type === "eventRegister" && d.event?._ref === params.id,
        );
        const result = {
          exportSnapshot: true,
          _rev: options.lag ? "older" : docs.get(params.id)!._rev,
          recordCount: rows.length,
          records: options.truncated ? [] : structuredClone(rows),
        };
        options.afterSnapshot?.(docs);
        return result;
      }
      if (query.includes('"inventoryIds"'))
        return {
          inventoryIds: [...docs.values()]
            .filter((d) => d._type === "event")
            .map((d) => d._id)
            .sort(),
        };
      if (query.startsWith('*[_type=="event" && _id')) return source(params.id);
      throw new Error(query + JSON.stringify(params));
    }),
    transaction: vi.fn(() => {
      const operations: Array<(next: Map<string, Doc>) => void> = [];
      const tx = {
        patch: (id: string, build: any) => {
          let expected: string | undefined;
          let values: Record<string, unknown> = {};
          let increments: Record<string, number> = {};
          let defaults: Record<string, unknown> = {};
          const p = {
            ifRevisionId: (r: string) => {
              expected = r;
              return p;
            },
            set: (v: Record<string, unknown>) => {
              values = v;
              return p;
            },
            setIfMissing: (v: Record<string, unknown>) => {
              defaults = v;
              return p;
            },
            inc: (v: Record<string, number>) => {
              increments = v;
              return p;
            },
          };
          build(p);
          operations.push((next) => {
            const current = next.get(id);
            if (!current || current._rev !== expected)
              throw Object.assign(new Error("conflict"), { statusCode: 409 });
            const changed: Doc = {
              ...defaults,
              ...current,
              ...values,
              _rev: `new${++revision}`,
            };
            for (const [key, n] of Object.entries(increments))
              changed[key] = Number(changed[key]) + n;
            next.set(id, changed);
          });
          return tx;
        },
        create: (doc: Doc) => {
          operations.push((next) => {
            if (next.has(doc._id)) throw new Error("duplicate");
            next.set(doc._id, { ...doc, _rev: `new${++revision}` });
          });
          return tx;
        },
        commit: async () => {
          options.commitRace?.(docs);
          const next = new Map(docs);
          for (const op of operations) op(next);
          if (options.fail) throw new Error("injected failure");
          docs.clear();
          for (const [id, doc] of next) docs.set(id, doc);
          return {};
        },
      };
      return tx;
    }),
  };
  const service = new CompetitionAdminService(db as unknown as SanityClient);
  const layout: ExportLayout = {
    version: 1,
    reviewedCatalogFingerprint: exportCatalogFingerprint({
      national: ["ลูกควาย"],
      province: [],
    }),
    aliases: [],
    categories: [
      {
        id: "calf",
        level: "national",
        catalogValue: "ลูกควาย",
        registrationTypeValues: ["ลูกควาย"],
        posterNumber: "01",
        fullLabelTh: "รุ่นลูกควาย",
        shortLabelTh: "ลูกควาย",
        groups: [{ color: "black", sex: "male" }],
      },
    ],
  };
  return {
    service,
    docs,
    db,
    layout,
    body: () => ({
      operationId: OP,
      expectedRevision: docs.get("event")!._rev,
      expectedCatalogFingerprint: layout.reviewedCatalogFingerprint,
      layout,
    }),
  };
}

describe("source export metadata and coherent snapshots", () => {
  it("keeps missing-layout repair details available with a valid unsaved proposal and no PII in bindings", async () => {
    const m = fixture();
    const detail = await m.service.exportLayout("event");
    expect(detail.plan.state).toBe("missing-layout");
    expect(detail.proposedLayout.categories).toHaveLength(1);
    expect(detail.bindings).toEqual([
      {
        rawType: "ลูกควาย",
        level: "ประเทศ",
        color: "black",
        sex: "male",
        count: 1,
        catalogValue: "ลูกควาย",
      },
    ]);
    expect(JSON.stringify(detail)).not.toContain("PRIVATE");
    expect(m.db.transaction).not.toHaveBeenCalled();
  });
  it("previews without writes and blocks strict download until a reviewed layout is saved", async () => {
    const m = fixture();
    expect(
      await m.service.previewExportLayout("event", m.layout),
    ).toMatchObject({ persisted: false, plan: { state: "ready" } });
    await expect(m.service.export("event")).rejects.toMatchObject({
      code: "EXPORT_NOT_READY",
      details: {
        diagnostics: [expect.objectContaining({ code: "MISSING_LAYOUT" })],
      },
    });
    expect(m.db.transaction).not.toHaveBeenCalled();
  });
  it("atomically saves layout with one replay-safe audit without changing signup data or counts", async () => {
    const m = fixture();
    const originalCatalog = structuredClone(m.docs.get("catalog")!.data);
    const originalRow = structuredClone(m.docs.get("row1"));
    const request = m.body();
    const result = await m.service.saveExportLayout("event", request);
    expect(result.plan.state).toBe("ready");
    await m.service.saveExportLayout("event", request);
    expect(m.db.transaction).toHaveBeenCalledTimes(1);
    expect(m.docs.get("event")!.competitionRegistrationCount).toBe(1);
    expect(m.docs.get("catalog")!.data).toEqual(originalCatalog);
    expect(m.docs.get("row1")).toEqual(originalRow);
    const packet = await m.service.export("event");
    expect(packet.exportPlan.groups[0]?.registrationIds).toEqual(["row1"]);
    expect(packet.registrations[0]?.exportAge).toBe(0);
    const audits = [...m.docs.values()].filter(
      (d) => d._type === "competitionAdminOperation",
    );
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits)).not.toContain("PRIVATE");
    await expect(
      m.service.saveExportLayout("event", {
        ...request,
        layout: { ...m.layout, categories: [] },
      }),
    ).rejects.toMatchObject({ code: "OPERATION_REUSED" });
  });
  it("rejects stale event/catalog expectations and unresolved layouts without mutation", async () => {
    const m = fixture();
    await expect(
      m.service.saveExportLayout("event", {
        ...m.body(),
        expectedRevision: "old",
      }),
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    await expect(
      m.service.saveExportLayout("event", {
        ...m.body(),
        expectedCatalogFingerprint: "0".repeat(64),
      }),
    ).rejects.toMatchObject({ code: "EXPORT_CATALOG_CONFLICT" });
    await expect(
      m.service.saveExportLayout("event", {
        ...m.body(),
        layout: { ...m.layout, categories: [] },
      }),
    ).rejects.toMatchObject({ code: "EXPORT_LAYOUT_NOT_READY" });
    expect(m.db.transaction).not.toHaveBeenCalled();
  });
  it.each([{ lag: true }, { count: 2 }, { count: 0 }, { truncated: true }])(
    "rejects detectable index/count/truncation inconsistencies %j",
    async (options) => {
      await expect(
        fixture(options).service.exportLayout("event"),
      ).rejects.toMatchObject({ code: "EXPORT_SOURCE_PENDING" });
    },
  );
  it("supports legacy missing counters without inventing one and retains atomicity on write failure", async () => {
    const m = fixture({ missingCounter: true });
    await m.service.saveExportLayout("event", m.body());
    expect(m.docs.get("event")!.competitionRegistrationCount).toBeUndefined();
    const broken = fixture({ fail: true });
    await expect(
      broken.service.saveExportLayout("event", broken.body()),
    ).rejects.toThrow("injected failure");
    expect(broken.docs.get("event")!.exportLayout).toBeUndefined();
    expect(broken.docs.has(`competition-operation-${OP}`)).toBe(false);
  });
  it("invalidates saved layouts after catalog edits while leaving their history available for repair", async () => {
    const m = fixture();
    await m.service.saveExportLayout("event", m.body());
    m.docs.get("catalog")!.data.push("รุ่นใหม่");
    m.docs.get("catalog")!._rev = "c9";
    expect(
      (await m.service.exportLayout("event")).plan.diagnostics,
    ).toContainEqual(expect.objectContaining({ code: "STALE_CATALOG" }));
    await expect(m.service.export("event")).rejects.toMatchObject({
      code: "EXPORT_NOT_READY",
    });
  });
  it.each(["event", "catalog"])(
    "rejects a concurrent %s change during a snapshot",
    async (id) => {
      const m = fixture({
        afterSnapshot: (docs) => {
          docs.get(id)!._rev = "concurrent";
        },
      });
      await expect(m.service.exportLayout("event")).rejects.toMatchObject({
        code: "EXPORT_SOURCE_PENDING",
      });
      expect(m.db.transaction).not.toHaveBeenCalled();
    },
  );
  it.each(["event", "catalog"])(
    "fences a concurrent %s write atomically without a layout or audit",
    async (id) => {
      const m = fixture({
        commitRace: (docs) => {
          docs.get(id)!._rev = "concurrent";
        },
      });
      await expect(
        m.service.saveExportLayout("event", m.body()),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(m.docs.get("event")!.exportLayout).toBeUndefined();
      expect(m.docs.has(`competition-operation-${OP}`)).toBe(false);
    },
  );
  it("blocks a newly observed tuple after save instead of silently extending the layout", async () => {
    const m = fixture();
    await m.service.saveExportLayout("event", m.body());
    m.docs.set("row2", { ...m.docs.get("row1")!, _id: "row2", sex: "female" });
    m.docs.get("event")!.competitionRegistrationCount = 2;
    m.docs.get("event")!._rev = "new-registration";
    await expect(m.service.export("event")).rejects.toMatchObject({
      code: "EXPORT_NOT_READY",
      details: {
        diagnostics: [
          expect.objectContaining({ code: "UNMAPPED_REGISTRATION" }),
        ],
      },
    });
  });
  it("keeps proposals schema-valid while leaving untranslated classes and unknown tuples for explicit repair", async () => {
    const m = fixture();
    m.docs.get("catalog")!.data = ["English only", "ลูกควาย (Calf division)"];
    m.docs.get("row1")!.type = "English only";
    m.docs.get("row1")!.sex = "unexpected";
    const detail = await m.service.exportLayout("event");
    expect(detail.proposedLayout.categories).toHaveLength(1);
    expect(detail.proposedLayout.categories[0]!.fullLabelTh).toBe("ลูกควาย");
    const preview = await m.service.previewExportLayout(
      "event",
      detail.proposedLayout,
    );
    expect(preview.plan.state).toBe("needs-review");
    expect(JSON.stringify(detail.bindings)).not.toContain("PRIVATE");
  });
  it("proposes concise Thai Champion labels from known bilingual names without duplicating their meaning", async () => {
    const m = fixture();
    const names = [
      "ควายยอดเยี่ยม — Grand Champion รวมสี",
      "รองควายยอดเยี่ยม — Reserve Grand Champion รวมสี",
      "Grand Champion รวมสี",
      "Reserve Grand Champion รวมสี",
      "รุ่นควายยอดเยี่ยม (Grand Champion) รวมสี",
      "รุ่นรองควายยอดเยี่ยม (Reserve Grand Champion) รวมสี",
    ];
    m.docs.get("catalog")!.data = names;
    m.docs.get("row1")!.type = names[0];
    const detail = await m.service.exportLayout("event");
    expect(
      detail.proposedLayout.categories.map((category) => category.fullLabelTh),
    ).toEqual([
      "ควายยอดเยี่ยม รวมสี",
      "รองควายยอดเยี่ยม รวมสี",
      "ควายยอดเยี่ยม รวมสี",
      "รองควายยอดเยี่ยม รวมสี",
      "รุ่นควายยอดเยี่ยม รวมสี",
      "รุ่นรองควายยอดเยี่ยม รวมสี",
    ]);
    expect(
      detail.proposedLayout.categories.map((category) => category.catalogValue),
    ).toEqual(names);
  });
  it("does not infer a binding by matching empty normalized values of unsupported encodings", async () => {
    const m = fixture();
    m.docs.get("catalog")!.data = ["@jaothui/class:v2:one"];
    m.docs.get("row1")!.type = "@jaothui/class:v2:two";
    expect(
      (await m.service.exportLayout("event")).bindings[0]!.catalogValue,
    ).toBeUndefined();
  });
  it("pages through more than 100 events without duplicates and isolates pending-source counts as unknown", async () => {
    const m = fixture();
    for (let index = 0; index < 104; index++) {
      const id = `synthetic-${String(index).padStart(3, "0")}`;
      m.docs.set(id, {
        _id: id,
        _rev: "e1",
        _type: "event",
        title: "งานทดสอบ",
        competitionRegistrationCount: 0,
      });
    }
    const first = await m.service.exportReadiness({ page: 1, pageSize: 100 });
    const last = await m.service.exportReadiness({ page: 2, pageSize: 100 });
    const empty = await m.service.exportReadiness({ page: 3, pageSize: 100 });
    expect(first).toMatchObject({ total: 105, hasMore: true });
    expect(last).toMatchObject({ total: 105, hasMore: false });
    expect(last.items).toHaveLength(5);
    expect(empty.items).toEqual([]);
    expect(empty.hasMore).toBe(false);
    expect(
      new Set([...first.items, ...last.items].map((item) => item.eventId)).size,
    ).toBe(105);
    expect(JSON.stringify(first)).not.toContain("PRIVATE");
    expect(JSON.stringify(first)).not.toContain("registrationIds");
    const pending = await fixture({ count: 2 }).service.exportReadiness({});
    expect(pending.items[0]).toMatchObject({
      state: "needs-review",
      rowCount: null,
      catalogFingerprint: null,
      diagnostics: [
        { code: "EXPORT_SOURCE_PENDING", message: expect.any(String) },
      ],
    });
  });
});
