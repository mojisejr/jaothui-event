import { createTRPCRouter, publicProcedure } from "../trpc";
import z from "zod";
import { CreateNewEventRegisterDTO } from "~/interfaces/CreateNewEventRegisterDTO";
import { TRPCError } from "@trpc/server";
import {
  canRgister,
  createNewRegister,
} from "~/server/services/register-event.service";

export const registerEventRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        eventId: z.number(),
        userId: z.string(),
        type: z.string(),
        level: z.string(),
        gender: z.string(),
        color: z.string(),
        birthDay: z.string(),
        birthMonth: z.string(),
        birthYear: z.string(),
        imageFile: z.string(),
        microchip: z.string(),
        vaccineFile: z.string(),
        ownerName: z.string(),
        ownerLastname: z.string(),
        ownerTel: z.string(),
        accept: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!(await canRgister(input.eventId, input.microchip)))
        throw new TRPCError({
          code: "CONFLICT",
          message: "ควายตัวนี้สมัครไปแล้ว",
        });
      try {
        const dto: CreateNewEventRegisterDTO = {
          userId: input.userId,
          eventId: input.eventId,
          type: input.type,
          level: input.level,
          gender: input.gender,
          color: input.color,
          birthday: `${input.birthDay}/${input.birthMonth}/${input.birthYear}`,
          imageUrl: input.imageFile,
          vaccineUrl: input.vaccineFile,
          microchip: input.microchip,
          ownerName: `${input.ownerName} ${input.ownerLastname}`,
          ownerTel: `${input.ownerTel}`,
        };

        console.log(dto);
        return await createNewRegister(dto);
      } catch (error) {
        console.log(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ไม่สามารถสมัครได้",
        });
      }
    }),
  canRgister: publicProcedure
    .input(z.object({ eventId: z.number(), microchip: z.string() }))
    .query(async ({ input }) => {
      return await canRgister(input.eventId, input.microchip);
    }),
});
