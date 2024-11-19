import { CreateNewEventRegisterDTO } from "~/interfaces/CreateNewEventRegisterDTO";
import { client } from "../../../sanity/lib/client";
import { groq } from "next-sanity";
import { EventRegister } from "~/interfaces/EventRegister";
import dayjs from "dayjs";

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
  sex,
  microchip,
  province,
  fatherName,
  motherName,
  farmName,
  "user": user->{_id, role},
  buffaloAge,
  "event": event->{ title, startAt, endAt, description, isActive },
    }`;

    const found = await client.fetch<EventRegister[]>(query);

    const filter = found.filter((e) =>
      dayjs(new Date()).isBefore(dayjs(e.event.endAt)),
    );

    return filter;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getById(id: string) {
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
  sex,
  microchip,
  province,
  fatherName,
  motherName,
  farmName,
  "user": user->{_id, role},
  buffaloAge,
    "event": event->{ title, startAt, endAt, description, isActive },
    }[0]`;
    const found = await client.fetch<EventRegister>(query);

    return found;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function createNewRegister(event: CreateNewEventRegisterDTO) {
  try {
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
      //new 15-oct-2024
      fatherName: event.fatherName,
      motherName: event.motherName,
      farmName: event.farmName,
      province: event.province,
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
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function getRegisterByEvent(eventId: string) {
  try {
    const query = groq`*[_type == "eventRegister" && event._ref == "${eventId}"]{
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
    const results = await client.fetch<EventRegister[]>(query);
    return results;
  } catch (error) {
    console.log(error);
    return null;
  }
}
