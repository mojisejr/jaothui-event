import { createTRPCRouter, publicProcedure } from "../trpc";
import z from "zod";
import { CreateNewEventRegisterDTO } from "~/interfaces/CreateNewEventRegisterDTO";
import { TRPCError } from "@trpc/server";
import {
  canRgister,
  createNewRegister,
  getAllRegisteredBy,
  getById,
} from "~/server/services/register-event.service";

export const registerEventRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        userId: z.string(),
        type: z.string(),
        level: z.string(),
        name: z.string(),
        sex: z.string(),
        color: z.string(),
        birthdate: z.string(),
        microchip: z.string(),
        ownerName: z.string(),
        ownerTel: z.string(),
        fatherName: z.string(),
        motherName: z.string(),
        farmName: z.string(),
        buffaloAge: z.number(),
        province: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // if (!(await canRgister(input.eventId, input.microchip)))
      //   throw new TRPCError({
      //     code: "CONFLICT",
      //     message: "ควายตัวนี้สมัครไปแล้ว",
      //   });
      try {
        const dto: CreateNewEventRegisterDTO = {
          userId: input.userId,
          eventId: input.eventId,
          type: input.type,
          name: input.name,
          level: input.level,
          sex: input.sex,
          color: input.color,
          birthday: input.birthdate,
          microchip: input.microchip,
          ownerName: input.ownerName,
          ownerTel: input.ownerTel,
          buffaloAge: input.buffaloAge,
          fatherName: input.fatherName,
          motherName: input.motherName,
          farmName: input.farmName,
          province: input.province,
        };

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
    .input(z.object({ eventId: z.string(), microchip: z.string() }))
    .query(async ({ input }) => {
      return await canRgister(input.eventId, input.microchip);
    }),
  getAllRegisteredBy: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await getAllRegisteredBy(input.userId);
    }),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getById(input.id);
    }),
});
