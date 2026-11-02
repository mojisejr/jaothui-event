// @vitest-environment jsdom
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  replace: vi.fn(),
  error: undefined as { message: string; data: { code: string } } | undefined,
}));
vi.mock("next/router", () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock("~/context/lineContext", () => ({
  useLine: () => ({ authMode: "sso", liff: undefined }),
}));
vi.mock("~/utils/addressHelper", () => ({
  getProvinces: () => [],
  getAmphoeFromProvince: () => [],
  getDistrictsFromAmphoe: () => [],
}));
vi.mock("~/utils/api", () => ({
  api: {
    metadata: {
      getMetadataByMicrochip: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    registerEvent: {
      registerRoyalEvent: {
        useMutation: () => ({
          mutate: vi.fn(),
          isLoading: false,
          isSuccess: false,
          isError: !!state.error,
          error: state.error,
        }),
      },
    },
    event: {
      getTypesWithAutoAssignment: {
        useQuery: () => ({ data: undefined, isLoading: false }),
      },
    },
  },
}));
import RoyalForm from "~/components/Events/RoyalForm";
let root: Root, host: HTMLDivElement;
const render = async () =>
  act(async () =>
    root.render(
      React.createElement(RoyalForm, {
        userId: "line-a",
        eventId: "event-a",
        name: "Fixture",
        _startAt: "2026-11-02",
        deadline: "2026-11-02",
      }),
    ),
  );
beforeEach(() => {
  state.error = undefined;
  vi.stubGlobal("React", React);
  vi.stubGlobal("alert", vi.fn());
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
describe("Royal applicant auth recovery retains existing form data", () => {
  it.each([
    "UNAUTHORIZED",
    "FORBIDDEN",
    "CONFLICT",
    "INTERNAL_SERVER_ERROR",
    "TIMEOUT",
  ])("preserves applicant-entered name after %s", async (code) => {
    await render();
    const field = host.querySelector<HTMLInputElement>(
      'input[name="firstName"]',
    )!;
    field.value = "เจ้าของทดสอบ";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    state.error = { message: "retry", data: { code } };
    await render();
    expect(field.value).toBe("เจ้าของทดสอบ");
    expect(alert).toHaveBeenCalledWith("retry");
  });
  it("retains existing validation reset behavior for ordinary bad input", async () => {
    await render();
    const field = host.querySelector<HTMLInputElement>(
      'input[name="firstName"]',
    )!;
    field.value = "invalid";
    state.error = { message: "bad input", data: { code: "BAD_REQUEST" } };
    await render();
    expect(field.value).toBe("");
  });
});
