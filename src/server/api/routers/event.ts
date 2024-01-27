import { getAllActiveEvents } from "~/server/services/event.service";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const eventRouter = createTRPCRouter({
  getAllActive: publicProcedure.query(async () => {
    return await getAllActiveEvents();
  }),
});
