import {
  getAllActiveEvents,
  getAllEvents,
  getEventById,
  getEventTypes,
} from "~/server/services/event.service";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { z } from "zod";

export const eventRouter = createTRPCRouter({
  getAllActive: publicProcedure.query(async () => {
    return await getAllActiveEvents();
  }),
  getAll: publicProcedure.query(async () => {
    return await getAllEvents();
  }),
  getById: publicProcedure.input(z.string()).query(async ({ input }) => {
    return await getEventById(input);
  }),
  getTypes: publicProcedure.input(z.string()).query(async ({ input }) => {
    return await getEventTypes(input);
  }),
});
