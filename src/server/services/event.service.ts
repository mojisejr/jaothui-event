import { client } from "../../../sanity/lib/client";
import { groq } from "next-sanity";
import { Event } from "~/interfaces/Event";

export async function getEventById(eventId: string) {
  try {
    const query = groq`*[_type == "event" && _id == "${eventId}"] {
    "eventId": _id,
    "imageUrl": image.asset -> url,
    "name": title,
    "eventAt": startAt,
    endAt,
    metadata
    }[0]`;

    const event = await client.fetch<Event>(query);
    // const events = await db.event.findMany({
    //   where: {
    //     isActive: true,
    //   },
    // });
    // return events;
    return event;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getAllActiveEvents() {
  try {
    const query = groq`*[_type == "event" && isActive == true] {
    "eventId": _id,
    "imageUrl": image.asset -> url,
    "name": title,
    "eventAt": startAt,
    endAt,
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
      endAt,
      isActive,
      metadata
      }`;

    const events = await client.fetch<Event[]>(query);
    return events;
  } catch (error) {
    console.log(error);
    return null;
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

export const getEventTypes = async (eventId: string) => {
  const provinceQuery = groq`*[_type=="provinceEventType"]{data}[0]`;
  const nationalQuery = groq`*[_type=="nationalEventType"]{data}[0]`;

  const provinceTypes = await client.fetch<{ data: any[] }>(provinceQuery);
  const nationalTypes = await client.fetch<{ data: any[] }>(nationalQuery);

  const types = {
    provinceTypes: provinceTypes ? provinceTypes.data : [],
    nationalTypes: nationalTypes ? nationalTypes.data : [],
  };

  return types;
};
