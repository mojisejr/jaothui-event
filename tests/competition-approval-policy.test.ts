import { afterEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import type { NextApiRequest, NextApiResponse } from "next";
const db = vi.hoisted(() => ({
  fetch: vi.fn(),
  getDocument: vi.fn(),
  transaction: vi.fn(),
  patch: vi.fn(),
}));
vi.mock("~/server/sanity/client", () => ({ client: db }));
import { registrationPolicy } from "~/server/services/competition-approval-policy";
import {
  applicationList,
  exportRegistration,
  normalizeApplication,
  toCompetitionDTO,
} from "~/server/admin/competition-service";
import handler from "~/pages/api/admin/competitions/[[...path]]";
const entry = (id: string, result?: boolean | null) => ({
  _id: id,
  _rev: "r1",
  event: { _ref: "event" },
  microchip: "001234567890123",
  buffaloAge: 0,
  approval:
    result === undefined
      ? null
      : {
          _id: "a",
          _rev: "a1",
          approvementResult: result,
          comment: "preserved",
        },
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("event-owned approval requirement and effective registration status", () => {
  it.each([undefined, null, true, false])(
    "Normal is registered without rewriting raw decision %s",
    (result) => {
      const original = entry("entry", result);
      const serialized = JSON.stringify(original);
      const value = normalizeApplication(original, { eventType: "normal" });
      expect(value).toMatchObject({
        registrationPolicyVersion: 1,
        approvalRequirement: "not_required",
        registrationStatus: "registered",
        microchip: "001234567890123",
        buffaloAge: 0,
      });
      expect(value.approval?.approvementResult ?? null).toBe(result ?? null);
      expect(value.approvalStatus).toBe(
        result === true
          ? "accepted"
          : result === false
            ? "rejected"
            : "pending",
      );
      expect(JSON.stringify(original)).toBe(serialized);
    },
  );
  it.each([
    [undefined, "pending"],
    [null, "pending"],
    [true, "accepted"],
    [false, "rejected"],
  ])("Royal preserves exact decision %s", (result, status) => {
    expect(
      registrationPolicy({ eventType: "royal" }, { approvementResult: result }),
    ).toMatchObject({
      registrationPolicyVersion: 1,
      approvalRequirement: "required",
      registrationStatus: status,
    });
  });
  it.each([undefined, "", "ROYAL", "legacy"])(
    "unknown event type %s is read-only policy, not inferred from accepted decision",
    (eventType) => {
      const value = normalizeApplication(entry("entry", true), { eventType });
      expect(value).toMatchObject({
        approvalRequirement: "unknown",
        registrationStatus: "needs_type_review",
        approvalStatus: "accepted",
        approval: { approvementResult: true, comment: "preserved" },
      });
    },
  );
  it("keeps raw filters/counts compatible while adding effective counts before effective pagination", () => {
    const rows = [
      entry("pending"),
      entry("accepted", true),
      entry("rejected", false),
    ];
    const normal = applicationList(
      rows,
      { registrationStatus: "registered", pageSize: 1, page: 2 },
      { eventType: "normal" },
    );
    expect(normal).toMatchObject({
      registrationPolicyVersion: 1,
      approvalRequirement: "not_required",
      total: 3,
      counts: { total: 3, pending: 1, accepted: 1, rejected: 1 },
      registrationCounts: {
        total: 3,
        registered: 3,
        pending: 0,
        accepted: 0,
        rejected: 0,
        needs_type_review: 0,
      },
    });
    expect(normal.items.map((row) => row._id)).toEqual(["accepted"]);
    expect(
      applicationList(rows, { status: "rejected" }, { eventType: "normal" })
        .items[0]?.approvalStatus,
    ).toBe("rejected");
    const royal = applicationList(
      rows,
      { registrationStatus: "accepted" },
      { eventType: "royal" },
    );
    expect(royal.total).toBe(1);
    expect(royal.registrationCounts).toEqual({
      total: 3,
      registered: 0,
      pending: 1,
      accepted: 1,
      rejected: 1,
      needs_type_review: 0,
    });
  });
  it("empty lists expose source capability and requirement without inventing rows", () => {
    expect(applicationList([], {}, { eventType: "normal" })).toMatchObject({
      registrationPolicyVersion: 1,
      approvalRequirement: "not_required",
      total: 0,
      registrationCounts: { total: 0, registered: 0 },
    });
  });
  it("export and detail share policy while retaining onsite approval, zero age and history", () => {
    const row = { ...entry("onsite", true), isAdminRegistration: true };
    for (const eventType of ["normal", "royal", undefined]) {
      const event = toCompetitionDTO({ _id: "event", _rev: "e1", eventType });
      const exported = exportRegistration(row, event);
      const detailed = normalizeApplication(row, event);
      expect(exported.registrationStatus).toBe(detailed.registrationStatus);
      expect(exported.approvalRequirement).toBe(detailed.approvalRequirement);
      expect(exported.approval).toEqual(detailed.approval);
      expect(exported).toMatchObject({
        exportAge: 0,
        ageSource: "stored",
        isAdminRegistration: true,
        approvalStatus: "accepted",
      });
    }
  });
});

describe("actual admin HTTP policy guard has no mutation or provider side effects", () => {
  it.each(["normal", undefined])(
    "denies approval and LINE retry for eventType %s",
    async (eventType) => {
      vi.stubEnv("JAOTHUI_COMPETITION_ADMIN_API_KEY", "a".repeat(32));
      vi.stubEnv("JAOTHUI_COMPETITION_ADMIN_WRITES_ENABLED", "true");
      vi.stubEnv("COMPETITION_LINE_NOTIFICATIONS_ENABLED", "true");
      const outbound = vi.fn(() => {
        throw new Error("Unexpected provider request");
      });
      vi.stubGlobal("fetch", outbound);
      db.fetch.mockResolvedValue(null);
      db.getDocument.mockResolvedValue({
        _id: "event",
        _rev: "e1",
        _type: "event",
        eventType,
      });
      for (const action of ["approval", "retry-notification"]) {
        const body = {
          operationId: "01234567-89ab-4cde-8fab-0123456789ab",
          expectedRevision: "r1",
          result: true,
          comment: "",
        };
        const req = Object.assign(
          Readable.from([Buffer.from(JSON.stringify(body))]),
          {
            query: { path: ["event", "applications", "entry", action] },
            method: "POST",
            headers: { authorization: `Bearer ${"a".repeat(32)}` },
          },
        ) as unknown as NextApiRequest;
        let status = 0;
        let payload: any;
        const response = {
          status(code: number) {
            status = code;
            return response;
          },
          json(value: unknown) {
            payload = value;
            return response;
          },
          setHeader() {},
        } as unknown as NextApiResponse;
        await handler(req, response);
        expect(status).toBe(eventType === "normal" ? 409 : 422);
        expect(payload.error.code).toBe(
          eventType === "normal"
            ? "APPROVAL_NOT_REQUIRED"
            : "EVENT_TYPE_REQUIRED",
        );
      }
      expect(db.transaction).not.toHaveBeenCalled();
      expect(db.patch).not.toHaveBeenCalled();
      expect(outbound).not.toHaveBeenCalled();
    },
  );
});
