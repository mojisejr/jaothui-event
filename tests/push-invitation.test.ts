// @vitest-environment jsdom
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  query: {} as Record<string, string | string[]>,
  owner: "owner",
  loggedIn: true,
  normalSuccess: false,
  normalId: undefined as string | undefined,
  royalSuccess: false,
  replace: vi.fn(),
  register: vi.fn(),
  rows: [
    {
      _id: "entry",
      event: { _id: "event", title: "งานทดสอบ", endAt: "2099-01-01" },
    },
  ],
  historyError: "",
}));
vi.mock("next/router", () => ({
  useRouter: () => ({ query: fixture.query, replace: fixture.replace }),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => React.createElement("a", { ...props, href }, children),
}));
vi.mock("~/context/lineContext", () => ({
  useLine: () => ({
    authReady: true,
    loggedIn: fixture.loggedIn,
    profile: fixture.loggedIn ? { userId: fixture.owner } : undefined,
    authMode: "sso",
    login: vi.fn(),
  }),
}));
vi.mock("~/components/MyEvents/useApplicantHistory", () => ({
  useApplicantHistory: () => ({
    events: fixture.rows,
    error: fixture.historyError,
    loading: false,
    refresh: vi.fn(),
  }),
}));
vi.mock("~/components/MyEvents/HistoryCard", () => ({
  default: () => React.createElement("div", null, "ใบสมัครของฉัน"),
}));
vi.mock("~/components/MyEvents/ApplicantQrDialog", () => ({
  ApplicantQrDialog: () => null,
}));
vi.mock("~/utils/addressHelper", () => ({
  getProvinces: () => [],
  getAmphoeFromProvince: () => [],
  getDistrictsFromAmphoe: () => [],
}));
const data = {
  firstName: "First",
  lastName: "Last",
  tel: "0800000000",
  microchip: "",
  buffaloName: "ทดสอบ",
  buffaloBirthDate: "2025-01-01",
  buffaloColor: "black",
  buffaloSex: "male",
  competitionLevel: "ประเทศ",
  competitionType: "รุ่น A",
  accept1: "y",
  accept2: "y",
  accept3: "y",
  accept4: "y",
};
vi.mock("react-hook-form", () => ({
  useForm: () => ({
    register: () => ({}),
    handleSubmit: (fn: (values: typeof data) => unknown) => (event: Event) => {
      event.preventDefault();
      return fn(data);
    },
    watch: (key: string | unknown) =>
      typeof key === "string"
        ? data[key as keyof typeof data]
        : { unsubscribe: vi.fn() },
    setValue: vi.fn(),
    getValues: (key: keyof typeof data) => data[key],
    reset: vi.fn(),
    formState: { errors: {} },
  }),
}));
vi.mock("~/utils/api", () => ({
  api: {
    metadata: {
      getMetadataByMicrochip: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    registerEvent: {
      register: {
        useMutation: () => ({
          mutate: fixture.register,
          reset: vi.fn(),
          isSuccess: fixture.normalSuccess,
          data: fixture.normalId ? { _id: fixture.normalId } : undefined,
          isError: false,
        }),
      },
      registerRoyalEvent: {
        useMutation: () => ({
          mutate: vi.fn(),
          isSuccess: fixture.royalSuccess,
          isError: false,
        }),
      },
    },
    event: {
      getTypesWithAutoAssignment: {
        useQuery: () => ({
          data: {
            nationalTypes: ["รุ่น A"],
            provinceTypes: [],
            specialNationalTypes: [],
            specialProvinceTypes: [],
          },
          isLoading: false,
        }),
      },
    },
  },
}));
import { PushInvitation } from "~/components/MyEvents/PushInvitation";
import Success from "~/pages/success";
import History from "~/pages/profile/my-events";
import FormV3 from "~/components/Events/Formv3";
import RoyalForm from "~/components/Events/RoyalForm";
import {
  dismissPushInvitation,
  invitationDismissed,
  PUSH_PUBLIC_CONFIG_URL,
  PUSH_SETTINGS_URL,
} from "~/lib/push-invitation";
let root: Root,
  host: HTMLDivElement,
  fetcher: ReturnType<typeof vi.fn>,
  sequence = 0;
const render = (node: React.ReactNode) =>
  act(async () => {
    root.render(node);
  });
const invitation = () =>
  host.querySelector('[aria-label="เปิดแจ้งเตือนการแข่งขัน"]');
const normal = (admin = false) =>
  React.createElement(FormV3, {
    userId: fixture.owner,
    eventId: "event",
    name: "งานทดสอบ",
    startAt: "2099-01-01",
    deadline: "2099-01-01",
    isNational: true,
    isInHouse: false,
    isAdminMode: admin,
  });
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("alert", vi.fn());
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  fixture.owner = `owner-${++sequence}`;
  fixture.query = {};
  fixture.loggedIn = true;
  fixture.normalSuccess = false;
  fixture.normalId = undefined;
  fixture.royalSuccess = false;
  fixture.historyError = "";
  fixture.rows = [
    {
      _id: "entry",
      event: { _id: "event", title: "งานทดสอบ", endAt: "2099-01-01" },
    },
  ];
  fixture.replace.mockClear();
  fixture.register.mockClear();
  localStorage.clear();
  fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      ok: true,
      data: { available: true, vapidPublicKey: "public-key" },
    }),
  });
  vi.stubGlobal("fetch", fetcher);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("Event link-only notification invitation", () => {
  it("bounds stored/session dismissal to eight recent accounts and expires old entries", () => {
    const now = Date.now();
    for (let index = 0; index < 12; index++)
      dismissPushInvitation(`bounded-${index}`, now + index);
    const saved = JSON.parse(
      localStorage.getItem("jaothui.push.invitation.v1")!,
    ) as { owner: string; at: number }[];
    expect(saved).toHaveLength(8);
    expect(saved.some((item) => item.owner === "bounded-0")).toBe(false);
    expect(invitationDismissed("bounded-11", now + 100)).toBe(true);
    expect(invitationDismissed("bounded-11", now + 7 * 86400000 + 100)).toBe(
      false,
    );
    dismissPushInvitation("after-expiry", now + 7 * 86400000 + 100);
    expect(
      JSON.parse(localStorage.getItem("jaothui.push.invitation.v1")!),
    ).toEqual([{ owner: "after-expiry", at: now + 7 * 86400000 + 100 }]);
  });
  it("uses fixed WWW CTA, simple public GET with no credentials, and never requests Event permission", async () => {
    const prompt = vi.fn();
    vi.stubGlobal("Notification", {
      permission: "denied",
      requestPermission: prompt,
    });
    await render(
      React.createElement(PushInvitation, {
        ownerKey: fixture.owner,
        eligible: true,
      }),
    );
    expect(invitation()).not.toBeNull();
    expect(prompt).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledWith(
      PUSH_PUBLIC_CONFIG_URL,
      expect.objectContaining({
        method: "GET",
        credentials: "omit",
        mode: "cors",
      }),
    );
    expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty("headers");
    const cta = host.querySelector("a")!;
    expect(cta.getAttribute("href")).toBe(PUSH_SETTINGS_URL);
    expect(cta.getAttribute("target")).toBeNull();
    expect(host.textContent).toContain("อีกครั้ง");
    host.addEventListener("click", (event) => event.preventDefault());
    await act(async () => cta.click());
    expect(invitation()).toBeNull();
    await render(null);
    await render(React.createElement(History));
    expect(invitation()).toBeNull();
  });
  it("shares a seven-day dismissal across success/history for that account only", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    fixture.query = { registration: "royal" };
    await render(React.createElement(Success));
    expect(invitation()).not.toBeNull();
    await act(async () => host.querySelector("button")!.click());
    await render(null);
    clock.mockReturnValue(now + 6 * 86400000);
    await render(React.createElement(History));
    expect(invitation()).toBeNull();
    await render(null);
    fixture.owner = "other-account";
    await render(React.createElement(History));
    expect(invitation()).not.toBeNull();
    await render(null);
    fixture.owner = `owner-${sequence}`;
    clock.mockReturnValue(now + 7 * 86400000 + 1);
    await render(React.createElement(History));
    expect(invitation()).not.toBeNull();
  });
  it("ignores a late availability response after account switch", async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    fetcher
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: { available: false, vapidPublicKey: "key" },
        }),
      });
    await render(
      React.createElement(PushInvitation, {
        ownerKey: "slow-first-account",
        eligible: true,
      }),
    );
    await render(
      React.createElement(PushInvitation, {
        ownerKey: "new-second-account",
        eligible: true,
      }),
    );
    await act(async () => {
      resolveFirst({
        ok: true,
        json: async () => ({
          ok: true,
          data: { available: true, vapidPublicKey: "key" },
        }),
      });
    });
    expect(invitation()).toBeNull();
  });
  it("keeps dismissal for this SPA if persistent storage becomes unwritable", async () => {
    await render(
      React.createElement(PushInvitation, {
        ownerKey: fixture.owner,
        eligible: true,
      }),
    );
    expect(invitation()).not.toBeNull();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage full");
    });
    await act(async () => host.querySelector("button")!.click());
    expect(invitation()).toBeNull();
    await render(null);
    fetcher.mockClear();
    await render(React.createElement(History));
    expect(invitation()).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["off", "error", "no-web-key"])(
    "hides unavailable config (%s) without disturbing history",
    async (kind) => {
      if (kind === "error") fetcher.mockRejectedValue(new Error("offline"));
      else
        fetcher.mockResolvedValue({
          ok: true,
          json: async () => ({
            ok: true,
            data: {
              available: kind !== "off",
              vapidPublicKey: kind === "no-web-key" ? null : "key",
            },
          }),
        });
      await render(React.createElement(History));
      expect(invitation()).toBeNull();
      expect(host.textContent).toContain("ใบสมัครของฉัน");
    },
  );
  it("hides for unauthenticated users, empty/error history, unrelated success and storage failure", async () => {
    fixture.loggedIn = false;
    fixture.query = { registration: "royal" };
    await render(React.createElement(Success));
    expect(invitation()).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    await render(null);
    fixture.loggedIn = true;
    fixture.query = {};
    await render(React.createElement(Success));
    expect(invitation()).toBeNull();
    await render(null);
    fixture.query = { registration: ["royal", "other"] };
    await render(React.createElement(Success));
    expect(invitation()).toBeNull();
    await render(null);
    fixture.rows = [];
    await render(React.createElement(History));
    expect(invitation()).toBeNull();
    await render(null);
    fixture.rows = [
      {
        _id: "entry",
        event: { _id: "event", title: "งานทดสอบ", endAt: "2099-01-01" },
      },
    ];
    fixture.historyError = "unavailable";
    await render(React.createElement(History));
    expect(invitation()).toBeNull();
    await render(null);
    fixture.historyError = "";
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    await render(React.createElement(History));
    expect(invitation()).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("appears only after a confirmed public normal registration; uncertain/admin outcomes never invite", async () => {
    await render(normal());
    expect(invitation()).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    await act(async () =>
      host
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(fixture.register).toHaveBeenCalled();
    fixture.normalSuccess = true;
    await render(normal());
    expect(invitation()).toBeNull();
    fixture.normalId = "registration-1";
    await render(normal());
    expect(host.textContent).toContain("สมัครสำเร็จแล้ว");
    expect(invitation()).not.toBeNull();
    await render(null);
    fetcher.mockClear();
    await render(normal(true));
    expect(invitation()).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("Royal success redirects with only registration context; generic success keeps its original purpose", async () => {
    fixture.royalSuccess = true;
    await render(
      React.createElement(RoyalForm, {
        userId: fixture.owner,
        eventId: "event",
        name: "งาน Royal",
        _startAt: "2099-01-01",
        deadline: "2099-01-01",
      }),
    );
    expect(fixture.replace).toHaveBeenCalledWith("/success?registration=royal");
    await render(null);
    fixture.query = {};
    await render(React.createElement(Success));
    expect(invitation()).toBeNull();
    expect(host.textContent).toContain("สำเร็จ");
  });
});
