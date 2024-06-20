import {
  canVote,
  createNewVoteEvent,
  getAllVoteEvents,
  getEventById,
  voteFor,
} from "~/server/services/votes-v2.service";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const votesRouterV2 = createTRPCRouter({
  newVoteEvent: publicProcedure
    .input(
      z.object({
        eventName: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return await createNewVoteEvent(input.eventName);
    }),
  getAllEvents: publicProcedure.query(async () => {
    return await getAllVoteEvents();
  }),
  getEventById: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input }) => {
      return await getEventById(input.eventId);
    }),
  canVote: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        voterId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await canVote(input.voterId, input.eventId);
    }),
  voteFor: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        candidateId: z.string(),
        voterId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return await voteFor(input.eventId, input.candidateId, input.voterId);
    }),
});
