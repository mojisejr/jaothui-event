import { db } from "../db";
import { CreateNewEventRegisterDTO } from "~/interfaces/CreateNewEventRegisterDTO";
import { messageParser } from "../messaging/message-parser";
import { notify } from "../messaging/notification";

export async function getAllRegisteredBy(userId: string) {
  try {
    const events = await db.eventRegister.findMany({
      where: {
        userId,
      },
      include: {
        event: true,
      },
    });
    return events;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getById(id: number) {
  try {
    const events = await db.eventRegister.findFirst({
      where: {
        id,
      },
      include: {
        event: true,
      },
    });
    return events;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function createNewRegister(event: CreateNewEventRegisterDTO) {
  try {
    const newRegisteredEvent = await db.eventRegister.create({
      data: event,
      include: { event: true },
    });

    if (!newRegisteredEvent) return null;

    //prepared message for pushing
    const message = messageParser({
      ownerName: newRegisteredEvent.ownerName,
      buffaloName: newRegisteredEvent.name,
      microchip: newRegisteredEvent.microchip,
      eventName: newRegisteredEvent.event.name,
      eventAt: newRegisteredEvent.event.eventAt,
    });

    // notify user
    await notify(newRegisteredEvent.userId, message);
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
