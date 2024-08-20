import { db } from "../db";
import { CreateNewEventRegisterDTO } from "~/interfaces/CreateNewEventRegisterDTO";
import { messageParser } from "../messaging/message-parser";
import { notify } from "../messaging/notification";
import { client } from "../../../sanity/lib/client";
import { groq } from "next-sanity";
import { EventRegister } from "~/interfaces/EventRegister";
import { TRPCError } from "@trpc/server";

export async function getAllRegisteredBy(userId: string) {
  try {
    const query = groq`*[_type=="eventRegister" && user._ref == "${userId}"]
  {
    _id,
    level,
    type,
    name,
    ownerName,
    ownerTel,
    color,
    birthday,
    gender,
    microchip,
    "user": user->{_id, role},
    "buffaloImage": buffaloImage.asset->url,
    "vaccineImage": vaccineImage.asset->url,
    "event": event->{title, description,startAt,endAt,isActive}
    }`;
    const found = await client.fetch<EventRegister[]>(query);

    console.log(found);
    return found;
    // const events = await db.eventRegister.findMany({
    //   where: {
    //     userId,
    //   },
    //   include: {
    //     event: true,
    //   },
    // });
    // return events;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getById(id: number) {
  try {
    const query = groq`*[_type == "eventRegister" && _id == "${id}"]{
        _id,
    level,
    type,
    name,
    ownerName,
    ownerTel,
    color,
    birthday,
    gender,
    microchip,
    "user": user->{_id, role},
    "buffaloImage": buffaloImage.asset->url,
    "vaccineImage": vaccineImage.asset->url,
    "event": event->{title, description,startAt,endAt,isActive}
  }[0]`;
    const found = await client.fetch<EventRegister>(query);
    return found;
    // const events = await db.eventRegister.findFirst({
    //   where: {
    //     id,
    //   },
    //   include: {
    //     event: true,
    //   },
    // });
    // return events;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function createNewRegister(event: CreateNewEventRegisterDTO) {
  try {
    // const query = groq`*[_type == "eventRegister" && event._ref == "${event.eventId}" && microchip == "${event.microchip}"][0]`;
    // const found = await client.fetch(query);
    // if (found) {
    //   throw new TRPCError({ code: "CONFLICT" });
    // }
    const newRegisterDocument = {
      _type: "eventRegister",
      type: event.type,
      level: event.level,
      name: event.name,
      sex: event.sex,
      color: event.color,
      birthday: event.birthday,
      microchip: event.microchip,
      ownerName: event.ownerName,
      ownerTel: event.ownerTel,
      buffaloAge: event.buffaloAge,
      user: {
        _type: "reference",
        _ref: event.userId,
      },
      event: {
        _type: "reference",
        _ref: event.eventId,
      },
    };

    const created = await client.create(newRegisterDocument);

    return created;

    // const newRegisteredEvent = await db.eventRegister.create({
    //   data: event,
    //   include: { event: true },
    // });
    // if (!newRegisteredEvent) return null;
    //prepared message for pushing
    // const message = messageParser({
    //   ownerName: newRegisteredEvent.ownerName,
    //   buffaloName: newRegisteredEvent.name,
    //   microchip: newRegisteredEvent.microchip,
    //   eventName: newRegisteredEvent.event.name,
    //   eventAt: newRegisteredEvent.event.eventAt,
    // });
    // // notify user
    // await notify(newRegisteredEvent.userId, message);
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function canRgister(eventId: string, microchip: string) {
  try {
    const query = groq`*[_type == "eventRegister" && event._ref == "${eventId}" && microchip == "${microchip}"][0]`;
    const found = await client.fetch<any>(query);

    if (!found) {
      return true;
    } else {
      return false;
    }

    // const found = await db.eventRegister.findMany({
    //   where: {
    //     eventId,
    //     microchip,
    //   },
    // });

    // if (found.length <= 0) {
    //   return true;
    // } else {
    //   return false;
    // }
  } catch (error) {
    console.log(error);
    return false;
  }
}
