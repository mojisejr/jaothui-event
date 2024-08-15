import { getMetadataByMicrochipId } from "~/server/services/metadata.service";
import { createTRPCRouter, publicProcedure } from "../trpc";
import z from "zod";
import { TRPCError } from "@trpc/server";

export const metadataRouter = createTRPCRouter({
  getMetadataByMicrochip: publicProcedure
    .input(z.object({ microchip: z.string() }))
    .mutation(async ({ input }) => {
      const result = await getMetadataByMicrochipId(input.microchip);
      if (result == undefined) {
        throw new TRPCError({ code: "BAD_REQUEST" });
        return;
      }
      return result;
    }),
});
