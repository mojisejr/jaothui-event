import {
  getAllRegistered,
  getAddress,
  getImages,
  getApprovement,
  approve,
  getPublicApprovementStatus,
} from "~/server/services/royal.service";
import { createTRPCRouter, royalAdmin, publicProcedure } from "../trpc";
import { z } from "zod";
import { royalApprovementMessageParser } from "~/server/messaging/message-parser";
import { notify } from "~/server/messaging/notification";

export const royalAdminRoutes = createTRPCRouter({
  getAllRegistered: royalAdmin
    .input(z.object({ userId: z.string(), eventId: z.string() }))
    .query(async ({ input }) => {
      return await getAllRegistered(input.eventId);
    }),
  getAddress: royalAdmin
    .input(z.object({ targetId: z.string(), userId: z.string(), eventId: z.string() }))
    .query(async ({ input }) => {
      return await getAddress(input.eventId, input.targetId);
    }),
  getImages: royalAdmin
    .input(
      z.object({
        targetId: z.string(),
        userId: z.string(),
        eventId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await getImages(input.eventId, input.targetId);
    }),
  getApprovement: royalAdmin
    .input(z.object({ targetId: z.string(), userId: z.string(), eventId: z.string() }))
    .query(async ({ input }) => {
      return await getApprovement(input.eventId, input.targetId);
    }),
  approve: royalAdmin
    .input(
      z.object({
        targetId: z.string(),
        docId: z.string(),
        result: z.boolean(),
        userId: z.string(),
        ownerName: z.string(),
        microchip: z.string(),
        buffaloName: z.string(),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const approved = await approve(input.docId, input.result, input.comment);

      if (!approved) return null;

      if (!input.result) {
        const message = royalApprovementMessageParser({
          ownerName: input.ownerName,
          microchip: input.microchip,
          buffaloName: input.buffaloName,
          comment: input.comment,
          success: input.result,
          docId: approved._id,
        });
        await notify(input.targetId, message);
      } else if (input.result) {
        const message = royalApprovementMessageParser({
          ownerName: input.ownerName,
          microchip: input.microchip,
          buffaloName: input.buffaloName,
          success: input.result,
          docId: approved._id,
        });
        await notify(input.targetId, message);
      }
    }),
  getStatus: publicProcedure.input(z.string()).query(async ({ input }) => {
    return await getPublicApprovementStatus(input);
  }),
});
