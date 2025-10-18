import { CreateNewEventRegisterDTO } from "~/interfaces/CreateNewEventRegisterDTO";
import { client } from "../../../sanity/lib/client";
import { groq } from "next-sanity";
import { TRPCError } from "@trpc/server";

export interface AdminRegisterDTO extends CreateNewEventRegisterDTO {
  overrideDuplicate?: boolean;
}

export interface AdminRegisterResult {
  success: boolean;
  registration?: any;
  duplicateWarning?: {
    exists: boolean;
    message: string;
    existingRegistration?: any;
  };
  error?: string;
}

/**
 * Create admin registration with auto-approval
 * - Stores in Sanity only (not PostgreSQL)
 * - Auto-approves registration
 * - Checks for duplicates with admin override option
 */
export async function createAdminRegister(data: AdminRegisterDTO): Promise<AdminRegisterResult> {
  try {
    // Check for duplicate microchip in same event
    const duplicateQuery = groq`*[_type == "eventRegister" && event._ref == "${data.eventId}" && microchip == "${data.microchip}"][0]{
      _id,
      name,
      ownerName,
      microchip,
      type,
      level,
      "event": event->{title},
      approvementResult
    }`;
    
    const existingRegistration = await client.fetch(duplicateQuery);
    
    let duplicateWarning = null;
    
    if (existingRegistration) {
      duplicateWarning = {
        exists: true,
        message: `ควาย microchip ${data.microchip} มีการลงทะเบียนไปแล้วในงานนี้โดย ${existingRegistration.ownerName}`,
        existingRegistration
      };
      
      // If admin doesn't want to override, return warning
      if (!data.overrideDuplicate) {
        return {
          success: false,
          duplicateWarning
        };
      }
    }

    // Create the registration document
    const newRegisterDocument = {
      _type: "eventRegister",
      type: data.type,
      level: data.level,
      name: data.name,
      sex: data.sex,
      color: data.color,
      birthday: data.birthday,
      microchip: data.microchip,
      ownerName: data.ownerName,
      ownerTel: data.ownerTel,
      buffaloAge: data.buffaloAge,
      fatherName: data.fatherName,
      motherName: data.motherName,
      farmName: data.farmName,
      province: data.province,
      user: {
        _type: "reference",
        _ref: data.userId,
      },
      event: {
        _type: "reference",
        _ref: data.eventId,
      },
      // Admin registration specific fields
      isAdminRegistration: true,
      registeredAt: new Date().toISOString(),
    };

    const createdRegistration = await client.create(newRegisterDocument);
    
    if (!createdRegistration) {
      return {
        success: false,
        error: "ไม่สามารถสร้างการลงทะเบียนได้"
      };
    }

    // Create auto-approval record
    const approvementDocument = {
      _type: "approvment",
      approvementResult: true,
      approvementDate: new Date().toISOString(),
      approvementBy: {
        _type: "reference",
        _ref: data.userId,
      },
      approvementNote: "ลงทะเบียนโดย Admin ที่งาน (อนุมัติอัตโนมัติ)",
      event: {
        _type: "reference",
        _ref: data.eventId,
      },
      eventRegister: {
        _type: "reference",
        _ref: createdRegistration._id,
      },
    };

    const approvalResult = await client.create(approvementDocument);
    
    if (!approvalResult) {
      // Clean up registration if approval fails
      await client.delete(createdRegistration._id);
      return {
        success: false,
        error: "ไม่สามารถสร้างการอนุมัติได้"
      };
    }

    return {
      success: true,
      registration: {
        ...createdRegistration,
        approval: approvalResult
      },
      duplicateWarning: duplicateWarning ?? undefined
    };

  } catch (error) {
    console.error("Admin registration error:", error);
    return {
      success: false,
      error: "เกิดข้อผิดพลาดในการลงทะเบียน"
    };
  }
}

/**
 * Check if a microchip is already registered for an event
 */
export async function checkDuplicateMicrochip(eventId: string, microchip: string): Promise<{
  exists: boolean;
  registration?: any;
}> {
  try {
    const query = groq`*[_type == "eventRegister" && event._ref == "${eventId}" && microchip == "${microchip}"][0]{
      _id,
      name,
      ownerName,
      microchip,
      type,
      level,
      "event": event->{title},
      approvementResult
    }`;
    
    const existingRegistration = await client.fetch(query);
    
    return {
      exists: !!existingRegistration,
      registration: existingRegistration || undefined
    };
  } catch (error) {
    console.error("Error checking duplicate microchip:", error);
    return {
      exists: false
    };
  }
}
