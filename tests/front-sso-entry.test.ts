// @vitest-environment jsdom
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  metadata: ["national", "inhouse"] as string[] | null,
  normal: vi.fn(),
  royal: vi.fn(),
  member: { userId: "line-a" },
  eventId: "event.0",
}));
vi.mock("next/router", () => ({
  useRouter: () => ({ query: { eventId: state.eventId } }),
}));
vi.mock("~/context/lineContext", () => ({
  useLine: () => ({
    profile: { userId: "line-a" },
    authReady: true,
    loggedIn: true,
    authMode: "sso",
    liff: undefined,
    login: vi.fn(),
  }),
}));
vi.mock("~/server/services/competition-policy", () => ({
  getCompetitionPolicy: () => ({ publicRegistration: "open" }),
}));
vi.mock("~/components/Events/Formv3", () => ({
  default: (props: unknown) => {
    state.normal(props);
    return React.createElement("span", null, "normal");
  },
}));
vi.mock("~/components/Events/RoyalForm", () => ({
  default: (props: unknown) => {
    state.royal(props);
    return React.createElement("span", null, "royal");
  },
}));
vi.mock("~/components/Register/Form", () => ({
  default: () => React.createElement("span", null, "member"),
}));
const refetch = vi.fn();
vi.mock("~/utils/api", () => ({
  api: {
    event: {
      getById: {
        useQuery: () => ({
          data: {
            eventId: state.eventId,
            eventType: "normal",
            metadata: state.metadata,
            name: "Fixture",
            eventAt: "2026-11-02",
            deadline: "2026-11-02",
          },
          isLoading: false,
        }),
      },
    },
    user: {
      getById: {
        useQuery: () => ({
          data: state.member,
          isLoading: false,
          isError: false,
          refetch,
        }),
      },
    },
  },
}));
import EventEntry from "~/pages/events/[eventId]";
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
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
describe("clean SSO event route preserves canonical Normal metadata", () => {
  it.each([
    { metadata: ["national", "inhouse"], national: true, inhouse: true },
    { metadata: ["inhouse"], national: false, inhouse: true },
    { metadata: ["national"], national: true, inhouse: false },
    { metadata: null, national: true, inhouse: true },
  ])(
    "uses source metadata $metadata without relying on missing query flags",
    async ({ metadata, national, inhouse }) => {
      state.metadata = metadata;
      await act(async () => root.render(React.createElement(EventEntry)));
      expect(state.normal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "line-a",
          eventId: "event.0",
          isNational: national,
          isInHouse: inhouse,
        }),
      );
      expect(state.royal).not.toHaveBeenCalled();
      expect(host.textContent).toBe("normal");
    },
  );
});
