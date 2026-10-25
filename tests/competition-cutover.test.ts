import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GetServerSidePropsContext } from "next";
import { competitionAdminPage } from "~/server/admin/legacy-competition-cutover";

function context(
  query: Record<string, string | string[] | undefined> = {},
  params: Record<string, string | string[]> = {},
) {
  const res = { statusCode: 200, setHeader: vi.fn() };
  return { query, params, res } as unknown as GetServerSidePropsContext;
}
beforeEach(() => {
  vi.stubEnv("COMPETITION_LEGACY_ADMIN_DISABLED", "true");
  vi.stubEnv(
    "JAOTHUI_COMPETITION_DASHBOARD_URL",
    "https://dboard.example.test",
  );
});
afterEach(() => vi.unstubAllEnvs());

describe("legacy competition page cutover", () => {
  it.each([undefined, "false", "TRUE", "1"])(
    "retains source-first pages unless the flag is exact true (%s)",
    async (value) => {
      vi.stubEnv("COMPETITION_LEGACY_ADMIN_DISABLED", value);
      expect(
        await competitionAdminPage("index")(context({ tab: "event" })),
      ).toEqual({ props: {} });
    },
  );
  it.each([{}, { tab: "event" }, { tab: "registration" }])(
    "redirects competition landing pages without copying caller query %j",
    async (query) => {
      const ctx = context({
        ...query,
        userId: "do-not-forward",
        token: "private",
        redirect: "https://evil.example",
      });
      expect(await competitionAdminPage("index")(ctx)).toEqual({
        redirect: {
          destination: "https://dboard.example.test/dashboard/competitions",
          permanent: false,
        },
      });
      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "private, no-store",
      );
    },
  );
  it("preserves exact event/application identity and drops old user identity", async () => {
    const ctx = context(
      { eventId: "query-forged", userId: "do-not-forward" },
      { eventId: "event-real", info: ["entry-real", "old-line-id", "ignored"] },
    );
    expect(await competitionAdminPage("application")(ctx)).toEqual({
      redirect: {
        destination:
          "https://dboard.example.test/dashboard/competitions/event-real/applications/entry-real",
        permanent: false,
      },
    });
    expect(await competitionAdminPage("applications")(ctx)).toEqual({
      redirect: {
        destination:
          "https://dboard.example.test/dashboard/competitions/event-real/applications",
        permanent: false,
      },
    });
  });
  it("does not redirect the existing votes tab even when dashboard configuration is unavailable", async () => {
    vi.stubEnv("JAOTHUI_COMPETITION_DASHBOARD_URL", "");
    expect(
      await competitionAdminPage("index")(
        context({ tab: "votes", menu: "reward" }),
      ),
    ).toEqual({ props: {} });
  });
  it.each([
    "",
    "javascript:alert(1)",
    "//evil.example",
    "https://user:pass@dboard.example.test",
    "https://dboard.example.test?token=secret",
    "https://dboard.example.test/#fragment",
    "https://dboard.example.test/elsewhere",
    " https://dboard.example.test",
    "https://dboard.example.test\\@evil.example",
    "http://dboard.example.test",
  ])(
    "fails safe with no old controls for invalid dashboard configuration (%s)",
    async (value) => {
      vi.stubEnv("JAOTHUI_COMPETITION_DASHBOARD_URL", value);
      const ctx = context({ tab: "event" });
      expect(await competitionAdminPage("index")(ctx)).toEqual({
        props: { competitionAdminUnavailable: true },
      });
      expect(ctx.res.statusCode).toBe(503);
    },
  );
  it("accepts the explicit dashboard base path and returns only a temporary redirect when the host is unavailable", async () => {
    vi.stubEnv(
      "JAOTHUI_COMPETITION_DASHBOARD_URL",
      "https://offline.example.test/dashboard/competitions/",
    );
    // No liveness check: an outage never restores source controls or writes.
    expect(await competitionAdminPage("index")(context())).toEqual({
      redirect: {
        destination: "https://offline.example.test/dashboard/competitions",
        permanent: false,
      },
    });
  });
  it("allows loopback HTTP for local proof but rejects it in production", async () => {
    vi.stubEnv("JAOTHUI_COMPETITION_DASHBOARD_URL", "http://127.0.0.1:3027");
    vi.stubEnv("NODE_ENV", "test");
    expect(await competitionAdminPage("index")(context())).toHaveProperty(
      "redirect",
    );
    vi.stubEnv("NODE_ENV", "production");
    expect(await competitionAdminPage("index")(context())).toEqual({
      props: { competitionAdminUnavailable: true },
    });
  });
  it.each([
    "//evil.example",
    "../votes",
    "event%2Fescape",
    "event?userId=secret",
    ["event", "injected"],
  ])(
    "rejects malformed event identity instead of building a redirect (%j)",
    async (eventId) => {
      expect(
        await competitionAdminPage("applications")(context({}, { eventId })),
      ).toEqual({ notFound: true });
    },
  );
  it("rejects missing or malformed application identity", async () => {
    for (const info of [[], ["../escape"], ["https://evil.example"]])
      expect(
        await competitionAdminPage("application")(
          context({}, { eventId: "event", info }),
        ),
      ).toEqual({ notFound: true });
  });
  it("uses the canonical bridge ID contract for historical long/underscore IDs and rejects drafts", async () => {
    for (const id of ["_legacy.event", "-legacy", "a".repeat(200)]) {
      expect(
        await competitionAdminPage("applications")(
          context({}, { eventId: id }),
        ),
      ).toEqual({
        redirect: {
          destination: `https://dboard.example.test/dashboard/competitions/${id}/applications`,
          permanent: false,
        },
      });
    }
    for (const id of ["a".repeat(201), "drafts.event"])
      expect(
        await competitionAdminPage("applications")(
          context({}, { eventId: id }),
        ),
      ).toEqual({ notFound: true });
    expect(
      await competitionAdminPage("application")(
        context({}, { eventId: "event", info: ["drafts.entry", "user"] }),
      ),
    ).toEqual({ notFound: true });
  });
});
