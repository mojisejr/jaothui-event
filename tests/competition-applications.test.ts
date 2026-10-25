import { afterEach, describe, expect, it, vi } from "vitest";
import { type SanityClient } from "next-sanity";
const metadata = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("~/server/sanity/client", () => ({ client: {} }));
vi.mock("~/server/services/metadata.service", () => ({
  getMetadataByMicrochipId: metadata.lookup,
}));
import {
  applicationList,
  CompetitionAdminService,
  exportRegistration,
  normalizeApplication,
  toCompetitionDTO,
} from "~/server/admin/competition-service";

const event = toCompetitionDTO({
  _id: "event",
  _rev: "event-1",
  _type: "event",
  buffaloAgeDeadline: "2026-10-16",
  eventType: "normal",
});
const entry = (id: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  _rev: `${id}-1`,
  event: { _ref: "event" },
  ...extra,
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  metadata.lookup.mockReset();
});

describe("application list and nullable detail contract", () => {
  it("keeps absent and null approval pending, never rejected, and normalizes nullable supplements", () => {
    for (const approval of [
      undefined,
      null,
      { _id: "approval", approvementResult: null },
    ]) {
      const result = normalizeApplication(
        entry("legacy", { name: null, gender: "female", approval }),
      );
      expect(result).toMatchObject({
        name: "",
        sex: "female",
        buffaloAge: null,
        approvalStatus: "pending",
        applicant: null,
        hasLineRecipient: false,
        images: [],
        address: null,
      });
    }
  });
  it("preserves a false decision, missing images, Thai address and source actor without inventing a user", () => {
    const result = normalizeApplication(
      entry("onsite", {
        isAdminRegistration: true,
        competitionActor: "dashboard-shared",
        approval: {
          _id: "approval",
          _rev: "a1",
          approvementResult: false,
          comment: "ไม่ครบ",
        },
        images: [
          { _id: "image", images: [{ imageTitle: "ด้านหน้า", url: null }] },
        ],
        address: { _id: "address", province: "สุรินทร์" },
      }),
    );
    expect(result.approvalStatus).toBe("rejected");
    expect(result.approval?.comment).toBe("ไม่ครบ");
    expect(result.images[0]?.images[0]).toEqual({
      imageTitle: "ด้านหน้า",
      url: null,
    });
    expect(result.address?.province).toBe("สุรินทร์");
    expect(result.user).toBeUndefined();
  });
  it("allows safe immutable-payload retries even if the profile lost its LINE link", () => {
    expect(
      normalizeApplication(
        entry("entry", {
          approval: { notificationPayload: { to: "original-recipient" } },
        }),
      ).hasLineRecipient,
    ).toBe(true);
  });
  it("marks a claim without a persisted result uncertain, independently from provider enablement", () => {
    vi.stubEnv("COMPETITION_LINE_NOTIFICATIONS_ENABLED", "false");
    const result = normalizeApplication(
      entry("entry", {
        applicant: { _id: "user", lineId: "synthetic" },
        approval: {
          notificationState: "failed",
          notificationAttemptAt: "2026-10-16T01:00:00Z",
          notificationUpdatedAt: "2026-10-16T00:00:00Z",
        },
      }),
    );
    expect(result.approval?.notificationState).toBe("uncertain");
    expect(result.hasLineRecipient).toBe(true);
    expect(result.deliveryEnabled).toBe(false);
  });
  it("composes all filters and computes status counts before selected status, with stable pagination", () => {
    const records = [
      entry("1", {
        name: "ควายทอง",
        microchip: "QA-1",
        type: "รุ่น 12",
        level: "ประเทศ",
        sex: "male",
        color: "black",
      }),
      entry("2", {
        name: "ควายทอง",
        microchip: "QA-2",
        type: "รุ่น 12",
        level: "national",
        sex: "MALE",
        color: "BLACK",
        approval: { approvementResult: true },
      }),
      entry("3", {
        name: "ควายทอง",
        microchip: "QA-3",
        type: "รุ่น 12",
        level: "ประเทศ",
        sex: "male",
        color: "black",
        approval: { approvementResult: false },
      }),
      entry("4", {
        name: "ควายเงิน",
        type: "รุ่น 15",
        level: "จังหวัด",
        sex: "female",
        color: "albino",
      }),
    ];
    const filtered = applicationList(records, {
      search: "ควายทอง",
      type: "รุ่น 12",
      level: "national",
      sex: "male",
      color: "black",
      status: "accepted",
      pageSize: 1,
    });
    expect(filtered.items.map((row) => row._id)).toEqual(["2"]);
    expect(filtered.total).toBe(1);
    expect(filtered.counts).toEqual({
      total: 3,
      pending: 1,
      accepted: 1,
      rejected: 1,
    });
    expect(filtered.facets.types).toEqual(["รุ่น 12", "รุ่น 15"]);
    expect(
      applicationList(records, { page: 2, pageSize: 2 }).items.map(
        (row) => row._id,
      ),
    ).toEqual(["3", "4"]);
    expect(applicationList(records, { search: "no match" })).toMatchObject({
      items: [],
      total: 0,
      counts: { total: 0, pending: 0, accepted: 0, rejected: 0 },
    });
  });
  it("rejects invalid filter/pagination values", () => {
    for (const query of [
      { status: "false" },
      { page: 0 },
      { pageSize: 101 },
      { level: "global" },
      { search: "x".repeat(301) },
    ])
      expect(() => applicationList([], query)).toThrow();
  });
  it("scopes detail by event and explicitly sorts latest approval and address", async () => {
    const fetch = vi.fn(
      async (query: string, params: { id: string; registrationId: string }) => {
        expect(query).toContain("event._ref==$id");
        expect(query).toContain(
          "order(coalesce(approvementDate,_updatedAt,_createdAt) desc,_id desc)[0]",
        );
        expect(query).toContain("order(_updatedAt desc,_id desc)[0]");
        return params.id === "event" ? entry(params.registrationId) : null;
      },
    );
    const service = new CompetitionAdminService({
      fetch,
    } as unknown as SanityClient);
    expect((await service.application("event", "entry")).approvalStatus).toBe(
      "pending",
    );
    await expect(
      service.application("another-event", "entry"),
    ).rejects.toMatchObject({ code: "APPLICATION_NOT_FOUND" });
  });
});

