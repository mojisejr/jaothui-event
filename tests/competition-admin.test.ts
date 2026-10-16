import { describe, expect, it, vi } from "vitest";
import { encodeCompetitionClass } from "~/lib/competition-classes";
import { type SanityClient } from "next-sanity";
vi.mock("~/server/sanity/client", () => ({ client: {} }));
import {
  CompetitionAdminService,
  validatePublish,
} from "~/server/admin/competition-service";
import { assertCompetitionBridgeAuth } from "~/server/admin/competition-auth";
import {
  competitionInputSchema,
  type CompetitionInput,
} from "~/server/admin/competition-contract";

type Document = Record<string, any> & { _id: string; _rev: string };
const operation = "01234567-89ab-4cde-8fab-0123456789ab";
const second = "11234567-89ab-4cde-8fab-0123456789ab";
const input: CompetitionInput = {
  title: "งานทดสอบ",
  description: "",
  location: "กรุงเทพ",
  startAt: "2099-01-20",
  endAt: "2099-01-21",
  registrationStartAt: "2020-01-01",
  registrationDeadline: "2099-01-19",
  buffaloAgeDeadline: "2099-01-20",
  eventType: "normal",
  imageAssetId: "image-cover-100x100-png",
  catalogs: { national: ["ไม่เกิน 12 เดือน", "[SP] รุ่นพิเศษ"], province: [] },
};
function memory() {
  const docs = new Map<string, Document>();
  docs.set(input.imageAssetId!, {
    _id: input.imageAssetId!,
    _rev: "asset",
    _type: "sanity.imageAsset",
  });
  let version = 0;
  let fail = false;
  let lagCount = false;
  let lagRevision = false;
  const source = (id: string) => {
    const doc = docs.get(id);
    return doc
      ? {
          ...doc,
          _rev: lagRevision ? "indexed-older-revision" : doc._rev,
          catalogDocuments: [...docs.values()].filter(
            (d) =>
              ["nationalEventType", "provinceEventType"].includes(d._type) &&
              d.event?._ref === id,
          ),
          registrationCount: lagCount
            ? 0
            : [...docs.values()].filter(
                (d) => d._type === "eventRegister" && d.event?._ref === id,
              ).length,
        }
      : null;
  };
  const db = {
    getDocument: async (id: string) => docs.get(id),
    fetch: async (query: string, params: any) => {
      if (query.startsWith('*[_type=="event" && _id')) return source(params.id);
      if (query.includes('count(*[_type=="eventRegister"'))
        return [...docs.values()].filter(
          (d) =>
            d._type === "eventRegister" &&
            d.event?._ref === params.id &&
            d.microchip === params.microchip,
        ).length;
      if (query.startsWith('*[_type=="eventRegister" && _id')) {
        const d = docs.get(params.registrationId);
        return d?.event?._ref === params.id ? d : null;
      }
      if (query.startsWith('*[_type=="eventRegister"'))
        return [...docs.values()].filter(
          (d) => d._type === "eventRegister" && d.event?._ref === params.id,
        );
      if (query.startsWith('*[_type=="event"'))
        return [...docs.values()]
          .filter((d) => d._type === "event")
          .map((d) => source(d._id));
      throw Error(query);
    },
    createIfNotExists: async (doc: any) => {
      if (!docs.has(doc._id))
        docs.set(doc._id, { ...doc, _rev: String(++version) });
      return docs.get(doc._id);
    },
    transaction: () => {
      const operations: ((next: Map<string, Document>) => void)[] = [];
      const tx = {
        create: (doc: any) => {
          operations.push((next) => {
            if (next.has(doc._id))
              throw Object.assign(Error("exists"), { statusCode: 409 });
            next.set(doc._id, { ...doc, _rev: String(++version) });
          });
          return tx;
        },
        patch: (id: string, builder: any) => {
          let revision: string | undefined;
          let set: Record<string, any> = {};
          let inc: Record<string, number> = {};
          let defaults: Record<string, any> = {};
          let unset: string[] = [];
          const p = {
            ifRevisionId: (rev: string) => {
              revision = rev;
              return p;
            },
            set: (values: any) => {
              set = values;
              return p;
            },
            inc: (values: any) => {
              inc = values;
              return p;
            },
            setIfMissing: (values: any) => {
              defaults = values;
              return p;
            },
            unset: (values: string[]) => {
              unset = values;
              return p;
            },
          };
          builder(p);
          operations.push((next) => {
            const doc = next.get(id);
            if (!doc || (revision && doc._rev !== revision))
              throw Object.assign(Error("revision"), { statusCode: 409 });
            const changed: Document = {
              ...defaults,
              ...doc,
              ...set,
              _rev: String(++version),
            };
            for (const [k, n] of Object.entries(inc))
              if (typeof changed[k] !== "number")
                throw Object.assign(Error(`Cannot increment absent ${k}`), {
                  statusCode: 400,
                });
              else changed[k] += n;
            for (const k of unset) delete changed[k];
            next.set(id, changed);
          });
          return tx;
        },
        commit: async () => {
          const next = new Map(docs);
          for (const op of operations) op(next);
          if (fail) throw Error("injected failure");
          docs.clear();
          for (const [k, v] of next) docs.set(k, v);
          return {};
        },
      };
      return tx;
    },
  };
  return {
    docs,
    service: new CompetitionAdminService(db as unknown as SanityClient),
    lag: () => {
      lagCount = true;
    },
    lagRevision: () => {
      lagRevision = true;
    },
    fail: () => {
      fail = true;
    },
  };
}
describe("competition admin protected authority", () => {
  it.each([undefined, "false", "TRUE"])(
    "keeps LINE delivery disabled unless explicitly enabled: %s",
    async (enabled) => {
      const prior = process.env.COMPETITION_LINE_NOTIFICATIONS_ENABLED;
      if (enabled === undefined)
        delete process.env.COMPETITION_LINE_NOTIFICATIONS_ENABLED;
      else process.env.COMPETITION_LINE_NOTIFICATIONS_ENABLED = enabled;
      const m = memory();
      vi.spyOn(m.service, "application").mockResolvedValue({
        _id: "entry",
        _rev: "entry-revision",
        applicant: { lineId: "synthetic-recipient" },
        approval: {
          _id: "approval",
          _rev: "approval-revision",
          approvementResult: true,
          notificationState: "pending",
        },
      });
      try {
        await expect(
          m.service.retryNotification("event", "entry"),
        ).rejects.toMatchObject({ code: "NOTIFICATION_DISABLED" });
        expect(m.docs.size).toBe(1);
      } finally {
        if (prior === undefined)
          delete process.env.COMPETITION_LINE_NOTIFICATIONS_ENABLED;
        else process.env.COMPETITION_LINE_NOTIFICATIONS_ENABLED = prior;
      }
    },
  );
  it("fails closed without configured bridge secret or invalid bearer", () => {
    expect(() => assertCompetitionBridgeAuth(undefined, undefined)).toThrow();
    expect(() =>
      assertCompetitionBridgeAuth("Bearer wrong", "a".repeat(32)),
    ).toThrow();
    expect(() =>
      assertCompetitionBridgeAuth("Bearer " + "a".repeat(32), "a".repeat(32)),
    ).not.toThrow();
  });
  it("rejects invalid calendar/order, duplicate catalog labels and applicant identity fields", () => {
    expect(() =>
      competitionInputSchema.parse({ ...input, endAt: "2026-02-30" }),
    ).toThrow();
    expect(() =>
      competitionInputSchema.parse({
        ...input,
        registrationDeadline: "2099-02-01",
      }),
    ).toThrow();
    expect(() =>
      competitionInputSchema.parse({
        ...input,
        catalogs: { national: ["same", "same"], province: [] },
      }),
    ).toThrow();
    expect(() =>
      competitionInputSchema.parse({ ...input, userId: "shared-admin" }),
    ).toThrow();
    expect(() =>
      validatePublish({ ...input, imageAssetId: undefined }),
    ).toThrow();
  });
  it("creates one draft and catalog atomically and retries without duplication", async () => {
    const m = memory();
    const first = await m.service.create(operation, input);
    expect(first.competitionState).toBe("draft");
    expect(first.policy.publicVisible).toBe(false);
    expect(first.catalogs).toEqual(input.catalogs);
    const again = await m.service.create(operation, input);
    expect(again._id).toBe(first._id);
    expect([...m.docs.values()].filter((d) => d._type === "event").length).toBe(
      1,
    );
    await expect(
      m.service.create(operation, { ...input, title: "different" }),
    ).rejects.toThrow("ถูกใช้กับข้อมูลอื่น");
  });
  it("initializes missing legacy counters before the first onsite increment", async () => {
    const m = memory();
    const draft = await m.service.create(operation, input);
    const legacy = m.docs.get(draft._id)!;
    delete legacy.competitionWriteFence;
    delete legacy.competitionRegistrationCount;
    const published = await m.service.action(
      draft._id,
      second,
      draft._rev,
      "publish",
    );
    expect(m.docs.get(draft._id)?.competitionWriteFence).toBe(1);
    await m.service.onsite(
      draft._id,
      "21234567-89ab-4cde-8fab-0123456789ab",
      published._rev,
      {
        name: "synthetic",
        birthday: "2098-01-20",
        color: "black",
        microchip: "synthetic-counter",
        ownerName: "synthetic",
        ownerTel: "000",
        type: "รุ่นพิเศษ",
        level: "national",
        sex: "male",
      },
    );
    expect(m.docs.get(draft._id)?.competitionRegistrationCount).toBe(1);
    expect(m.docs.get(draft._id)?.competitionWriteFence).toBe(2);
  });
  it("keeps event and catalog absent if a transaction fails", async () => {
    const m = memory();
    m.fail();
    await expect(m.service.create(operation, input)).rejects.toThrow(
      "injected",
    );
    expect(
      [...m.docs.values()].some(
        (d) => d._type === "event" || d._type === "nationalEventType",
      ),
    ).toBe(false);
  });
  it("rejects unknown image reference before any document writes", async () => {
    const m = memory();
    await expect(
      m.service.create(operation, { ...input, imageAssetId: "image-missing" }),
    ).rejects.toThrow("ไฟล์รูปปก");
    expect(
      [...m.docs.values()].filter((d) => d._type === "event"),
    ).toHaveLength(0);
  });
  it("copies only configuration with new catalog references and idempotent replay", async () => {
    const m = memory();
    const original = await m.service.create(operation, input);
    m.docs.set("entrant", {
      _id: "entrant",
      _rev: "1",
      _type: "eventRegister",
      event: { _ref: original._id },
      name: "existing",
    });
    const copy = await m.service.action(
      original._id,
      second,
      original._rev,
      "clone",
    );
    expect(copy.registrationCount).toBe(0);
    expect(copy.catalogs).toEqual(input.catalogs);
    const catalog = [...m.docs.values()].find(
      (d) => d.event?._ref === copy._id && d._type === "nationalEventType",
    );
    expect(catalog).toBeTruthy();
    expect(
      (await m.service.action(original._id, second, original._rev, "clone"))
        ._id,
    ).toBe(copy._id);
  });
  it("locks age/catalog after first application and rejects stale revision", async () => {
    const m = memory();
    const draft = await m.service.create(operation, input);
    m.docs.set("entry", {
      _id: "entry",
      _rev: "1",
      _type: "eventRegister",
      event: { _ref: draft._id },
      birthday: "2098-01-20",
      buffaloAge: 12,
      type: "ไม่เกิน 12 เดือน",
      level: "national",
    });
    await expect(
      m.service.update(draft._id, second, draft._rev, {
        ...input,
        buffaloAgeDeadline: "2099-01-21",
      }),
    ).rejects.toThrow("ตรวจผลกระทบ");
    await expect(
      m.service.update(draft._id, second, "old", input),
    ).rejects.toThrow("โหลดข้อมูลล่าสุด");
  });
  it("binds impact reports to event revision, exact proposed rules and catalog revisions", async () => {
    const m = memory();
    const draft = await m.service.create(operation, input);
    m.docs.set("entry", {
      _id: "entry",
      _rev: "1",
      _type: "eventRegister",
      event: { _ref: draft._id },
      birthday: "2098-01-20",
      buffaloAge: 12,
      type: "ไม่เกิน 12 เดือน",
      level: "national",
    });
    const changed = { ...input, buffaloAgeDeadline: "2099-01-21" };
    const report = await m.service.impact(draft._id, draft._rev, changed);
    expect(report.rows[0]).toMatchObject({
      oldAge: 12,
      newAge: 13,
      affected: true,
    });
    await expect(
      m.service.update(
        draft._id,
        second,
        draft._rev,
        { ...changed, buffaloAgeDeadline: "2099-01-22" },
        {
          reportId: report.reportId,
          reason: "reviewed externally",
          reviewReference: "Non approved ref",
        },
      ),
    ).rejects.toThrow("รายงานผลกระทบ");
    const saved = await m.service.update(
      draft._id,
      second,
      draft._rev,
      changed,
      {
        reportId: report.reportId,
        reason: "reviewed externally",
        reviewReference: "Non approved ref",
      },
    );
    expect(saved.buffaloAgeDeadline).toBe("2099-01-21");
    expect(m.docs.get("entry")?.buffaloAge).toBe(12);
  });
  it("requires extending an expired deadline before reopening", async () => {
    const m = memory();
    const past = {
      ...input,
      startAt: "2020-01-01",
      endAt: "2099-01-21",
      registrationStartAt: "2020-01-01",
      registrationDeadline: "2020-01-02",
    };
    const draft = await m.service.create(operation, past);
    const published = await m.service.action(
      draft._id,
      second,
      draft._rev,
      "publish",
    );
    await expect(
      m.service.action(
        published._id,
        "21234567-89ab-4cde-8fab-0123456789ab",
        published._rev,
        "open-registration",
      ),
    ).rejects.toThrow("ปรับช่วงรับสมัคร");
  });

  it("serializes concurrent state changes through the same event revision fence", async () => {
    const m = memory();
    const draft = await m.service.create(operation, input);
    const results = await Promise.allSettled([
      m.service.action(draft._id, second, draft._rev, "publish"),
      m.service.action(
        draft._id,
        "21234567-89ab-4cde-8fab-0123456789ab",
        draft._rev,
        "close-event",
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
  it("prevents mixed-event application reads", async () => {
    const m = memory();
    m.docs.set("entry", {
      _id: "entry",
      _rev: "1",
      _type: "eventRegister",
      event: { _ref: "another" },
    });
    await expect(m.service.application("target", "entry")).rejects.toThrow(
      "ไม่พบใบสมัครในงานนี้",
    );
  });
  it("resets the immutable notification attempt when a new approval decision is recorded", async () => {
    const m = memory();
    const approval = {
      _id: "approval",
      _rev: "approval-1",
      _type: "approvment",
      approvementResult: false,
      notificationRetryKey: operation,
      notificationFirstAttemptAt: "2026-10-15T00:00:00Z",
      notificationPayload: {
        to: "old-recipient",
        messages: [{ type: "text", text: "old-decision" }],
      },
      notificationAttemptId: "old-attempt",
      notificationState: "failed",
    };
    m.docs.set("approval", approval);
    m.docs.set("entry", {
      _id: "entry",
      _rev: "entry-1",
      _type: "eventRegister",
      event: { _ref: "event" },
      applicant: { lineId: "server-recipient" },
      approval,
    });
    await m.service.approval(
      "event",
      "entry",
      second,
      "entry-1",
      true,
      "updated decision",
    );
    expect(m.docs.get("approval")).toMatchObject({
      approvementResult: true,
      notificationState: "pending",
      notificationRetryKey: second,
      notificationFirstAttemptAt: null,
      notificationPayload: null,
      notificationAttemptId: null,
    });
  });
  it("locks rules using the strong event counter even while the registration index is empty", async () => {
    const m = memory();
    const draft = await m.service.create(operation, input);
    const stored = m.docs.get(draft._id)!;
    m.docs.set(draft._id, { ...stored, competitionRegistrationCount: 1 });
    m.lag();
    await expect(
      m.service.update(draft._id, second, draft._rev, {
        ...input,
        buffaloAgeDeadline: "2099-01-21",
      }),
    ).rejects.toThrow("ตรวจผลกระทบ");
  });
  it("rejects an impact snapshot when the query index is older than the authoritative event", async () => {
    const m = memory();
    const draft = await m.service.create(operation, input);
    m.lagRevision();
    await expect(
      m.service.impact(draft._id, draft._rev, input),
    ).rejects.toMatchObject({
      code: "REGISTRATION_INDEX_PENDING",
    });
    expect(
      [...m.docs.values()].filter((d) => d._type === "competitionImpactReport"),
    ).toHaveLength(0);
  });
  it("reports Thai province catalogs and recognizes stored SP labels with digits", async () => {
    const m = memory();
    const config = {
      ...input,
      catalogs: {
        national: ["ไม่เกิน 12 เดือน"],
        province: [
          encodeCompetitionClass({
            name: "รุ่นพิเศษ 15 เดือน",
            kind: "special",
            minMonths: 10,
            maxMonths: 15,
            minInclusive: true,
            group: "",
            criteria: "ตรวจโดยเจ้าหน้าที่",
          }),
        ],
      },
    };
    const draft = await m.service.create(operation, config);
    m.docs.set("entry", {
      _id: "entry",
      _rev: "1",
      _type: "eventRegister",
      event: { _ref: draft._id },
      birthday: "2098-01-20",
      color: "black",
      buffaloAge: 12,
      type: "รุ่นพิเศษ 15 เดือน",
      level: "จังหวัด",
    });
    const report = await m.service.impact(draft._id, draft._rev, config);
    expect(report.rows[0]).toMatchObject({
      special: true,
      oldEligible: true,
      newEligible: true,
      affected: false,
      oldExactAge: { months: 12, days: 0 },
    });
    expect(
      report.rows[0]?.oldPossibleClasses.filter(
        (label) => label === "[SP] รุ่นพิเศษ 15 เดือน",
      ),
    ).toHaveLength(1);
    expect(
      report.rows[0]?.newPossibleClasses.filter(
        (label) => label === "[SP] รุ่นพิเศษ 15 เดือน",
      ),
    ).toHaveLength(1);
  });
  it("uses Royal albino birthday adjustment in impact and stores onsite Thai level without a fake user", async () => {
    const m = memory();
    const config = { ...input, eventType: "royal" as const };
    const draft = await m.service.create(operation, config);
    m.docs.set("entry", {
      _id: "entry",
      _rev: "1",
      _type: "eventRegister",
      event: { _ref: draft._id },
      birthday: "2098-01-20",
      color: "white",
      buffaloAge: 13,
      type: "รุ่นพิเศษ",
      level: "ประเทศ",
    });
    const report = await m.service.impact(draft._id, draft._rev, config);
    expect(report.rows[0]).toMatchObject({
      oldAge: 13,
      newAge: 13,
      oldExactAge: { months: 12, days: 1 },
    });
    const published = await m.service.action(
      draft._id,
      second,
      draft._rev,
      "publish",
    );
    const onsite = await m.service.onsite(
      draft._id,
      "21234567-89ab-4cde-8fab-0123456789ab",
      published._rev,
      {
        name: "onsite",
        birthday: "2098-01-20",
        color: "white",
        microchip: "synthetic",
        ownerName: "synthetic",
        ownerTel: "000",
        type: "รุ่นพิเศษ",
        level: "national",
        sex: "male",
      },
    );
    expect(onsite).toMatchObject({
      buffaloAge: 13,
      level: "ประเทศ",
      competitionActor: "dashboard-shared",
    });
    expect(onsite.user).toBeUndefined();
    expect(m.docs.get(draft._id)?.competitionRegistrationCount).toBe(1);
  });
  it("enforces the same bounded special rule in impact and onsite writes", async () => {
    const m = memory();
    const encoded = encodeCompetitionClass({
      name: "ฟันแท้",
      kind: "special",
      minMonths: 13,
      maxMonths: 15,
      minInclusive: true,
      group: "",
      criteria: "ตรวจโดยเจ้าหน้าที่",
    });
    const config = {
      ...input,
      catalogs: { national: [encoded], province: [] },
    };
    let draft = await m.service.create(operation, config);
    draft = await m.service.action(draft._id, second, draft._rev, "publish");
    m.docs.set("entry", {
      _id: "entry",
      _rev: "1",
      _type: "eventRegister",
      event: { _ref: draft._id },
      birthday: "2098-01-20",
      color: "black",
      buffaloAge: 12,
      type: "ฟันแท้",
      level: "ประเทศ",
    });
    const report = await m.service.impact(draft._id, draft._rev, config);
    expect(report.rows[0]).toMatchObject({
      special: true,
      oldEligible: false,
      newEligible: false,
      affected: true,
    });
    const details = {
      name: "test",
      birthday: "2098-01-20",
      microchip: "special-test",
      ownerName: "test",
      ownerTel: "000",
      type: "ฟันแท้",
      level: "national",
      sex: "male",
      color: "black",
    };
    await expect(
      m.service.onsite(
        draft._id,
        "21234567-89ab-4cde-8fab-0123456789ab",
        draft._rev,
        details,
      ),
    ).rejects.toMatchObject({ code: "INVALID_CLASS" });
    const saved = await m.service.onsite(
      draft._id,
      "31234567-89ab-4cde-8fab-0123456789ab",
      draft._rev,
      { ...details, birthday: "2097-12-20" },
    );
    expect(saved).toMatchObject({ type: "ฟันแท้", buffaloAge: 13 });
  });
  it("preserves an unchanged ambiguous legacy catalog on general edits but validates modified catalogs", async () => {
    const m = memory();
    const draft = await m.service.create(operation, input);
    const catalogId = `${draft._id}-national`;
    const legacy = ["อายุประมาณ 12 เดือน"];
    m.docs.get(catalogId)!.data = legacy;
    const before = m.docs.get(catalogId)!._rev;
    const changed = {
      ...input,
      description: "รายละเอียดใหม่",
      catalogs: { national: legacy, province: [] },
    };
    const saved = await m.service.update(
      draft._id,
      second,
      draft._rev,
      changed,
    );
    expect(saved.catalogs.national).toEqual(legacy);
    expect(m.docs.get(catalogId)!._rev).toBe(before);
    await expect(
      m.service.update(
        saved._id,
        "21234567-89ab-4cde-8fab-0123456789ab",
        saved._rev,
        {
          ...changed,
          catalogs: { national: ["อายุประมาณ 15 เดือน"], province: [] },
        },
      ),
    ).rejects.toMatchObject({ code: "INVALID_CATALOG" });
  });
  it("does not turn an unpublished draft public through a close-event action", async () => {
    const m = memory();
    const draft = await m.service.create(operation, input);
    await expect(
      m.service.action(draft._id, second, draft._rev, "close-event"),
    ).rejects.toThrow("งานร่าง");
    expect((await m.service.detail(draft._id)).policy.publicVisible).toBe(
      false,
    );
  });
  it("locks form-type changes after applicants because Royal age rules differ", async () => {
    const m = memory();
    const draft = await m.service.create(operation, input);
    m.docs.set(draft._id, {
      ...m.docs.get(draft._id)!,
      competitionRegistrationCount: 1,
    });
    await expect(
      m.service.update(draft._id, second, draft._rev, {
        ...input,
        eventType: "royal",
      }),
    ).rejects.toThrow("ตรวจผลกระทบ");
    await expect(
      m.service.impact(draft._id, draft._rev, input),
    ).rejects.toThrow("ข้อมูลผู้สมัครกำลังอัปเดต");
  });
  it("returns composed filters and counts without public draft leakage", async () => {
    const m = memory();
    await m.service.create(operation, input);
    const result = await m.service.list({
      search: "งานทดสอบ",
      lifecycle: "draft",
      startFrom: "2099-01-01",
      startTo: "2099-01-31",
    });
    expect(result.total).toBe(1);
    expect(result.counts.draft).toBe(1);
    expect(result.items[0]?.policy.publicVisible).toBe(false);
    expect((await m.service.list({ startFrom: "2099-02-01" })).total).toBe(0);
  });
});
