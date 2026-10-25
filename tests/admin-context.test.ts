import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  profile: undefined as { userId: string } | undefined,
  user: undefined as { role: string } | undefined,
  query: vi.fn(),
}));
vi.mock("~/context/lineContext", () => ({
  useLine: () => ({ profile: state.profile }),
}));
vi.mock("~/utils/api", () => ({
  api: { user: { getById: { useQuery: state.query } } },
}));
import { AdminProvider, useAdmin } from "~/context/adminContext";
function Probe() {
  return React.createElement("span", null, String(useAdmin().admin));
}
function render() {
  return renderToString(
    React.createElement(AdminProvider, null, React.createElement(Probe)),
  );
}
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.profile = undefined;
  state.user = undefined;
  state.query.mockReset().mockImplementation(() => ({ data: state.user }));
});
afterEach(() => vi.unstubAllGlobals());

it("never enables a user query before LINE has a defined user ID", () => {
  expect(render()).toContain("false");
  expect(state.query).toHaveBeenCalledWith({ userId: "" }, { enabled: false });
});
it("enables role lookup only when the LINE profile arrives and retains ADMIN semantics", () => {
  state.profile = { userId: "synthetic-line-id" };
  expect(render()).toContain("false");
  expect(state.query).toHaveBeenLastCalledWith(
    { userId: "synthetic-line-id" },
    { enabled: true },
  );
  state.user = { role: "ADMIN" };
  expect(render()).toContain("true");
  state.user = { role: "USER" };
  expect(render()).toContain("false");
});
it("drops admin access if LINE profile disappears even if stale query data still exists", () => {
  state.user = { role: "ADMIN" };
  expect(render()).toContain("false");
  expect(state.query).toHaveBeenLastCalledWith(
    { userId: "" },
    { enabled: false },
  );
});
