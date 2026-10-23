import { verifyApplicantAuthorization } from "~/server/services/line-auth.service";
import { createRoyalCompetitionRegistration } from "~/server/services/competition-registration.service";
import { createTRPCRouter, publicProcedure } from "../trpc";
import z from "zod";
import { legacyCompetitionAdminProcedure } from "../legacy-competition-procedure";
import type { CreateNewEventRegisterDTO } from "~/interfaces/CreateNewEventRegisterDTO";
import { TRPCError } from "@trpc/server";
import {
  canRgister,
  createNewRegister,
  getAllRegisteredBy,
  getById,
  getRegisterByEvent,
} from "~/server/services/register-event.service";
import { royalMessageParser } from "~/server/messaging/message-parser";
import { notify } from "~/server/messaging/notification";

export const registerEventRouter = createTRPCRouter({
  registerRoyalEvent: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        userId: z.string(),
        idToken: z.string().min(1).optional(),
        lineAccessToken: z.string().min(1).optional(),
        operationId: z.string().uuid(),
        type: z.string(),
        level: z.string().optional(),
        name: z.string(),
        sex: z.enum(["male", "female"]),
        color: z.enum(["black", "albino"]),
        birthdate: z.string(),
        microchip: z.string(),
        ownerName: z.string(),
        ownerTel: z.string(),
        fatherName: z.string(),
        motherName: z.string(),
        farmName: z.string(),
        buffaloAge: z.number(),
        //address
        address: z.string(),
        amphoe: z.string(),
        district: z.string(),
        province: z.string(),
        zipcode: z.string(),
        //images urls
        buffaloImage: z.string(),
        buffaloImage2: z.string(),
        frontImage: z.string(),
        sideImage: z.string(),
        backImage: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await verifyApplicantAuthorization(input, input.userId);
        const result = await createRoyalCompetitionRegistration({
          ...input,
          birthday: input.birthdate,
          level: input.level ?? "ประเทศ",
          imageIds: [
            input.buffaloImage,
            input.buffaloImage2,
            input.frontImage,
            input.sideImage,
            input.backImage,
          ],
        });
        // Notification failure must not turn an already persisted signup into an apparent failure.
        try {
          if (!result.replayed)
            await notify(
              input.userId,
              royalMessageParser({
                ownerName: input.ownerName,
                buffaloName: input.name,
                microchip: input.microchip,
                docId: result.approvalId,
              }),
            );
        } catch {
          console.error("Royal registration notification failed");
        }
        return result.registration;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          message: error instanceof Error ? error.message : "ไม่สามารถสมัครได้",
          code: "BAD_REQUEST",
        });
      }
    }),
  register: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        userId: z.string(),
        idToken: z.string().min(1).optional(),
        lineAccessToken: z.string().min(1).optional(),
        operationId: z.string().uuid(),
        type: z.string(),
        level: z.string(),
        name: z.string(),
        sex: z.enum(["male", "female"]),
        color: z.enum(["black", "albino"]),
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
        await verifyApplicantAuthorization(input, input.userId);
        const dto: CreateNewEventRegisterDTO & { operationId: string } = {
          operationId: input.operationId,
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
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "ไม่สามารถสมัครได้",
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
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getById(input.id);
    }),
  getAllRegisterByEvent: legacyCompetitionAdminProcedure
    .input(z.object({ userId: z.string(), eventId: z.string() }))
    .query(async ({ input }) => {
      return await getRegisterByEvent(input.eventId);
    }),
});
