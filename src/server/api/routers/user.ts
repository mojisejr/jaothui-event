import { hasFrontApplicantIdentity } from "~/server/services/front-sso.service";
import { resolveApplicantOwner } from "~/server/services/applicant-auth.service";
import { getUserByUserId } from "~/server/services/user.service";
import { getProfileStatsByUserId } from "~/server/services/user.service";

import { createNewUser } from "~/server/services/user.service";
import { createTRPCRouter, publicProcedure } from "../trpc";
import z from "zod";

export const userRouter = createTRPCRouter({
  getProfileStats: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      }),
    )
    .query(async ({ input, ctx }) => {
      return await getProfileStatsByUserId(
        await resolveApplicantOwner(ctx.req, {}, input.userId),
      );
    }),

  getById: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const user = await getUserByUserId(
        await resolveApplicantOwner(ctx.req, {}, input.userId),
      );
      return hasFrontApplicantIdentity(ctx.req) && user
        ? { ...user, role: "USER" }
        : user;
    }),

  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        email: z.string().nullable().optional(),
        name: z.string(),
        tel: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = await resolveApplicantOwner(ctx.req, {}, input.userId);
      return await createNewUser({ ...input, userId });
    }),
});