describe("authoritative export age", () => {
  it("preserves stored age and historical class even if cutoff/birthday no longer match", () => {
    const result = exportRegistration(
      entry("old", {
        buffaloAge: 28,
        birthday: "2025-10-16",
        type: "[SP] รุ่นเดิม",
      }),
      event,
    );
    expect(result).toMatchObject({
      buffaloAge: 28,
      exportAge: 28,
      ageSource: "stored",
      ageWarning: null,
      type: "รุ่นเดิม",
      event: { _ref: "event" },
    });
  });
  it("uses the source cutoff and ceiling months including Royal convention when stored age is missing", () => {
    const row = entry("missing", { birthday: "2025-10-16", color: "black" });
    expect(exportRegistration(row, event)).toMatchObject({
      exportAge: 12,
      ageSource: "cutoff",
      ageWarning: "calculated-from-cutoff",
    });
    expect(
      exportRegistration(
        { ...row, color: "albino" },
        { ...event, eventType: "royal" },
      ),
    ).toMatchObject({ exportAge: 13, ageSource: "cutoff" });
    expect(
      exportRegistration({ ...row, birthday: "2025-10-15" }, event).exportAge,
    ).toBe(13);
  });
  it("flags invalid/missing dates and invalid stored ages without falling back to today or signup deadline", () => {
    for (const birthday of [undefined, "2026-02-31", "2099-01-01"])
      expect(
        exportRegistration(entry("bad", { birthday, buffaloAge: -1 }), event),
      ).toMatchObject({
        exportAge: null,
        ageSource: "missing",
        ageWarning: "missing-or-invalid-age",
      });
    expect(
      exportRegistration(entry("missing", { birthday: "2025-10-16" }), {
        ...event,
        buffaloAgeDeadline: undefined,
        registrationDeadline: "2026-10-16",
      }),
    ).toMatchObject({ exportAge: null, ageSource: "missing" });
    expect(
      exportRegistration(entry("zero", { buffaloAge: 0 }), event),
    ).toMatchObject({ exportAge: 0, ageSource: "stored" });
  });
});

