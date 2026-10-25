import { TRPCError } from "@trpc/server";
import type { GetServerSideProps } from "next";
import { documentId } from "./competition-contract";

/** Independent of bridge write/LINE switches: recovery never restores old writes. */
export function legacyCompetitionAdminDisabled() {
  return process.env.COMPETITION_LEGACY_ADMIN_DISABLED === "true";
}

export function assertLegacyCompetitionAdminEnabled() {
  if (legacyCompetitionAdminDisabled())
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "COMPETITION_ADMIN_MOVED: กรุณาจัดการแข่งขันผ่าน Dashboard",
    });
}

export type CompetitionCutoverProps = {
  competitionAdminUnavailable?: boolean;
};

/** Server configuration only. Caller query strings never select the destination. */
function dashboardBase(): URL | null {
  const value = process.env.JAOTHUI_COMPETITION_DASHBOARD_URL;
  if (!value || value !== value.trim() || value.includes("\\")) return null;
  try {
    const url = new URL(value);
    const localHttp =
      process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !localHttp) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !["/", "/dashboard/competitions", "/dashboard/competitions/"].includes(
        url.pathname,
      )
    )
      return null;
    url.pathname = "/dashboard/competitions";
    return url;
  } catch {
    return null;
  }
}

const validId = (id: unknown): id is string =>
  typeof id === "string" && documentId.safeParse(id).success;

/** Temporary SSR redirects preserve event/application IDs, never applicant credentials. */
export function competitionAdminPage(
  page: "index" | "applications" | "application",
): GetServerSideProps<CompetitionCutoverProps> {
  return async ({ query, params, res }) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (!legacyCompetitionAdminDisabled()) return { props: {} };
    // The shared landing route also has vote links; its exact existing tab is untouched.
    if (page === "index" && query.tab === "votes") return { props: {} };
    const base = dashboardBase();
    if (!base) {
      res.statusCode = 503;
      return { props: { competitionAdminUnavailable: true } };
    }
    if (page !== "index") {
      const eventId = params?.eventId;
      if (!validId(eventId)) return { notFound: true };
      base.pathname += `/${encodeURIComponent(eventId)}/applications`;
      if (page === "application") {
        const info = params?.info;
        const registrationId = Array.isArray(info) ? info[0] : undefined;
        if (!validId(registrationId)) return { notFound: true };
        // info[1] is the old LINE/user ID. Deliberately never forward it.
        base.pathname += `/${encodeURIComponent(registrationId)}`;
      }
    }
    return { redirect: { destination: base.toString(), permanent: false } };
  };
}
