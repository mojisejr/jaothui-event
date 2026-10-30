// @vitest-environment jsdom
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { renderToStaticMarkup } from "react-dom/server";
import jsQR from "jsqr";
import { QRCodeSVG } from "qrcode.react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicantApplication } from "~/server/services/competition-applicant-checkin";
import type { Liff } from "@line/liff";
import { HistoryCard } from "~/components/MyEvents/HistoryCard";
import { ApplicantQrDialog } from "~/components/MyEvents/ApplicantQrDialog";
import { useApplicantHistory } from "~/components/MyEvents/useApplicantHistory";
import {
  applicantAuthorization,
  isCurrentApplication,
} from "~/components/MyEvents/applicant-history";

const calls = vi.hoisted(() => ({
  history: vi.fn(),
  pass: vi.fn(),
  status: vi.fn(),
}));
vi.mock("~/utils/api", () => ({
  api: {
    registerEvent: {
      ownedHistory: { useMutation: () => ({ mutateAsync: calls.history }) },
      applicantPass: { useMutation: () => ({ mutateAsync: calls.pass }) },
      ownedStatus: { useMutation: () => ({ mutateAsync: calls.status }) },
    },
  },
}));

const application: ApplicantApplication = {
  _id: "application-a",
  _rev: "r1",
  name: "เจ้าทดสอบ",
  microchip: "000123456789012",
  type: "รุ่น A",
  level: "national",
  ownerName: "เจ้าของทดสอบ",
  farmName: "ฟาร์มทดสอบ",
  birthday: "2025-01-01",
  sex: "male",
  color: "black",
  buffaloAge: 22,
  event: {
    _id: "event-a",
    title: "งานทดสอบ",
    startAt: "2026-10-30",
    endAt: "2026-10-30",
    eventType: "normal",
  },
  registrationPolicyVersion: 1,
  approvalRequirement: "not_required",
  registrationStatus: "registered",
  approvementResult: null,
  comment: null,
  checkInVersion: 1,
  checkInStatus: "not_checked_in",
  checkedInAt: null,
  checkedInBy: null,
  checkInEligibility: { eligible: true, reason: null },
  qrAvailable: true,
};
const liff = {
  getIDToken: () => "synthetic-id-credential",
  getAccessToken: () => "synthetic-access",
} as unknown as Liff;
const qrUrl =
  "https://dboard.example.test/dashboard/competitions/check-in/v1-synthetic-pass";
