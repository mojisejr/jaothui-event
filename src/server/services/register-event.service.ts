import { db } from "../db";
import { CreateNewEventRegisterDTO } from "~/interfaces/CreateNewEventRegisterDTO";

export async function createNewRegister(event: CreateNewEventRegisterDTO) {
  try {
    return await db.eventRegister.create({ data: event });
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function canRgister(eventId: number, microchip: string) {
  try {
    const found = await db.eventRegister.findMany({
      where: {
        eventId,
        microchip,
      },
    });
    if (found.length <= 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
}
