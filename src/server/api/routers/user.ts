import { getUserByUserId } from "~/server/services/user.service";

import { createNewUser } from "~/server/services/user.service";
import { createTRPCRouter, publicProcedure } from "../trpc";
import z from "zod";

export const userRouter = createTRPCRouter({
  getById: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await getUserByUserId(input.userId);
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
    .mutation(async ({ input }) => {
      return await createNewUser(input);
    }),
});
