import { Readable } from "node:stream";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  fetch: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("~/server/services/line-auth.service", () => ({
  verifyApplicantAuthorization: mocks.verify,
}));
vi.mock("~/server/sanity/client", () => ({
  client: { fetch: mocks.fetch, assets: { upload: mocks.upload } },
}));
import handler from "~/pages/api/competitions/applicant-image";
const event = {
  isActive: true,
  registrationActive: true,
  registrationStartAt: "2026-10-01",
  registrationDeadline: "2026-10-16",
  endAt: "2026-10-18",
};
async function request(body: Buffer, overrides: Partial<NextApiRequest> = {}) {
  const req = Object.assign(Readable.from([body]), {
    method: "POST",
    headers: { authorization: "Bearer token" },
    query: { eventId: "event" },
    ...overrides,
  }) as unknown as NextApiRequest;
  const res = {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  await handler(req, res as unknown as NextApiResponse);
  return res;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T00:00:00Z"));
  vi.clearAllMocks();
  mocks.verify.mockResolvedValue("applicant");
  mocks.fetch.mockResolvedValue(event);
  mocks.upload.mockResolvedValue({ _id: "asset" });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("production applicant image API", () => {
  it("SSO image ownership, CSRF and upstream503 are enforced before upload", async () => {
    vi.stubEnv("JAOTHUI_EVENT_SSO_ENABLED", "true");
    vi.stubEnv("JAOTHUI_FRONT_ORIGIN", "http://127.0.0.1:3000");
    vi.stubEnv("JAOTHUI_EVENT_ORIGIN", "http://127.0.0.1:3001");
    vi.stubEnv("JAOTHUI_EVENT_SSO_CLIENT_SECRET", "s".repeat(32));
    vi.stubEnv("JAOTHUI_EVENT_SSO_STATE_SECRET", "s".repeat(32));
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            expiresAt: new Date(Date.now() + 60000).toISOString(),
            account: {
              accountId: "account",
              lineId: "sso-owner",
              displayName: "Fixture",
              avatarUrl: null,
              email: null,
            },
          },
        }),
      });
    vi.stubGlobal("fetch", fetch);
    const overrides = {
      cookies: { jaothui_event_sso: "s".repeat(43) },
      headers: { origin: "http://127.0.0.1:3001", "x-jaothui-csrf": "1" },
    };
    const accepted = await request(Buffer.from([255, 216, 255, 0]), overrides);
    expect(accepted.status).toHaveBeenCalledWith(201);
    expect(mocks.upload).toHaveBeenCalledWith(
      "image",
      expect.any(Buffer),
      expect.objectContaining({
        source: {
          id: "competition:event:sso-owner",
          name: "competition-applicant",
        },
      }),
    );
    expect(mocks.verify).not.toHaveBeenCalled();
    mocks.upload.mockClear();
    fetch.mockResolvedValue({ ok: false, status: 503 });
    const failed = await request(Buffer.from([255, 216, 255, 0]), overrides);
    expect(failed.status).toHaveBeenCalledWith(503);
    expect(mocks.upload).not.toHaveBeenCalled();
    const crossSite = await request(Buffer.from([255, 216, 255, 0]), {
      ...overrides,
      headers: { ...overrides.headers, origin: "https://evil.example" },
    });
    expect(crossSite.status).toHaveBeenCalledWith(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("fails closed before upload for closed event", async () => {
    mocks.fetch.mockResolvedValue({ ...event, registrationActive: false });
    const res = await request(Buffer.from([255, 216, 255]));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("rejects malformed or oversized files before writing any asset", async () => {
    const malformed = await request(Buffer.from("not-image"));
    expect(malformed.status).toHaveBeenCalledWith(400);
    const large = await request(Buffer.alloc(4 * 1024 * 1024 + 1));
    expect(large.status).toHaveBeenCalledWith(413);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("binds accepted image ownership to verified subject and event", async () => {
    const res = await request(Buffer.from([255, 216, 255, 0]));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.upload).toHaveBeenCalledWith(
      "image",
      expect.any(Buffer),
      expect.objectContaining({
        source: {
          id: "competition:event:applicant",
          name: "competition-applicant",
        },
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ _id: "asset" });
  });
});
