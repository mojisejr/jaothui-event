import { admin, createTRPCRouter, publicProcedure } from "../trpc";
import z from "zod";
import { CreateNewEventRegisterDTO } from "~/interfaces/CreateNewEventRegisterDTO";
import { TRPCError } from "@trpc/server";
import {
  canRgister,
  createNewRegister,
  getAllRegisteredBy,
  getById,
  getRegisterByEvent,
} from "~/server/services/register-event.service";
import { TRPCClientError } from "@trpc/client";
import {
  createNewApprovement,
  createNewEventAddress,
  createNewImageObjects,
} from "~/server/services/royal.service";
import { client } from "../../../../sanity/lib/client";
import { royalMessageParser } from "~/server/messaging/message-parser";
import { notify } from "~/server/messaging/notification";

export const registerEventRouter = createTRPCRouter({
  registerRoyalEvent: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        userId: z.string(),
        type: z.string(),
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
        //address
        address: z.string(),
        amphoe: z.string(),
        district: z.string(),
        province: z.string(),
        zipcode: z.string(),
        //images urls
        buffaloImage: z.string(),
        frontImage: z.string(),
        sideImage: z.string(),
        backImage: z.string(),
        // d1Image: z.string(),
        // d2Image: z.string(),
        // d3Image: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        //1.create new eventRegister data
        const eventRegisterResult = await createNewRegister({
          eventId: input.eventId,
          userId: input.userId,
          type: input.type,
          level: "ประเทศ",
          name: input.name,
          sex: input.sex,
          buffaloAge: input.buffaloAge,
          color: input.color,
          birthday: input.birthdate,
          microchip: input.microchip,
          ownerName: input.ownerName,
          ownerTel: input.ownerTel,
          //new: 15-oct-2024
          fatherName: input.farmName,
          motherName: input.motherName,
          farmName: input.farmName,
          province: input.province,
        });

        if (!eventRegisterResult)
          throw new TRPCClientError("ไมสามารถบันทึกข้อมูลได้");
        //2. create image object data

        const eventImageResult = await createNewImageObjects({
          userId: input.userId,
          eventId: input.eventId,
          eventRegisterId: eventRegisterResult._id,
          buffaloImageId: input.buffaloImage,
          frontImageId: input.frontImage,
          sideImageId: input.sideImage,
          backImageId: input.backImage,
          // d1ImageId: input.d1Image,
          // d2ImageId: input.d2Image,
          // d3ImageId: input.d3Image,
        });

        if (!eventImageResult) {
          await client.delete(eventRegisterResult._id);
          throw new TRPCClientError("ไม่สามารถบันทึกข้อมูลรูปภาพได้");
        }
        //3. create approvement data
        const approvementResult = await createNewApprovement({
          eventId: input.eventId,
          eventRegisterId: eventRegisterResult._id,
          imagesId: eventImageResult._id,
        });

        if (!approvementResult) {
          await client.delete(eventRegisterResult._id);
          await client.delete(eventImageResult._id);
          throw new TRPCClientError("ไม่สามารถบันทึกข้อมูลได้");
        }
        //4. create event address data
        const addressResult = await createNewEventAddress({
          userId: input.userId,
          eventId: input.eventId,
          eventRegisterId: eventRegisterResult._id,
          address: input.address,
          district: input.district,
          amphoe: input.amphoe,
          province: input.province,
          zipcode: input.zipcode,
        });

        if (!addressResult) {
          await client.delete(eventRegisterResult._id);
          await client.delete(eventImageResult._id);
          await client.delete(approvementResult._id);
          throw new TRPCClientError("ไม่สามารถบันทึกข้อมูลได้");
        }

        const message = royalMessageParser({
          ownerName: input.ownerName,
          buffaloName: input.name,
          microchip: input.microchip,
          docId: approvementResult._id,
        });

        await notify(input.userId, message);

        //5. notify user through line

        return eventRegisterResult;
      } catch (error) {
        throw new TRPCError({ message: "", code: "INTERNAL_SERVER_ERROR" });
      }
    }),
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
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getById(input.id);
    }),
  getAllRegisterByEvent: admin
    .input(z.object({ userId: z.string(), eventId: z.string() }))
    .query(async ({ input }) => {
      return await getRegisterByEvent(input.eventId);
    }),
});
