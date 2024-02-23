import {
  getAllActiveEvents,
  getAllEvents,
} from "~/server/services/event.service";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const eventRouter = createTRPCRouter({
  getAllActive: publicProcedure.query(async () => {
    return await getAllActiveEvents();
  }),
  getAll: publicProcedure.query(async () => {
    return await getAllEvents();
  }),
});
