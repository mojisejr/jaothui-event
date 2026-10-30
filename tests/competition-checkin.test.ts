import { afterEach, describe, expect, it, vi } from "vitest";
import { type SanityClient } from "next-sanity";
import { parse, evaluate } from "groq-js";
vi.mock("~/server/sanity/client", () => ({ client: {} }));
vi.mock("~/server/services/line-auth.service", () => ({
  verifyApplicantAuthorization: vi.fn(async () => "owner"),
}));
import { CompetitionApplicantCheckInService } from "~/server/services/competition-applicant-checkin";
import {
  checkInEligibility,
  checkInState,
} from "~/server/services/competition-checkin-policy";
import {
  changeCheckIn,
  checkInContext,
  type CheckInDocument,
} from "~/server/admin/competition-checkin";
import {
  issueCheckInToken,
  resolveCheckInToken,
} from "~/server/services/competition-checkin-token";

const NOW = new Date("2026-10-30T06:00:00Z");
const OP = "11111111-1111-4111-8111-111111111111";
const UNDO = "22222222-2222-4222-8222-222222222222";
const event = (extra: Record<string, unknown> = {}): CheckInDocument => ({
  _id: "event",
  _type: "event",
  _rev: "e1",
  eventType: "normal",
  competitionState: "published",
  isActive: true,
  startAt: "2026-10-30",
  endAt: "2026-10-31",
  registrationActive: false,
  ...extra,
});
const registration = (
  extra: Record<string, unknown> = {},
): CheckInDocument => ({
  _id: "entry",
  _type: "eventRegister",
  _rev: "r1",
  _createdAt: "2026-10-01T00:00:00Z",
  event: { _ref: "event" },
  ...extra,
});
const approval = (extra: Record<string, unknown> = {}): CheckInDocument => ({
  _id: "approval",
  _type: "approvment",
  _rev: "a1",
  event: { _ref: "event" },
  eventRegister: { _ref: "entry" },
  approvementResult: true,
  approvementDate: "2026-10-29T00:00:00Z",
  ...extra,
});

