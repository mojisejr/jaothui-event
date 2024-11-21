import {
  getAllRegistered,
  getAddress,
  getImages,
  getApprovement,
  approve,
} from "~/server/services/royal.service";
import { createTRPCRouter, royalAdmin } from "../trpc";
import { z } from "zod";

export const royalAdminRoutes = createTRPCRouter({
  getAllRegistered: royalAdmin
    .input(z.object({ userId: z.string() }))
    .query(async () => {
      return await getAllRegistered();
    }),
  getAddress: royalAdmin
    .input(z.object({ targetId: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      return await getAddress(input.targetId);
    }),
  getImages: royalAdmin
    .input(
      z.object({
        targetId: z.string(),
        userId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await getImages(input.targetId);
    }),
  getApprovement: royalAdmin
    .input(z.object({ targetId: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      return await getApprovement(input.targetId);
    }),
  approve: royalAdmin
    .input(
      z.object({ docId: z.string(), result: z.boolean(), userId: z.string() }),
    )
    .mutation(async ({ input }) => {
      return await approve(input.docId, input.result);
    }),
});
