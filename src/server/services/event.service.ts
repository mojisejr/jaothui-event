import { db } from "../db";

export async function getAllActiveEvents() {
  try {
    const events = await db.event.findMany({
      where: {
        isActive: true,
      },
    });
    return events;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getAllEvents() {
  try {
    const events = await db.event.findMany();
    return events;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function isRegistered(microchip: string, eventId: number) {
  try {
    const found = await db.event.findMany({
      where: {
        id: eventId,
      },
      include: {
        EventRegister: {
          where: {
            microchip,
          },
        },
      },
    });
    console.log(found);
    if (found) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
}
