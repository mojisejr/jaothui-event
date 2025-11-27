import { client } from "../../../sanity/lib/client";
import { groq } from "next-sanity";
import type { Event } from "~/interfaces/Event";
import { getPossibleEvents, parseAgeRanges, findExactAgeMatch } from "~/utils/getPossibleEvents";

export async function getEventById(eventId: string) {
  try {
    const query = groq`*[_type == "event" && _id == "${eventId}"] {
    "eventId": _id,
    "imageUrl": image.asset -> url,
    "name": title,
    "eventAt": startAt,
    endAt,
    "deadline": buffaloAgeDeadline,
    "eventType": eventType,
    metadata,
    isActive,
    registrationActive,
    registrationStartAt,
    registrationDeadline
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
    "deadline": buffaloAgeDeadline,
    "eventType": eventType,
    endAt,
    metadata,
    isActive,
    registrationActive,
    registrationStartAt,
    registrationDeadline
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

export async function getRegistrationOpenEvents() {
  try {
    const query = groq`*[_type == "event" && isActive == true] {
    "eventId": _id,
    "imageUrl": image.asset -> url,
    "name": title,
    "eventAt": startAt,
    "deadline": buffaloAgeDeadline,
    "eventType": eventType,
    endAt,
    metadata,
    isActive,
    registrationActive,
    registrationStartAt,
    registrationDeadline
    }`;

    const events = await client.fetch<Event[]>(query);
    
    // Filter events based on registration status and date windows
    const now = new Date();
    const registrationOpenEvents = events.filter((event) => {
      // If registrationActive is explicitly false, exclude the event
      if (event.registrationActive === false) {
        return false;
      }

      // Check registration start date
      if (event.registrationStartAt) {
        const startDate = new Date(event.registrationStartAt);
        if (now < startDate) {
          return false; // Registration hasn't opened yet
        }
      }

      // Check registration deadline
      if (event.registrationDeadline) {
        const deadlineDate = new Date(event.registrationDeadline);
        if (now > deadlineDate) {
          return false; // Registration has closed
        }
      }

      // If no explicit registration control fields, fall back to event deadline
      if (!event.registrationDeadline && event.deadline) {
        const eventDeadline = new Date(event.deadline);
        if (now > eventDeadline) {
          return false;
        }
      }

      return true;
    });

    return registrationOpenEvents;
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
    "deadline": buffaloAgeDeadline,
    "eventType": eventType,
    isActive,
    endAt,
    metadata,
    registrationActive,
    registrationStartAt,
    registrationDeadline
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

export const getEventTypes = async (eventId: string, age: number) => {
  const provinceQuery = groq`*[_type=="provinceEventType" && event._ref=="${eventId}"]{data}[0]`;
  const nationalQuery = groq`*[_type=="nationalEventType" && event._ref=="${eventId}"]{data}[0]`;

  const provinceTypes = await client.fetch<{ data: any[] }>(provinceQuery);
  const nationalTypes = await client.fetch<{ data: any[] }>(nationalQuery);

  const provinceFiltered = getPossibleEvents(
    age,
    provinceTypes == null ? [] : provinceTypes.data,
  );
  const nationalFiltered = getPossibleEvents(
    age,
    nationalTypes == null ? [] : nationalTypes.data,
  );

  const types = {
    provinceTypes: provinceTypes ? provinceFiltered : [],
    nationalTypes: nationalTypes ? nationalFiltered : [],
  };

  return types;
};

export const getEventTypesWithAutoAssignment = async (eventId: string, age: number) => {
  const provinceQuery = groq`*[_type=="provinceEventType" && event._ref=="${eventId}"]{data}[0]`;
  const nationalQuery = groq`*[_type=="nationalEventType" && event._ref=="${eventId}"]{data}[0]`;

  const provinceTypes = await client.fetch<{ data: any[] }>(provinceQuery);
  const nationalTypes = await client.fetch<{ data: any[] }>(nationalQuery);

  const provinceData = provinceTypes == null ? [] : provinceTypes.data;
  const nationalData = nationalTypes == null ? [] : nationalTypes.data;

  // Parse age ranges
  const provinceRanges = parseAgeRanges(provinceData);
  const nationalRanges = parseAgeRanges(nationalData);

  // Find exact matches
  const provinceMatch = findExactAgeMatch(age, provinceRanges);
  const nationalMatch = findExactAgeMatch(age, nationalRanges);

  // Determine auto-assignment
  let autoAssignment: {
    success: boolean;
    competitionLevel: string | null;
    competitionType: string | null;
    message: string;
  } = {
    success: false,
    competitionLevel: null,
    competitionType: null,
    message: "",
  };

  if (provinceMatch && nationalMatch) {
    // Both levels have matches, default to province level
    autoAssignment = {
      success: true,
      competitionLevel: "จังหวัด",
      competitionType: provinceMatch.original,
      message: `อายุ ${age} เดือน - จัดระดับจังหวัด รุ่น ${provinceMatch.original}`,
    };
  } else if (provinceMatch) {
    // Only province level has a match
    autoAssignment = {
      success: true,
      competitionLevel: "จังหวัด",
      competitionType: provinceMatch.original,
      message: `อายุ ${age} เดือน - จัดระดับจังหวัด รุ่น ${provinceMatch.original}`,
    };
  } else if (nationalMatch) {
    // Only national level has a match
    autoAssignment = {
      success: true,
      competitionLevel: "ประเทศ",
      competitionType: nationalMatch.original,
      message: `อายุ ${age} เดือน - จัดระดับประเทศ รุ่น ${nationalMatch.original}`,
    };
  } else {
    // No matches found
    autoAssignment = {
      success: false,
      competitionLevel: null,
      competitionType: null,
      message: `ไม่พบรุ่นที่เหมาะสมสำหรับอายุ ${age} เดือน กรุณาตรวจสอบอายุหรือติดต่อเจ้าหน้าที่`,
    };
  }

  const provinceFiltered = getPossibleEvents(age, provinceData);
  const nationalFiltered = getPossibleEvents(age, nationalData);

  return {
    provinceTypes: provinceTypes ? provinceFiltered : [],
    nationalTypes: nationalTypes ? nationalFiltered : [],
    autoAssignment,
  };
};
