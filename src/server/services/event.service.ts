import { db } from "../db";
import { client } from "../../../sanity/lib/client";
import { groq } from "next-sanity";
import { Event } from "~/interfaces/Event";

export async function getAllActiveEvents() {
  try {
    const query = groq`*[_type == "event" && isActive == true] {
    "eventId": _id,
    "imageUrl": image.asset -> url,
    "name": title,
    "eventAt": startAt,
    metadata
    }`;

    const events = await client.fetch<Event[]>(query);
    // const events = await db.event.findMany({
    //   where: {
    //     isActive: true,
    //   },
    // });
    // return events;
    console.log(events);
    return events;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getAllEvents() {
  try {
    const query = groq`*[_type == "event"] {
      "eventId": _id,
      "imageUrl": image.asset -> url,
      "name": title,
      "eventAt": startAt,
      metadata
      }`;

    const events = await client.fetch<Event>(query);
    // const events = await db.event.findMany({
    //   where: {
    //     isActive: true,
    //   },
    // });
    // return events;
    console.log(events);
    return events;
    // const events = await db.event.findMany();
    // return events;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function isRegistered(microchip: string, eventId: number) {
  try {
    const query = groq`*[_type == "event" && eventId == "${eventId}" && microchip == "${microchip}"][0]`;

    const found = await client.fetch<any>(query);

    // const found = await db.event.findMany({
    //   where: {
    //     id: eventId,
    //   },
    //   include: {
    //     EventRegister: {
    //       where: {
    //         microchip,
    //       },
    //     },
    //   },
    // });
    // console.log(found);
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
