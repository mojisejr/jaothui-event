import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse, evaluate } from "groq-js";
import { type SanityClient } from "next-sanity";
import { TRPCError } from "@trpc/server";
const stubs = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock("~/server/sanity/client", () => ({ client: {} }));
vi.mock("~/server/services/line-auth.service", () => ({
  verifyApplicantAuthorization: stubs.verify,
}));
import {
  CompetitionApplicantCheckInService,
  applicantCheckInError,
} from "~/server/services/competition-applicant-checkin";
import { CompetitionAdminError } from "~/server/admin/competition-contract";

const event = {
  _id: "event",
  _type: "event",
  _rev: "e1",
  eventType: "royal",
  competitionState: "published",
  isActive: true,
  title: "งานทดสอบ",
  startAt: "2026-10-30",
  endAt: "2026-10-31",
};
const row = {
  _id: "entry",
  _type: "eventRegister",
  _rev: "r1",
  user: { _ref: "owner" },
  event: { _ref: "event" },
  name: "ควายทดสอบ",
  microchip: "00123",
  type: "รุ่น A",
  ownerTel: "phone-private-marker",
  address: "address-private-marker",
  notificationPayload: { to: "line-private-marker" },
};
const docs = () => [
  event,
  row,
  { ...row, _id: "foreign", user: { _ref: "another" } },
  {
    _id: "old",
    _type: "approvment",
    _rev: "a1",
    event: { _ref: "event" },
    eventRegister: { _ref: "entry" },
    approvementResult: false,
    approvementDate: "2026-10-28",
  },
  {
    _id: "new",
    _type: "approvment",
    _rev: "a2",
    event: { _ref: "event" },
    eventRegister: { _ref: "entry" },
    approvementResult: true,
    approvementDate: "2026-10-29",
  },
  {
    _id: "wrong-event",
    _type: "approvment",
    _rev: "a3",
    event: { _ref: "another-event" },
    eventRegister: { _ref: "entry" },
    approvementResult: false,
    approvementDate: "2099-01-01",
  },
];
function setup(seed: Record<string, any>[] = docs()) {
  const map = new Map(seed.map((d) => [d._id, d]));
  const fetch = vi.fn(async (query: string, params: Record<string, unknown>) =>
    (
      await evaluate(parse(query), { dataset: [...map.values()], params })
    ).get(),
  );
  const db = {
    fetch,
    getDocument: vi.fn(async (id: string) => map.get(id)),
    transaction: vi.fn(),
  };
  return {
    db,
    map,
    service: new CompetitionApplicantCheckInService(
      db as unknown as SanityClient,
    ),
  };
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-31T16:59:59Z"));
  stubs.verify
    .mockReset()
    .mockImplementation(async (auth: { idToken?: string }) => {
      if (auth.idToken !== "verified-fixture")
        throw new TRPCError({ code: "UNAUTHORIZED" });
      return "owner";
    });
});
afterEach(() => vi.useRealTimers());

describe("owned applicant status/history", () => {
  it("derives owner from verified credentials and reads latest event-scoped approval without exposing private fields", async () => {
    const m = setup();
    const rows = await m.service.history({ idToken: "verified-fixture" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      _id: "entry",
      registrationStatus: "accepted",
      approvementResult: true,
      qrAvailable: true,
      checkInStatus: "not_checked_in",
    });
    expect(m.db.fetch.mock.calls[0]?.[1]).toEqual({ owner: "owner" });
    const response = JSON.stringify(rows);
    for (const field of [
      "phone-private-marker",
      "address-private-marker",
      "line-private-marker",
      "user",
      "notificationPayload",
      "ownerTel",
    ])
      expect(response).not.toContain(field);
    expect(m.db.transaction).not.toHaveBeenCalled();
  });
  it("returns past entries for UI filtering and includes the entire final Bangkok day", async () => {
    const m = setup();
    expect(
      (await m.service.history({ idToken: "verified-fixture" }))[0]
        ?.checkInEligibility.eligible,
    ).toBe(true);
    vi.setSystemTime(new Date("2026-10-31T17:00:00Z"));
    const rows = await m.service.history({ idToken: "verified-fixture" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      qrAvailable: false,
      checkInEligibility: { eligible: false },
    });
  });
  it("does not discover data before verifying expired/missing/invalid credentials", async () => {
    const m = setup();
    for (const auth of [{}, { idToken: "expired-fixture" }])
      await expect(m.service.history(auth)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    expect(m.db.fetch).not.toHaveBeenCalled();
    expect(m.db.getDocument).not.toHaveBeenCalled();
  });
  it("rejects guessed other-user/onsite IDs and draft registrations before returning pass/status", async () => {
    const m = setup();
    await expect(
      m.service.status({ idToken: "verified-fixture" }, "foreign"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    m.map.set("onsite", { ...row, _id: "onsite", user: undefined });
    await expect(
      m.service.pass({ idToken: "verified-fixture" }, "onsite"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    m.map.set("event", { ...event, competitionState: "draft" });
    await expect(
      m.service.status({ idToken: "verified-fixture" }, "entry"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(m.db.transaction).not.toHaveBeenCalled();
  });
  it("status reflects current arrival and an undo without inventing a staff person", async () => {
    const m = setup();
    m.map.set("entry", {
      ...row,
      checkInStatus: "checked_in",
      checkedInAt: "2026-10-31T01:00:00Z",
      checkedInBy: "dashboard-shared",
    });
    expect(
      await m.service.status({ idToken: "verified-fixture" }, "entry"),
    ).toMatchObject({
      checkInStatus: "checked_in",
      checkedInBy: "dashboard-shared",
    });
    m.map.set("entry", {
      ...row,
      checkInStatus: "not_checked_in",
      checkedInAt: null,
      checkedInBy: null,
    });
    expect(
      await m.service.status({ idToken: "verified-fixture" }, "entry"),
    ).toMatchObject({ checkInStatus: "not_checked_in", checkedInAt: null });
  });
  it("approval revocation blocks issuing a new pass", async () => {
    const m = setup();
    m.map.set("new", { ...m.map.get("new"), approvementResult: false });
    await expect(
      m.service.pass({ idToken: "verified-fixture" }, "entry"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(m.db.transaction).not.toHaveBeenCalled();
  });
  it("maps safe source errors without leaking internal exceptions", () => {
    expect(() =>
      applicantCheckInError(
        new CompetitionAdminError(
          409,
          "CHECKIN_INDEX_PENDING",
          "กรุณาโหลดใหม่",
        ),
      ),
    ).toThrow("กรุณาโหลดใหม่");
    expect(() =>
      applicantCheckInError(new Error("private-internal-marker")),
    ).toThrow("โหลดข้อมูลรายงานตัวไม่สำเร็จ กรุณาลองใหม่");
  });
});
