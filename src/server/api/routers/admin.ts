import { admin, createTRPCRouter, publicProcedure } from "../trpc";
import z from "zod";
import { AdminRegisterDTO, createAdminRegister, checkDuplicateMicrochip } from "~/server/services/admin-register.service";
import { TRPCError } from "@trpc/server";

export const adminRouter = createTRPCRouter({
  /**
   * Get events visible to admin registration flow
   * Uses admin visibility logic (allows post-deadline while event is still active)
   */
  getActiveEvents: publicProcedure.query(async () => {
    const { getAdminActiveEvents } = await import("~/server/services/event.service");
    return await getAdminActiveEvents();
  }),

  /**
   * Check if a microchip is already registered for an event
   * Used for duplicate detection with admin override
   */
  checkDuplicate: publicProcedure
    .input(z.object({ 
      eventId: z.string(), 
      microchip: z.string() 
    }))
    .query(async ({ input }) => {
      return await checkDuplicateMicrochip(input.eventId, input.microchip);
    }),

  /**
   * Admin registration with auto-approval
   * - Auto-approves all admin registrations
   * - Sanity-only storage
   * - Admin user association
   * - Duplicate detection with override option
   */
  registerAdminEvent: admin
    .input(
      z.object({
        eventId: z.string(),
        userId: z.string(),
        type: z.string(),
        level: z.string(),
        name: z.string(),
        sex: z.string(),
        color: z.string(),
        birthday: z.string(),
        microchip: z.string(),
        ownerName: z.string(),
        ownerTel: z.string(),
        fatherName: z.string(),
        motherName: z.string(),
        farmName: z.string(),
        buffaloAge: z.number(),
        province: z.string(),
        overrideDuplicate: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Validate required fields
        const requiredFields = [
          'eventId', 'userId', 'type', 'level', 'name', 
          'sex', 'color', 'birthday', 'microchip', 
          'ownerName', 'ownerTel', 'fatherName', 'motherName', 
          'farmName', 'buffaloAge', 'province'
        ];
        
        for (const field of requiredFields) {
          if (!input[field as keyof typeof input]) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `จำเป็นต้องกรอกข้อมูล ${field}`,
            });
          }
        }

        // Validate age range (months)
        if (input.buffaloAge < 1 || input.buffaloAge > 360) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "อายุควายต้องอยู่ระหว่าง 1-360 เดือน",
          });
        }

        // Validate microchip format (basic validation)
        if (!input.microchip || input.microchip.trim().length < 3) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "หมายเลข microchip ให้ถูกต้อง",
          });
        }

        const adminData: AdminRegisterDTO = {
          eventId: input.eventId,
          userId: input.userId,
          type: input.type,
          level: input.level,
          name: input.name,
          sex: input.sex,
          color: input.color,
          birthday: input.birthday,
          microchip: input.microchip,
          ownerName: input.ownerName,
          ownerTel: input.ownerTel,
          fatherName: input.fatherName,
          motherName: input.motherName,
          farmName: input.farmName,
          buffaloAge: input.buffaloAge,
          province: input.province,
          overrideDuplicate: input.overrideDuplicate,
        };

        const result = await createAdminRegister(adminData);

        if (!result.success) {
          if (result.duplicateWarning && !result.duplicateWarning.exists) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: result.error ?? "ไม่สามารถลงทะเบียนได้",
            });
          }
        }

        return result;

      } catch (error) {
        console.error("Admin registration error:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "เกิดข้อผิดพลาดในระบบการลงทะเบียน",
        });
      }
    }),
});