function memory(seed = [event(), registration()]) {
  const docs = new Map(seed.map((doc) => [doc._id, structuredClone(doc)]));
  let version = 0;
  const context = {
    beforeCommit: undefined as (() => void) | undefined,
    lag: false,
  };
  const db = {
    getDocument: async (id: string) => {
      const doc = docs.get(id);
      return doc ? structuredClone(doc) : undefined;
    },
    fetch: async (query: string, params: Record<string, unknown>) => {
      const result = await evaluate(parse(query), {
        dataset: [...docs.values()],
        params,
      });
      const value = await result.get();
      return context.lag && value && !Array.isArray(value)
        ? { ...value, _rev: "lagged-index" }
        : value;
    },
    transaction: () => {
      const operations: ((next: Map<string, CheckInDocument>) => void)[] = [];
      const tx = {
        create: (doc: any) => {
          operations.push((next) => {
            if (next.has(doc._id))
              throw Object.assign(new Error("exists"), { statusCode: 409 });
            next.set(doc._id, { ...doc, _rev: `v${++version}` });
          });
          return tx;
        },
        patch: (id: string, build: (p: any) => void) => {
          let rev = "";
          let set: Record<string, any> = {};
          let defaults: Record<string, any> = {};
          let inc: Record<string, number> = {};
          const p = {
            ifRevisionId: (v: string) => ((rev = v), p),
            set: (v: any) => ((set = { ...set, ...v }), p),
            setIfMissing: (v: any) => ((defaults = { ...defaults, ...v }), p),
            inc: (v: any) => ((inc = v), p),
          };
          build(p);
          operations.push((next) => {
            const old = next.get(id);
            if (!old || old._rev !== rev)
              throw Object.assign(new Error("revision conflict"), {
                statusCode: 409,
              });
            const doc: CheckInDocument = {
              ...defaults,
              ...old,
              ...set,
              _rev: `v${++version}`,
            };
            for (const [key, value] of Object.entries(inc)) doc[key] += value;
            next.set(id, doc);
          });
          return tx;
        },
        commit: async () => {
          context.beforeCommit?.();
          context.beforeCommit = undefined;
          const next = new Map(docs);
          for (const op of operations) op(next);
          docs.clear();
          for (const [key, value] of next) docs.set(key, value);
          return {};
        },
      };
      return tx;
    },
  };
  return { docs, context, db: db as unknown as SanityClient };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("arrival policy is separate from approval/signup", () => {
  it("accepts Normal registered or Royal accepted; blocks unknown, pending and rejected", () => {
    expect(
      checkInEligibility(event(), null, NOW).checkInEligibility.eligible,
    ).toBe(true);
    expect(
      checkInEligibility(event({ eventType: "royal" }), approval(), NOW)
        .checkInEligibility.eligible,
    ).toBe(true);
    for (const [type, result] of [
      [undefined, true],
      ["royal", undefined],
      ["royal", false],
    ] as const)
      expect(
        checkInEligibility(
          event({ eventType: type }),
          { approvementResult: result },
          NOW,
        ).checkInEligibility.eligible,
      ).toBe(false);
  });
  it("uses Bangkok inclusive event days, never registration deadline", () => {
    expect(
      checkInEligibility(event(), null, new Date("2026-10-29T16:59:59Z")),
    ).toMatchObject({
      checkInEligibility: { eligible: false },
      qrAvailable: true,
    });
    for (const at of ["2026-10-29T17:00:00Z", "2026-10-31T16:59:59Z"])
      expect(
        checkInEligibility(event(), null, new Date(at)).checkInEligibility
          .eligible,
      ).toBe(true);
    expect(
      checkInEligibility(event(), null, new Date("2026-10-31T17:00:00Z")),
    ).toMatchObject({
      checkInEligibility: { eligible: false },
      qrAvailable: false,
    });
    expect(
      checkInEligibility(
        event({ registrationDeadline: "2026-10-20" }),
        null,
        NOW,
      ).checkInEligibility.eligible,
    ).toBe(true);
  });
  it.each([
    { competitionState: "draft" },
    { competitionState: "closed" },
    { isActive: false },
    { startAt: undefined },
    { endAt: "2026-02-31" },
    { startAt: "2026-11-01" },
  ])("blocks unavailable or invalid dates %j", (extra) => {
    expect(
      checkInEligibility(event(extra), null, NOW).checkInEligibility.eligible,
    ).toBe(false);
  });
  it("never interprets onsite approval as arrival or invents an old timestamp", () => {
    expect(checkInState({})).toEqual({
      checkInVersion: 1,
      checkInStatus: "not_checked_in",
      checkedInAt: null,
      checkedInBy: null,
    });
    expect(
      checkInState({ checkInStatus: "checked_in", checkedInAt: "bad" })
        .checkInStatus,
    ).toBe("not_checked_in");
  });
});

describe("atomic staff check-in and correction", () => {
  const confirm = (m: ReturnType<typeof memory>, op = OP, rev = "r1") =>
    changeCheckIn(m.db, "event", "entry", op, rev, "confirm", "", NOW);
  it("confirms once, preserves approval/counts, and audit has scalar links only", async () => {
    const m = memory([
      event({ competitionRegistrationCount: 12 }),
      registration(),
      approval(),
    ]);
    await confirm(m);
    const stored = m.docs.get("entry")!;
    expect(checkInState(stored)).toMatchObject({
      checkInStatus: "checked_in",
      checkedInAt: NOW.toISOString(),
      checkedInBy: "dashboard-shared",
    });
    expect(m.docs.get("event")!.competitionRegistrationCount).toBe(12);
    expect(m.docs.get("approval")!.approvementResult).toBe(true);
    const audit = m.docs.get(`competition-operation-${OP}`)!;
    expect(audit).toMatchObject({
      action: "checkin-confirm",
      checkInAction: "confirm",
      eventId: "event",
      registrationId: "entry",
      actor: "dashboard-shared",
    });
    expect(JSON.stringify(audit)).not.toContain('"_ref"');
    const time = stored.checkedInAt;
    await confirm(m);
    await confirm(m, "33333333-3333-4333-8333-333333333333");
    expect(m.docs.get("entry")!.checkedInAt).toBe(time);
    expect([...m.docs.values()].filter((d) => d.checkInAction)).toHaveLength(1);
  });
  it("undo requires reason, preserves audit, and original operation retry cannot recheck-in", async () => {
    const m = memory();
    await confirm(m);
    const rev = m.docs.get("entry")!._rev;
    await expect(
      changeCheckIn(m.db, "event", "entry", UNDO, rev, "undo", "short", NOW),
    ).rejects.toMatchObject({ code: "CHECKIN_REASON_REQUIRED" });
    await changeCheckIn(
      m.db,
      "event",
      "entry",
      UNDO,
      rev,
      "undo",
      "ยืนยันผิดรุ่น จึงยกเลิกรายการ",
      new Date("2026-11-10T00:00:00Z"),
    );
    await confirm(m);
    expect(m.docs.get("entry")!.checkInStatus).toBe("not_checked_in");
    expect([...m.docs.values()].filter((d) => d.checkInAction)).toHaveLength(2);
    await expect(
      confirm(m, "33333333-3333-4333-8333-333333333333", "r1"),
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
  });
  it("fences concurrent event changes, registration deletion and direct approval changes", async () => {
    for (const target of ["event", "entry", "approval"]) {
      const m = memory([
        event({ eventType: "royal" }),
        registration(),
        approval(),
      ]);
      m.context.beforeCommit = () => {
        if (target === "entry") m.docs.delete(target);
        else m.docs.get(target)!._rev = "changed";
      };
      await expect(confirm(m)).rejects.toThrow("revision conflict");
      expect(m.docs.has(`competition-operation-${OP}`)).toBe(false);
    }
  });
  it("concurrent confirmation creates one arrival/audit and leaves other classes unchanged", async () => {
    const m = memory([
      event(),
      registration(),
      registration({ _id: "other", _rev: "other1" }),
    ]);
    const outcomes = await Promise.allSettled([confirm(m), confirm(m, UNDO)]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect([...m.docs.values()].filter((d) => d.checkInAction)).toHaveLength(1);
    expect(checkInState(m.docs.get("other")!).checkInStatus).toBe(
      "not_checked_in",
    );
  });
  it("refuses stale approval discovery and event-mismatched applications", async () => {
    const m = memory();
    m.context.lag = true;
    await expect(confirm(m)).rejects.toMatchObject({
      code: "CHECKIN_INDEX_PENDING",
    });
    m.context.lag = false;
    m.docs.get("entry")!.event = { _ref: "foreign" };
    await expect(confirm(m)).rejects.toMatchObject({
      code: "APPLICATION_NOT_FOUND",
    });
  });
  it("latest event-scoped approval is authoritative and approval revocation blocks arrival", async () => {
    const m = memory([
      event({ eventType: "royal" }),
      registration(),
      approval(),
      approval({
        _id: "newer",
        _rev: "new",
        approvementDate: "2026-10-30T00:00:00Z",
        approvementResult: false,
      }),
      approval({
        _id: "foreign",
        event: { _ref: "foreign" },
        approvementDate: "2099-01-01",
        approvementResult: true,
      }),
    ]);
    expect((await checkInContext(m.db, "event", "entry")).approval?._id).toBe(
      "newer",
    );
    await expect(confirm(m)).rejects.toMatchObject({
      code: "CHECKIN_NOT_ALLOWED",
    });
  });
});

describe("opaque hash-only QR tokens", () => {
  it("closes synthetic owned pass -> authenticated resolve -> explicit confirm -> owned status, per class", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.stubEnv(
      "CHECKIN_QR_SECRET",
      "test-secret-for-unit-tests-only-1234567890",
    );
    const m = memory([
      event(),
      registration({ user: { _ref: "owner" } }),
      registration({
        _id: "other",
        _rev: "other1",
        user: { _ref: "owner" },
        type: "รุ่น B",
      }),
    ]);
    const applicant = new CompetitionApplicantCheckInService(m.db);
    const auth = { idToken: "synthetic-verified-token" };
    const pass = await applicant.pass(auth, "entry");
    expect(pass.application).toMatchObject({
      _id: "entry",
      registrationStatus: "registered",
      checkInStatus: "not_checked_in",
    });
    const resolved = await resolveCheckInToken(
      m.db,
      pass.qrUrl.split("/").at(-1)!,
    );
    expect((await applicant.status(auth, "entry")).checkInStatus).toBe(
      "not_checked_in",
    );
    await changeCheckIn(
      m.db,
      resolved.eventId,
      resolved.registrationId,
      OP,
      m.docs.get("entry")!._rev,
      "confirm",
      "",
      NOW,
    );
    expect(await applicant.status(auth, "entry")).toMatchObject({
      checkInStatus: "checked_in",
      checkedInAt: NOW.toISOString(),
    });
    expect((await applicant.status(auth, "other")).checkInStatus).toBe(
      "not_checked_in",
    );
    const current = m.docs.get("entry")!._rev;
    await changeCheckIn(
      m.db,
      "event",
      "entry",
      UNDO,
      current,
      "undo",
      "เจ้าหน้าที่เลือกใบสมัครผิดรุ่น",
      NOW,
    );
    expect((await applicant.status(auth, "entry")).checkInStatus).toBe(
      "not_checked_in",
    );
  });

  it("issues deterministic per-class tokens, resolves read-only and never persists usable token", async () => {
    vi.stubEnv(
      "CHECKIN_QR_SECRET",
      "test-secret-for-unit-tests-only-1234567890",
    );
    const m = memory([
      event(),
      registration(),
      registration({ _id: "other", _rev: "o1" }),
    ]);
    const url = await issueCheckInToken(m.db, "event", m.docs.get("entry")!);
    const token = url.split("/").at(-1)!;
    expect(token).toMatch(/^v1\.[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify([...m.docs.values()])).not.toContain(token);
    expect(await issueCheckInToken(m.db, "event", m.docs.get("entry")!)).toBe(
      url,
    );
    expect(
      await issueCheckInToken(m.db, "event", m.docs.get("other")!),
    ).not.toBe(url);
    const before = JSON.stringify([...m.docs.values()]);
    expect(await resolveCheckInToken(m.db, token)).toEqual({
      checkInVersion: 1,
      eventId: "event",
      registrationId: "entry",
    });
    expect(JSON.stringify([...m.docs.values()])).toBe(before);
    expect(m.docs.get("entry")!.checkInStatus).toBeUndefined();
    expect(
      JSON.stringify(
        [...m.docs.values()].filter(
          (d) => d._type === "competitionCheckInToken",
        ),
      ),
    ).not.toContain('"_ref"');
  });
  it("rejects tampering, deleted/moved applications, generation changes and secret rotation", async () => {
    vi.stubEnv(
      "CHECKIN_QR_SECRET",
      "test-secret-for-unit-tests-only-1234567890",
    );
    const m = memory();
    const token = (await issueCheckInToken(m.db, "event", m.docs.get("entry")!))
      .split("/")
      .at(-1)!;
    await expect(
      resolveCheckInToken(m.db, `${token.slice(0, -1)}X`),
    ).rejects.toMatchObject({ code: "CHECKIN_TOKEN_INVALID" });
    vi.stubEnv("CHECKIN_QR_SECRET", "rotated-secret-for-unit-tests-1234567890");
    await expect(resolveCheckInToken(m.db, token)).rejects.toMatchObject({
      code: "CHECKIN_TOKEN_INVALID",
    });
    vi.stubEnv(
      "CHECKIN_QR_SECRET",
      "test-secret-for-unit-tests-only-1234567890",
    );
    m.docs.get("entry")!.checkInQrGeneration = 2;
    await expect(resolveCheckInToken(m.db, token)).rejects.toMatchObject({
      code: "CHECKIN_TOKEN_INVALID",
    });
    m.docs.delete("entry");
    await expect(resolveCheckInToken(m.db, token)).rejects.toMatchObject({
      code: "APPLICATION_NOT_FOUND",
    });
  });
  it("missing/short secret disables issuing without affecting policy reads", async () => {
    vi.stubEnv("CHECKIN_QR_SECRET", "");
    const m = memory();
    await expect(
      issueCheckInToken(m.db, "event", m.docs.get("entry")!),
    ).rejects.toMatchObject({ code: "CHECKIN_QR_UNAVAILABLE" });
    expect(
      checkInEligibility(event(), null, NOW).checkInEligibility.eligible,
    ).toBe(true);
  });
});
