import {
  addNewCandidate,
  createVoteEvent,
  getCandidates,
  getVoteEvent,
  getVotedByuserId,
  getVoterByUserId,
  getVoters,
  importCandidatesFromRegistered,
  resetData,
  voteFor,
} from "~/server/services/votes.service";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { uploadCandidate } from "~/server/services/upload.service";

export const votesRouter = createTRPCRouter({
  createVoteEvent: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return await createVoteEvent(input);
    }),
  getSelectedEvent: publicProcedure.query(async () => {
    const event = await getVoteEvent();
    if (event.length <= 0) {
      return null;
    }
    return event[0];
  }),
  importCandidates: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ input }) => {
      return await importCandidatesFromRegistered(input.eventId);
    }),
  addCandidate: publicProcedure
    .input(
      z.object({
        microchip: z.string(),
        name: z.string(),
        imageUrl: z.string(),
        eventId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      return await addNewCandidate(input);
    }),
  getCandidates: publicProcedure.query(async () => await getCandidates()),
  getVoters: publicProcedure.query(async () => await getVoters()),
  voteFor: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        votesId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      return await voteFor(input.userId, input.votesId);
    }),
  voted: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      // return await getVoterByUserId(input.userId);
      return await getVotedByuserId(input.userId);
    }),
  reset: publicProcedure.mutation(async () => {
    await resetData();
  }),
});