let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
    },
  });
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  calls.history.mockResolvedValue([application]);
  calls.pass.mockResolvedValue({ application, qrUrl });
  calls.status.mockResolvedValue(application);
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  document.body.innerHTML = "";
  vi.useRealTimers();
});
async function render(element: React.ReactElement) {
  await act(async () => {
    root.render(element);
  });
}
async function click(element: Element | null) {
  expect(element).not.toBeNull();
  await act(async () => {
    element!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("applicant card and QR", () => {
  it("keeps QR out of summary card and reveals a dedicated QR action, preserving raw microchip zeros", async () => {
    const onShowQr = vi.fn();
    await render(
      React.createElement(HistoryCard, { event: application, onShowQr }),
    );
    expect(host.querySelector("svg")).toBeNull();
    expect(host.querySelector("details")?.open).toBe(false);
    expect(host.textContent).toContain("000123456789012");
    expect(host.textContent).toContain("รุ่นแข่งขัน");
    expect(host.textContent).not.toContain("national");
    await click(host.querySelector("button"));
    expect(onShowQr).toHaveBeenCalledOnce();
    expect(host.querySelector("button")?.textContent).toBe("แสดง QR รายงานตัว");
  });

  it("uses current effective policy instead of stale approval and has no QR action for blocked Royal", async () => {
    const blocked = {
      ...application,
      approvalRequirement: "required" as const,
      registrationStatus: "pending" as const,
      approvementResult: true,
      qrAvailable: false,
      checkInEligibility: { eligible: false, reason: "รอการอนุมัติ" },
    };
    await render(
      React.createElement(HistoryCard, { event: blocked, onShowQr: vi.fn() }),
    );
    expect(host.textContent).toContain("รอการอนุมัติ");
    expect(host.textContent).not.toContain("อนุมัติแล้ว");
    expect(host.querySelector("button")).toBeNull();
  });

  it("opens an accessible isolated QR pass, refreshes arrival, and restores focus on close", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const onUpdated = vi.fn();
    const onClose = vi.fn();
    await render(
      React.createElement(ApplicantQrDialog, {
        application,
        liff,
        onClose,
        onUpdated,
      }),
    );
    expect(host.querySelector("dialog")?.open).toBe(true);
    expect(host.querySelector("dialog")?.getAttribute("aria-labelledby")).toBe(
      "applicant-qr-title",
    );
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "ปิด QR รายงานตัว",
    );
    expect(calls.pass).toHaveBeenCalledWith({
      idToken: "synthetic-id-credential",
      registrationId: "application-a",
    });
    expect(host.querySelector("svg")).not.toBeNull();
    expect(host.textContent).toContain("รุ่น A");
    const checked = {
      ...application,
      checkInStatus: "checked_in" as const,
      checkedInAt: "2026-10-30T08:00:00Z",
      checkedInBy: "dashboard-shared" as const,
    };
    calls.status.mockResolvedValue(checked);
    const refresh = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "โหลดข้อมูลล่าสุด",
    );
    await click(refresh ?? null);
    expect(host.textContent).toContain("รายงานตัวแล้ว");
    expect(host.textContent).toContain("15:00");
    expect(onUpdated).toHaveBeenCalled();
    await act(async () => root.render(React.createElement("div")));
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
  });

  it("updates correction state, stops hidden polling and unsubscribes when unmounted", async () => {
    vi.useFakeTimers();
    const checked = {
      ...application,
      checkInStatus: "checked_in" as const,
      checkedInAt: "2026-10-30T08:00:00Z",
      checkedInBy: "dashboard-shared" as const,
    };
    calls.pass.mockResolvedValue({ application: checked, qrUrl });
    await render(
      React.createElement(ApplicantQrDialog, {
        application: checked,
        liff,
        onClose: vi.fn(),
        onUpdated: vi.fn(),
      }),
    );
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });
    expect(calls.status).not.toHaveBeenCalled();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(calls.status).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("ยังไม่รายงานตัว");
    expect(host.textContent).not.toContain("15:00");
    await act(async () => root.render(React.createElement("div")));
    await act(async () => {
      vi.advanceTimersByTime(30000);
      window.dispatchEvent(new Event("focus"));
    });
    expect(calls.status).toHaveBeenCalledOnce();
  });

  it("does not cascade unchanged status polls into a full history reload and handles native cancel", async () => {
    vi.useFakeTimers();
    const onUpdated = vi.fn();
    const onClose = vi.fn();
    await render(
      React.createElement(ApplicantQrDialog, {
        application,
        liff,
        onClose,
        onUpdated,
      }),
    );
    await act(async () => {
      vi.advanceTimersByTime(20000);
    });
    expect(calls.status).toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
    const cancel = new Event("cancel", { cancelable: true });
    await act(async () => {
      host.querySelector("dialog")!.dispatchEvent(cancel);
    });
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("reissues from current server eligibility after approval changes while the dialog stays open", async () => {
    const blocked = {
      ...application,
      qrAvailable: false,
      checkInStatus: "checked_in" as const,
    };
    calls.status.mockResolvedValueOnce(blocked);
    await render(
      React.createElement(ApplicantQrDialog, {
        application: blocked,
        liff,
        onClose: vi.fn(),
        onUpdated: vi.fn(),
      }),
    );
    expect(calls.pass).not.toHaveBeenCalled();
    expect(host.querySelector("svg")).toBeNull();
    calls.status.mockResolvedValue(application);
    await click(
      Array.from(host.querySelectorAll("button")).find(
        (button) => button.textContent === "โหลดข้อมูลล่าสุด",
      ) ?? null,
    );
    expect(calls.pass).toHaveBeenCalledWith({
      idToken: "synthetic-id-credential",
      registrationId: "application-a",
    });
    expect(host.querySelector("svg")).not.toBeNull();
  });

  it("keeps a visible stale warning on failed/offline refresh rather than claiming current success", async () => {
    await render(
      React.createElement(ApplicantQrDialog, {
        application,
        liff,
        onClose: vi.fn(),
        onUpdated: vi.fn(),
      }),
    );
    calls.status.mockRejectedValue(new Error("network unavailable"));
    await click(
      Array.from(host.querySelectorAll("button")).find(
        (button) => button.textContent === "โหลดข้อมูลล่าสุด",
      ) ?? null,
    );
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "โหลด QR หรือสถานะล่าสุดไม่สำเร็จ",
    );
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    await act(async () => window.dispatchEvent(new Event("offline")));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "ออฟไลน์",
    );
    expect(calls.pass).toHaveBeenCalledOnce();
  });

  it("keeps LINE credential choice exclusive and event final day inclusive in Bangkok", () => {
    expect(applicantAuthorization(liff)).toEqual({
      idToken: "synthetic-id-credential",
    });
    expect(
      applicantAuthorization({
        getIDToken: () => null,
        getAccessToken: () => "access-only",
      } as Liff),
    ).toEqual({ lineAccessToken: "access-only" });
    expect(() => applicantAuthorization(undefined)).toThrow("เข้าสู่ระบบ LINE");
    expect(isCurrentApplication("2026-10-30", "2026-10-30")).toBe(true);
    expect(isCurrentApplication("2026-10-30", "2026-10-31")).toBe(false);
  });

  it("independently decodes generated QR modules back to the exact protected URL", () => {
    const svg = renderToStaticMarkup(
      React.createElement(QRCodeSVG, {
        value: qrUrl,
        level: "M",
        marginSize: 4,
      }),
    );
    const size = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)?.[1]);
    const path = /<path fill="#000000" d="([^"]+)"/.exec(svg)?.[1] ?? "";
    const scale = 6;
    const pixels = new Uint8ClampedArray(size * size * scale * scale * 4).fill(
      255,
    );
    for (const match of path.matchAll(/M(\d+)[ ,](\d+)\s*h(\d+)v1H\d+z/g)) {
      const x = Number(match[1]);
      const y = Number(match[2]);
      const width = Number(match[3]);
      for (let py = y * scale; py < (y + 1) * scale; py++) {
        for (let px = x * scale; px < (x + width) * scale; px++) {
          const index = (py * size * scale + px) * 4;
          pixels[index] = pixels[index + 1] = pixels[index + 2] = 0;
        }
      }
    }
    const decoded = jsQR(pixels, size * scale, size * scale);
    expect(decoded?.data).toBe(qrUrl);
    expect(decoded?.data).not.toContain("synthetic-id-credential");
  });
});