describe("event-scoped metadata authority", () => {
  const setup = () => {
    const fetch = vi.fn(
      async (_query: string, params: { id: string; microchip: string }) => {
        expect(params).toEqual({ id: "event", microchip: "synthetic-chip" });
        return [
          entry("duplicate", {
            name: "ควายทดสอบ",
            type: "รุ่นทดสอบ",
            ownerName: "ทีมทดสอบ",
          }),
        ];
      },
    );
    const service = new CompetitionAdminService({
      fetch,
    } as unknown as SanityClient);
    vi.spyOn(service, "source").mockResolvedValue({
      _id: "event",
      _rev: "event-1",
    });
    return service;
  };
  it("returns source metadata with UTC date-only birthday and event-local duplicate warnings", async () => {
    metadata.lookup.mockResolvedValue({
      name: "ควายทดสอบ",
      birthdate: Date.parse("2025-10-16T00:00:00Z") / 1000,
      sex: "FEMALE",
      color: "ALBINO",
      imageUri: "https://example.test/image.jpg",
      certify: { microchip: "synthetic-chip" },
    });
    const result = await setup().metadata("event", " synthetic-chip ");
    expect(result).toMatchObject({
      found: true,
      microchip: "synthetic-chip",
      metadata: {
        name: "ควายทดสอบ",
        birthday: "2025-10-16",
        sex: "female",
        color: "albino",
        fatherName: "",
        motherName: "",
      },
      duplicateCount: 1,
      duplicateRegistrations: [{ _id: "duplicate" }],
    });
    expect(metadata.lookup).toHaveBeenCalledWith("synthetic-chip", {
      throwOnError: true,
    });
  });
  it("bounds a hung registry lookup at eight seconds while preserving duplicate authority", async () => {
    vi.useFakeTimers();
    metadata.lookup.mockImplementation(() => new Promise(() => {}));
    const pending = setup().metadata("event", "synthetic-chip");
    await vi.dynamicImportSettled();
    expect(metadata.lookup).toHaveBeenCalledTimes(1);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(7999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toMatchObject({
      found: false,
      metadata: null,
      lookupUnavailable: true,
      lookupWarning: expect.any(String),
      duplicateCount: 1,
      duplicateRegistrations: [{ _id: "duplicate" }],
    });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("clears the registry timeout after a fast success or provider failure", async () => {
    vi.useFakeTimers();
    const service = setup();
    metadata.lookup.mockResolvedValue({ name: "", certify: { microchip: "" } });
    await service.metadata("event", "synthetic-chip");
    expect(vi.getTimerCount()).toBe(0);
    metadata.lookup.mockRejectedValue(new Error("synthetic registry failure"));
    await service.metadata("event", "synthetic-chip");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("distinguishes empty lookup from provider failure and invalid input", async () => {
    const service = setup();
    metadata.lookup.mockResolvedValue({ name: "", certify: { microchip: "" } });
    expect(await service.metadata("event", "synthetic-chip")).toMatchObject({
      found: false,
      metadata: null,
      duplicateCount: 1,
    });
    metadata.lookup.mockRejectedValue(new Error("synthetic provider down"));
    expect(await service.metadata("event", "synthetic-chip")).toMatchObject({
      found: false,
      metadata: null,
      lookupUnavailable: true,
      lookupWarning: expect.any(String),
      duplicateCount: 1,
    });
    await expect(service.metadata("event", "")).rejects.toThrow();
  });
});

describe("export reads the same event-fenced latest approval as application readers", () => {
  it("joins accepted/rejected/pending decisions, resolves latest and tied approvals, and preserves export ages", async () => {
    // Execute the actual service GROQ against an isolated document dataset.
    const { parse, evaluate } = await import("groq-js");
    const documents = [
      {
        ...entry("accepted", { buffaloAge: 0, birthday: "2025-10-16" }),
        _type: "eventRegister",
        _createdAt: "2026-10-20T00:00:00Z",
      },
      {
        ...entry("rejected", { birthday: "2025-10-15" }),
        _type: "eventRegister",
        _createdAt: "2026-10-21T00:00:00Z",
      },
      {
        ...entry("pending"),
        _type: "eventRegister",
        _createdAt: "2026-10-22T00:00:00Z",
      },
      {
        ...entry("wrong-event", { event: { _ref: "other-event" } }),
        _type: "eventRegister",
        _createdAt: "2026-10-23T00:00:00Z",
      },
      {
        _id: "accepted-old",
        _type: "approvment",
        event: { _ref: "event" },
        eventRegister: { _ref: "accepted" },
        approvementResult: false,
        approvementDate: "2026-10-24T00:00:00Z",
      },
      {
        _id: "accepted-new",
        _type: "approvment",
        event: { _ref: "event" },
        eventRegister: { _ref: "accepted" },
        approvementResult: true,
        approvementDate: "2026-10-25T00:00:00Z",
      },
      {
        _id: "rejected-a",
        _type: "approvment",
        event: { _ref: "event" },
        eventRegister: { _ref: "rejected" },
        approvementResult: true,
        _updatedAt: "2026-10-25T00:00:00Z",
      },
      {
        _id: "rejected-z",
        _type: "approvment",
        event: { _ref: "event" },
        eventRegister: { _ref: "rejected" },
        approvementResult: false,
        _updatedAt: "2026-10-25T00:00:00Z",
      },
      {
        _id: "foreign-rejected-newer",
        _type: "approvment",
        event: { _ref: "other-event" },
        eventRegister: { _ref: "accepted" },
        approvementResult: false,
        approvementDate: "2026-10-26T00:00:00Z",
      },
      {
        _id: "foreign-pending",
        _type: "approvment",
        event: { _ref: "other-event" },
        eventRegister: { _ref: "pending" },
        approvementResult: true,
        approvementDate: "2026-10-26T00:00:00Z",
      },
    ];
    const fetch = vi.fn(
      async (query: string, params: Record<string, unknown>) => {
        const result = await evaluate(parse(query), {
          dataset: documents,
          params,
        });
        return result.get() as Promise<unknown>;
      },
    );
    const service = new CompetitionAdminService({
      fetch,
    } as unknown as SanityClient);
    vi.spyOn(service, "detail").mockResolvedValue(event);
    vi.spyOn(service, "source").mockResolvedValue({
      _id: "event",
      _rev: "event-1",
    });
    const exported = await service.export("event");
    expect(exported.rowCount).toBe(3);
    expect(
      exported.registrations.map((row) => [
        row._id,
        row.approvalStatus,
        row.approval?._id,
      ]),
    ).toEqual([
      ["accepted", "accepted", "accepted-new"],
      ["rejected", "rejected", "rejected-z"],
      ["pending", "pending", undefined],
    ]);
    const listed = await service.applications("event", {});
    for (const row of exported.registrations) {
      expect(row.approvalStatus).toBe(
        listed.items.find((item) => item._id === row._id)?.approvalStatus,
      );
      expect((await service.application("event", row._id)).approvalStatus).toBe(
        row.approvalStatus,
      );
    }
    expect(exported.registrations[0]).toMatchObject({
      exportAge: 0,
      ageSource: "stored",
    });
    expect(exported.registrations[1]).toMatchObject({
      exportAge: 13,
      ageSource: "cutoff",
    });
    expect(exported.registrations[2]).toMatchObject({
      exportAge: null,
      ageSource: "missing",
    });
    expect(exported.event.buffaloAgeDeadline).toBe("2026-10-16");
  });
});
