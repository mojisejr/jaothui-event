import { assertLegacyCompetitionAdminEnabled } from "~/server/admin/legacy-competition-cutover";
import { admin, publicProcedure, royalAdmin } from "./trpc";

// Guard BEFORE legacy caller-userId authorization (and its Sanity lookup).
export const legacyCompetitionProcedure = publicProcedure.use(({ next }) => {
  assertLegacyCompetitionAdminEnabled();
  return next();
});
export const legacyCompetitionAdminProcedure =
  legacyCompetitionProcedure.unstable_concat(admin);
export const legacyRoyalCompetitionAdminProcedure =
  legacyCompetitionProcedure.unstable_concat(royalAdmin);
