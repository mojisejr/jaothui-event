import { beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import type { NextApiRequest, NextApiResponse } from "next";
import type { SanityClient } from "next-sanity";
import { evaluate, parse } from "groq-js";
vi.mock("~/server/sanity/client", () => ({ client: {} }));
import { applicantBridgeHandler } from "~/server/services/competition-applicant-bridge";
import { CompetitionApplicantCheckInService } from "~/server/services/competition-applicant-checkin";
const key = "a".repeat(32);
function exchange(body: unknown, auth = `Bearer ${key}`, method = "POST") {
  const req = Object.assign(
    Readable.from([
      Buffer.from(typeof body === "string" ? body : JSON.stringify(body)),
    ]),
    { method, headers: { authorization: auth } },
  ) as unknown as NextApiRequest;
  const result = {
    status: 0,
    body: null as any,
    headers: {} as Record<string, string>,
  };
  const res = {
    setHeader: (k: string, v: string) => {
      result.headers[k] = v;
    },
    status: (n: number) => {
      result.status = n;
      return res;
    },
    json: (b: unknown) => {
      result.body = b;
      return res;
    },
  } as unknown as NextApiResponse;
  return { req, res, result };
}
beforeEach(() => {
  process.env.JAOTHUI_COMPETITION_APPLICANT_BRIDGE_KEY = key;
});
describe("dedicated mobile applicant bridge", () => {
  it("authenticates before body/service access and rejects admin key", async () => {
    process.env.JAOTHUI_COMPETITION_ADMIN_API_KEY = "b".repeat(32);
    const history = vi.fn();
    const handler = applicantBridgeHandler({
      historyPageForOwner: history,
    } as unknown as CompetitionApplicantCheckInService);
    for (const auth of [
      "",
      `Bearer ${process.env.JAOTHUI_COMPETITION_ADMIN_API_KEY}`,
    ]) {
      const x = exchange({ action: "history", owner: "forged" }, auth);
      await handler(x.req, x.res);
      expect(x.result.status).toBe(401);
      expect(x.result.headers["Cache-Control"]).toBe("no-store");
    }
    expect(history).not.toHaveBeenCalled();
    delete process.env.JAOTHUI_COMPETITION_APPLICANT_BRIDGE_KEY;
    const x = exchange({});
    await handler(x.req, x.res);
    expect(x.result.status).toBe(503);
  });
  it("allows only history/status/pass and strict bounded input", async () => {
    const history = vi
      .fn()
      .mockResolvedValue({ items: [], nextCursor: null, eventNames: [] });
    const handler = applicantBridgeHandler({
      historyPageForOwner: history,
    } as unknown as CompetitionApplicantCheckInService);
    for (const body of [
      { action: "confirm", owner: "owner", registrationId: "entry" },
      { action: "history", owner: "owner", limit: 21 },
      { action: "history", owner: "owner", admin: true },
      "invalid",
    ]) {
      const x = exchange(body);
      await handler(x.req, x.res);
      expect(x.result.status).toBe(422);
    }
    const large = exchange("x".repeat(16385));
    await handler(large.req, large.res);
    expect(large.result.status).toBe(413);
    const get = exchange({}, undefined, "GET");
    await handler(get.req, get.res);
    expect(get.result.status).toBe(405);
    expect(history).not.toHaveBeenCalled();
    const ok = exchange({
      action: "history",
      owner: "owner",
      period: "active",
    });
    await handler(ok.req, ok.res);
    expect(ok.result.body).toMatchObject({
      ok: true,
      version: 1,
      data: { items: [] },
    });
    expect(history).toHaveBeenCalledWith("owner", {
      action: "history",
      owner: "owner",
      period: "active",
      limit: 20,
      q: "",
    });
  });
  it("delegates status and pass to owner-checked internals, never exposes generic admin operations", async () => {
    const status = vi
      .fn()
      .mockResolvedValue({ registrationStatus: "registered" });
    const pass = vi
      .fn()
      .mockResolvedValue({
        application: { registrationStatus: "registered" },
        qrUrl: "https://example.test/pass",
      });
    const handler = applicantBridgeHandler({
      statusForOwner: status,
      passForOwner: pass,
    } as unknown as CompetitionApplicantCheckInService);
    for (const action of ["status", "pass"]) {
      const x = exchange({ action, owner: "owner", registrationId: "entry" });
      await handler(x.req, x.res);
      expect(x.result.status).toBe(200);
    }
    expect(status).toHaveBeenCalledWith("owner", "entry");
    expect(pass).toHaveBeenCalledWith("owner", "entry");
  });
  it("does not leak unexpected internal exceptions", async () => {
    const handler = applicantBridgeHandler({
      statusForOwner: vi
        .fn()
        .mockRejectedValue(new Error("private secret marker")),
    } as unknown as CompetitionApplicantCheckInService);
    const x = exchange({
      action: "status",
      owner: "owner",
      registrationId: "entry",
    });
    await handler(x.req, x.res);
    expect(x.result.status).toBe(503);
    expect(JSON.stringify(x.result.body)).not.toContain(
      "private secret marker",
    );
  });
  it("pages before projection, preserves full event names and latest scoped approval, without N+1 reads", async () => {
    const e = {
      _id: "event",
      _type: "event",
      _rev: "e",
      title: "same*literal",
      eventType: "royal",
      competitionState: "published",
      startAt: "2099-01-01",
      endAt: "2099-01-02",
    };
    const row = {
      _type: "eventRegister",
      _rev: "r",
      user: { _ref: "owner" },
      event: { _ref: "event" },
      name: "A",
      _createdAt: "2026-10-31T00:00:00Z",
      level: "ประเทศ",
    };
    const dataset = [
      e,
      { ...row, _id: "a" },
      { ...row, _id: "b", level: "จังหวัด" },
      { ...row, _id: "foreign", user: { _ref: "another" } },
      {
        _id: "approval-old",
        _type: "approvment",
        event: { _ref: "event" },
        eventRegister: { _ref: "b" },
        approvementDate: "2026-10-01",
        approvementResult: false,
      },
      {
        _id: "approval-new",
        _type: "approvment",
        event: { _ref: "event" },
        eventRegister: { _ref: "b" },
        approvementDate: "2026-10-02",
        approvementResult: true,
      },
      {
        _id: "wrong-event",
        _type: "approvment",
        event: { _ref: "wrong" },
        eventRegister: { _ref: "b" },
        approvementDate: "2099-01-01",
        approvementResult: false,
      },
    ];
    const db = {
      fetch: vi.fn(async (q: string, params: Record<string, unknown>) =>
        (await evaluate(parse(q, { params }), { dataset, params })).get(),
      ),
      getDocument: vi.fn(),
    };
    const service = new CompetitionApplicantCheckInService(
      db as unknown as SanityClient,
    );
    const first = await service.historyPageForOwner("owner", {
      limit: 1,
      period: "active",
      q: "same*literal",
    });
    expect(first.items).toHaveLength(1);
    expect(first.items[0]).toMatchObject({
      _id: "b",
      registrationStatus: "accepted",
      qrAvailable: true,
      checkInEligibility: { eligible: false },
    });
    expect(first.eventNames).toEqual(["same*literal"]);
    expect(first.nextCursor).not.toBeNull();
    const next = await service.historyPageForOwner("owner", {
      limit: 1,
      period: "active",
      q: "same*literal",
      cursor: first.nextCursor!,
    });
    expect(next.items[0]?._id).toBe("a");
    expect(next.nextCursor).toBeNull();
    expect(db.fetch).toHaveBeenCalledTimes(4);
    expect(db.getDocument).not.toHaveBeenCalled();
    await expect(
      service.historyPageForOwner("owner", {
        limit: 1,
        period: "all",
        q: "",
        cursor: "broken",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
