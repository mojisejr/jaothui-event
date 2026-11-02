// @vitest-environment jsdom
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  profile: vi.fn(),
  loggedIn: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  replace: vi.fn(),
  route: { pathname: "/events/[eventId]", query: { eventId: "event-a" } },
  setTransport: vi.fn(),
}));
vi.mock("@line/liff", () => ({
  default: {
    init: mocks.init,
    getProfile: mocks.profile,
    isLoggedIn: mocks.loggedIn,
    login: mocks.login,
    logout: mocks.logout,
    getDecodedIDToken: () => ({ email: "fixture@example.invalid" }),
    getIDToken: () => "synthetic-token",
    getAccessToken: () => null,
  },
}));
vi.mock("next/router", () => ({
  useRouter: () => ({ ...mocks.route, replace: mocks.replace }),
}));
vi.mock("~/utils/applicant-auth", () => ({
  setApplicantTransport: mocks.setTransport,
}));
import { LineProvider, useLine } from "~/context/lineContext";
function Probe() {
  const line = useLine();
  return React.createElement(
    "div",
    null,
    `${line.authMode}:${line.authReady}:${line.loggedIn}:${line.profile?.userId ?? "none"}:${!!line.liff}`,
    React.createElement("button", { onClick: line.logout }, "logout"),
  );
}
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.route.pathname = "/events/[eventId]";
  mocks.init.mockResolvedValue(undefined);
  mocks.loggedIn.mockReturnValue(true);
  mocks.profile.mockResolvedValue({
    userId: "line-legacy",
    displayName: "Legacy",
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
const render = async () =>
  act(async () => {
    root.render(
      React.createElement(LineProvider, null, React.createElement(Probe)),
    );
  });
describe("SSO-first bootstrap preserves applicant intent", () => {
  it("keeps same event, gives trusted profile and never fabricates or initializes LIFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          mode: "sso",
          returnToFront: "/api/auth/front/return",
          profile: { userId: "line-a", displayName: "SSO" },
        }),
      }),
    );
    await render();
    expect(host.textContent).toContain("sso:true:true:line-a:false");
    expect(mocks.init).not.toHaveBeenCalled();
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.setTransport).toHaveBeenCalledWith("sso");
    const link = host.querySelector<HTMLAnchorElement>(
      'a[href="/api/auth/front/return"]',
    );
    expect(link?.textContent).toBe("กลับเว็บไซต์เจ้าทุย");
    expect(link?.getAttribute("target")).toBeNull();
    expect(link?.className).toContain("min-h-[44px]");
  });
  it.each([401, 409, 503])(
    "invalid/revoked/unavailable SSO %s never starts old LIFF identity",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status,
          json: async () => ({ mode: "blocked" }),
        }),
      );
      await render();
      expect(host.textContent).toContain("blocked:true:false:none:false");
      expect(host.querySelector('[role="alert"]')).not.toBeNull();
      expect(mocks.init).not.toHaveBeenCalled();
      expect(mocks.replace).not.toHaveBeenCalled();
    },
  );
  it("natural session expiry signalled by the retained mode marker blocks cached LIFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ mode: "blocked" }),
      }),
    );
    await render();
    expect(host.textContent).toContain("blocked:true:false:none:false");
    expect(mocks.init).not.toHaveBeenCalled();
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it("shows a same-tab way back for blocked Front mode without initializing LIFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({
            mode: "blocked",
            returnToFront: "/api/auth/front/return",
          }),
        }),
    );
    await render();
    expect(
      host.querySelector('a[href="/api/auth/front/return"]')?.textContent,
    ).toBe("กลับเว็บไซต์เจ้าทุย");
    expect(mocks.init).not.toHaveBeenCalled();
  });
  it("never accepts an arbitrary return URL from bootstrap", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({
            mode: "blocked",
            returnToFront: "https://evil.example",
          }),
        }),
    );
    await render();
    expect(host.querySelector("a")).toBeNull();
  });
  it("missing SSO cookie initializes real LIFF and preserves event deep link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mode: "liff", enabled: false }),
      }),
    );
    await render();
    expect(mocks.init).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("liff:true:true:line-legacy:true");
    expect(host.querySelector("a")).toBeNull();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("retains legacy home-to-profile navigation after auth is ready", async () => {
    mocks.route.pathname = "/";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ mode: "liff" }) }),
    );
    await render();
    expect(mocks.replace).toHaveBeenCalledWith("/profile");
  });
  it("failed linked logout keeps active applicant; success blocks old LIFF without initiating it", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mode: "sso", profile: { userId: "line-a" } }),
      })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetch);
    await render();
    await act(async () => host.querySelector("button")!.click());
    expect(host.textContent).toContain("sso:true:true:line-a:false");
    await act(async () => host.querySelector("button")!.click());
    expect(host.textContent).toContain("blocked:true:false:none:false");
    expect(mocks.init).not.toHaveBeenCalled();
    expect(mocks.logout).not.toHaveBeenCalled();
  });
});