function HistoryHarness({ userId = "owner-a" }: { userId?: string }) {
  const history = useApplicantHistory(liff, userId);
  return React.createElement(
    "div",
    null,
    history.events?.map((item) => item._id).join(",") ?? "loading",
    history.error,
  );
}

describe("owned applicant history refresh", () => {
  it("discards an earlier owner's in-flight history when the LINE identity changes", async () => {
    let resolveEarlier: (rows: ApplicantApplication[]) => void = () =>
      undefined;
    calls.history.mockImplementationOnce(
      () =>
        new Promise<ApplicantApplication[]>((resolve) => {
          resolveEarlier = resolve;
        }),
    );
    await render(React.createElement(HistoryHarness, { userId: "owner-a" }));
    calls.history.mockResolvedValue([
      { ...application, _id: "owner-b-application" },
    ]);
    await render(React.createElement(HistoryHarness, { userId: "owner-b" }));
    expect(host.textContent).toContain("owner-b-application");
    await act(async () => {
      resolveEarlier([application]);
    });
    expect(host.textContent).toContain("owner-b-application");
    expect(host.textContent).not.toContain("application-a");
  });

  it("reads through POST mutation, refreshes on focus, and never polls a hidden document", async () => {
    vi.useFakeTimers();
    await render(React.createElement(HistoryHarness));
    expect(calls.history).toHaveBeenCalledWith({
      idToken: "synthetic-id-credential",
    });
    expect(host.textContent).toContain("application-a");
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    await act(async () => {
      vi.advanceTimersByTime(60000);
    });
    expect(calls.history).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    calls.history.mockResolvedValue([{ ...application, _id: "application-b" }]);
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(host.textContent).toContain("application-b");
    await act(async () => root.render(React.createElement("div")));
    await act(async () => vi.advanceTimersByTime(60000));
    expect(calls.history).toHaveBeenCalledTimes(2);
  });
});
