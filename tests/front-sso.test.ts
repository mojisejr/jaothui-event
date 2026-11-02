import type { NextApiRequest, NextApiResponse } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { isApplicantEventId } from "~/lib/applicant-intent";
import {
  createTransaction,
  readTransaction,
  SSO_COOKIE,
  TRANSACTION_COOKIE,
  SSO_MODE_COOKIE,
  introspectSession,
  ssoConfig,
} from "~/server/services/front-sso.service";
import { resolveApplicantOwner } from "~/server/services/applicant-auth.service";
import start from "~/pages/api/auth/front/start";
import callback from "~/pages/api/auth/front/callback";
import session from "~/pages/api/auth/front/session";
import logout from "~/pages/api/auth/front/logout";
const mocks = vi.hoisted(() => ({ line: vi.fn() }));
vi.mock("~/server/services/line-auth.service", () => ({
  verifyApplicantAuthorization: mocks.line,
}));
const sessionToken = "s".repeat(43);
const account = {
  accountId: "account-a",
  lineId: "line-a",
  displayName: "Fixture",
  avatarUrl: null,
  email: null,
};
const data = () => ({
  account,
  expiresAt: new Date(Date.now() + 60000).toISOString(),
});
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
function request(overrides: Partial<NextApiRequest> = {}) {
  return {
    method: "GET",
    headers: {},
    query: {},
    cookies: {},
    ...overrides,
  } as NextApiRequest;
}
function response() {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  } as unknown as NextApiResponse & {
    setHeader: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    redirect: ReturnType<typeof vi.fn>;
  };
}
const write = () =>
  request({
    method: "POST",
    cookies: { [SSO_COOKIE]: sessionToken },
    headers: {
      origin: "http://127.0.0.1:3001",
      "x-jaothui-csrf": "1",
      "sec-fetch-site": "same-origin",
    },
  });
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("JAOTHUI_EVENT_SSO_ENABLED", "true");
  vi.stubEnv("JAOTHUI_FRONT_ORIGIN", "http://127.0.0.1:3000");
  vi.stubEnv("JAOTHUI_EVENT_ORIGIN", "http://127.0.0.1:3001");
  vi.stubEnv(
    "JAOTHUI_EVENT_SSO_CLIENT_SECRET",
    "synthetic-client-secret-".repeat(2),
  );
  vi.stubEnv(
    "JAOTHUI_EVENT_SSO_STATE_SECRET",
    "synthetic-state-secret-".repeat(2),
  );
  mocks.line.mockReset().mockResolvedValue("line-legacy");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Event signed transaction and callback v1", () => {
  it("shares the dotted published event ID contract without traversal or draft IDs", () => {
    expect(isApplicantEventId("event.0")).toBe(true);
    expect(isApplicantEventId("a".repeat(128))).toBe(true);
    for (const value of [
      "a".repeat(129),
      "drafts.event",
      "versions.event",
      "event..0",
      "../escape",
      "event?x=1",
    ])
      expect(isApplicantEventId(value)).toBe(false);
  });
  it("creates host-only signed transaction with exact PKCE-S256 and fixed callback exchange", async () => {
    const transaction = createTransaction("event-a"),
      url = new URL(transaction.url);
    const state = readTransaction(
      transaction.signed,
      url.searchParams.get("state"),
    );
    expect(url.origin + url.pathname).toBe(
      "http://127.0.0.1:3000/api/auth/event-sso/authorize",
    );
    expect(url.searchParams.get("code_challenge")).toBe(
      createHash("sha256").update(state.verifier).digest("base64url"),
    );
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const fetch = vi.fn().mockResolvedValue(
      reply({
        ok: true,
        data: { ...data(), sessionToken, eventId: "event-a" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const res = response();
    await callback(
      request({
        query: { state: state.state, code: "c".repeat(43) },
        cookies: { [TRANSACTION_COOKIE]: transaction.signed },
      }),
      res,
    );
    expect(JSON.parse(fetch.mock.calls[0]![1].body as string)).toEqual({
      code: "c".repeat(43),
      codeVerifier: state.verifier,
      redirectUri: "http://127.0.0.1:3001/api/auth/front/callback",
    });
    expect(res.redirect).toHaveBeenCalledWith(303, "/events/event-a");
    const cookies = res.setHeader.mock.calls.find(
      (row) => row[0] === "Set-Cookie",
    )?.[1] as string[];
    expect(cookies[0]).toContain(`Path=/; HttpOnly; SameSite=Lax`);
    expect(cookies.join(";")).not.toContain("Domain=");
    expect(cookies[1]).toContain("Max-Age=0");
    expect(cookies[2]).toContain(`${SSO_MODE_COOKIE}=front`);
    expect(cookies[2]).toContain("Max-Age=31536000");
  });
  it.each(["wrong-state", undefined, ["array"]])(
    "rejects mismatched/missing state before backchannel (%j)",
    async (state) => {
      const transaction = createTransaction("event-a");
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const res = response();
      await callback(
        request({
          query: { code: "c".repeat(43), state: state as string },
          cookies: { [TRANSACTION_COOKIE]: transaction.signed },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("rejects modified, expired and cross-event transaction results", async () => {
    const transaction = createTransaction("event-a"),
      url = new URL(transaction.url),
      state = url.searchParams.get("state");
    expect(() => readTransaction(transaction.signed + "x", state)).toThrow();
    const now = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 121000);
    expect(() => readTransaction(transaction.signed, state)).toThrow();
    now.mockRestore();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        reply({
          ok: true,
          data: { ...data(), sessionToken, eventId: "event-b" },
        }),
      ),
    );
    const res = response();
    await callback(
      request({
        query: { code: "c".repeat(43), state: state! },
        cookies: { [TRANSACTION_COOKIE]: transaction.signed },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.redirect).not.toHaveBeenCalled();
  });
  it("validates event IDs, rejects methods and does not create a privileged session on cross-site start", () => {
    const res = response();
    start(request({ query: { eventId: "../escape" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    const valid = response();
    start(
      request({
        query: { eventId: "event-a" },
        headers: { "sec-fetch-site": "cross-site" },
      }),
      valid,
    );
    expect(valid.redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining("/authorize?"),
    );
    const setCookie = valid.setHeader.mock.calls.find(
      (row) => row[0] === "Set-Cookie",
    )?.[1] as string;
    expect(setCookie).toContain(TRANSACTION_COOKIE);
    expect(setCookie).not.toContain(`${SSO_COOKIE}=`);
    const post = response();
    start(request({ method: "POST" }), post);
    expect(post.status).toHaveBeenCalledWith(405);
  });
});
describe("fresh applicant owner and session bootstrap", () => {
  it("SSO wins over supplied LINE credentials, verifies every request and rejects impersonation", async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(reply({ ok: true, data: data() })),
      );
    vi.stubGlobal("fetch", fetch);
    expect(
      await resolveApplicantOwner(write(), { idToken: "other-user" }, "line-a"),
    ).toBe("line-a");
    expect(await resolveApplicantOwner(write())).toBe("line-a");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(mocks.line).not.toHaveBeenCalled();
    await expect(
      resolveApplicantOwner(write(), {}, "line-b"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it.each([401, 403, 409, 503])(
    "never falls back on invalid/revoked/conflicting/unavailable SSO %s",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(reply({ ok: false }, status)),
      );
      await expect(
        resolveApplicantOwner(write(), { idToken: "valid-legacy" }),
      ).rejects.toMatchObject({
        code:
          status === 401
            ? "UNAUTHORIZED"
            : status === 403
              ? "FORBIDDEN"
              : status === 409
                ? "CONFLICT"
                : "INTERNAL_SERVER_ERROR",
      });
      const res = response();
      await session(write(), res);
      expect(res.status).toHaveBeenCalledWith(405);
      const read = response();
      await session(request({ cookies: { [SSO_COOKIE]: sessionToken } }), read);
      expect(read.status).toHaveBeenCalledWith(status);
      expect(read.setHeader).not.toHaveBeenCalledWith(
        "Set-Cookie",
        expect.anything(),
      );
      expect(mocks.line).not.toHaveBeenCalled();
    },
  );
  it("treats timeout/invalid upstream payload as unavailable without clearing cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("provider-secret")),
    );
    await expect(introspectSession(sessionToken)).rejects.toMatchObject({
      status: 503,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        reply({
          ok: true,
          data: { ...data(), account: { ...account, lineId: null } },
        }),
      ),
    );
    await expect(introspectSession(sessionToken)).rejects.toMatchObject({
      status: 503,
    });
  });
  it("rejects expiry and empty cookie without treating them as missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        reply({
          ok: true,
          data: { ...data(), expiresAt: new Date(0).toISOString() },
        }),
      ),
    );
    await expect(resolveApplicantOwner(write())).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      resolveApplicantOwner(request({ cookies: { [SSO_COOKIE]: "" } }), {
        idToken: "legacy",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.line).not.toHaveBeenCalled();
    const res = response();
    await session(request({ cookies: { [SSO_COOKIE]: "" } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
  it("requires same-origin and CSRF marker for every cookie-authenticated POST", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    for (const headers of [
      { origin: "https://evil.example", "x-jaothui-csrf": "1" },
      { origin: "http://127.0.0.1:3001" },
      {
        origin: "http://127.0.0.1:3001",
        "x-jaothui-csrf": "1",
        "sec-fetch-site": "cross-site",
      },
    ])
      await expect(
        resolveApplicantOwner({ ...write(), headers } as NextApiRequest),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps default-off and missing-config LIFF available without contacting Front", async () => {
    vi.stubEnv("JAOTHUI_EVENT_SSO_ENABLED", "false");
    vi.stubEnv("JAOTHUI_EVENT_SSO_CLIENT_SECRET", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const res = response();
    await session(request(), res);
    expect(res.json).toHaveBeenCalledWith({ mode: "liff", enabled: false });
    expect(ssoConfig()).toBeNull();
    expect(
      await resolveApplicantOwner(
        request({ headers: { "x-line-id-token": "legacy" } }),
      ),
    ).toBe("line-legacy");
    expect(mocks.line).toHaveBeenCalledWith({ idToken: "legacy" }, undefined);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("fails configured-on missing secrets closed and forbids non-loopback HTTP", () => {
    vi.stubEnv("JAOTHUI_EVENT_SSO_STATE_SECRET", "");
    expect(() => ssoConfig()).toThrow();
    vi.stubEnv("JAOTHUI_EVENT_SSO_STATE_SECRET", "s".repeat(32));
    vi.stubEnv("JAOTHUI_EVENT_ORIGIN", "http://evil.example");
    expect(() => ssoConfig()).toThrow();
  });
  it("naturally expired SSO cookie retains mode marker and cannot restore cached LIFF", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const req = request({ cookies: { [SSO_MODE_COOKIE]: "front" } });
    const res = response();
    await session(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ mode: "blocked" });
    await expect(
      resolveApplicantOwner(req, { idToken: "cached-other-identity" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.line).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns only applicant profile fields and marks responses private", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(reply({ ok: true, data: data() })),
    );
    const res = response();
    await session(request({ cookies: { [SSO_COOKIE]: sessionToken } }), res);
    expect(res.json).toHaveBeenCalledWith({
      mode: "sso",
      profile: {
        userId: "line-a",
        displayName: "Fixture",
        pictureUrl: undefined,
        email: undefined,
      },
    });
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  });
  it("logout revokes before clearing; outage preserves valid session; tombstone blocks old LIFF", async () => {
    const fetch = vi.fn().mockResolvedValue(reply({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    const res = response();
    await logout(write(), res);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/revoke"),
      expect.objectContaining({ body: JSON.stringify({ sessionToken }) }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(
      res.setHeader.mock.calls.find((row) => row[0] === "Set-Cookie")?.[1],
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${SSO_MODE_COOKIE}=front`),
        expect.stringContaining(`${SSO_COOKIE}=;`),
      ]),
    );
    fetch.mockResolvedValue(reply({}, 503));
    const failed = response();
    await logout(write(), failed);
    expect(failed.status).toHaveBeenCalledWith(503);
    expect(failed.setHeader).not.toHaveBeenCalledWith(
      "Set-Cookie",
      expect.anything(),
    );
    await expect(
      resolveApplicantOwner(request({ cookies: { [SSO_MODE_COOKIE]: "1" } }), {
        idToken: "old-legacy",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.line).not.toHaveBeenCalled();
  });
});
