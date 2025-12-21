import { CreateNewApprovementDTO } from "~/interfaces/CreateNewApprovementDTO";
import { client } from "../../../sanity/lib/client";
import { CreateNewImageObjectDTO } from "~/interfaces/CreateImageObjectDTO";
import { CreateNewEventAddressDTO } from "~/interfaces/CreateNewEventAddress";
import { groq } from "next-sanity";
import { EventImages } from "~/interfaces/EventImage";
import { EventApprovement } from "~/interfaces/EventApprovement";
import { EventAddress } from "~/interfaces/EventAddress";

// Note: Legacy hardcoded royalEventId has been removed.
// All functions now accept eventId as a parameter for dynamic event support.

export const createNewImageObjects = async (
  object: CreateNewImageObjectDTO,
) => {
  try {
    const document = {
      title: `${object.eventId}_${object.userId}`,
      _type: "eventImage",
      user: {
        _ref: object.userId,
        _type: "reference",
      },
      eventRegister: {
        _ref: object.eventRegisterId,
        _type: "reference",
      },
      event: {
        _ref: object.eventId,
        _type: "reference",
      },
      imageArray: [
        {
          _key: object.buffaloImageId,
          imageTitle: "ภาพประจำตัวสัตว์ (ภาพที่ 1)",
          imageAsset: {
            _type: "image",
            asset: { _type: "reference", _ref: object.buffaloImageId },
          },
        },
        {
          _key: object.buffaloImage2Id,
          imageTitle: "ภาพประจำตัวสัตว์ (ภาพที่ 2)",
          imageAsset: {
            _type: "image",
            asset: { _type: "reference", _ref: object.buffaloImage2Id },
          },
        },
        {
          _key: object.frontImageId,
          imageTitle: "ภาพถ่ายหน้าตรงกระบือ",
          imageAsset: {
            _type: "image",
            asset: { _type: "reference", _ref: object.frontImageId },
          },
        },
        {
          _key: object.backImageId,
          imageTitle: "ภาพถ่ายด้านท้ายกระบือ",
          imageAsset: {
            _type: "image",
            asset: { _type: "reference", _ref: object.backImageId },
          },
        },
        {
          _key: object.sideImageId,
          imageTitle: "ภาพถ่ายด้านข้างกระบือ",
          imageAsset: {
            _type: "image",
            asset: { _type: "reference", _ref: object.sideImageId },
          },
        },
      ],
    };
    const created = await client.create(document);
    return created;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export async function createNewApprovement(event: CreateNewApprovementDTO) {
  try {
    const approvement = {
      //eventId_eventRegisterId_imagesId
      title: `${event.eventId}_${event.eventRegisterId}_${event.imagesId}`,
      _type: "approvment",
      event: {
        _type: "reference",
        _ref: event.eventId,
      },
      eventRegister: {
        _type: "reference",
        _ref: event.eventRegisterId,
      },
      eventImage: {
        _type: "reference",
        _ref: event.imagesId,
      },
    };
    const created = await client.create(approvement);
    return created;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export const createNewEventAddress = async (
  event: CreateNewEventAddressDTO,
) => {
  try {
    const address = {
      //eventId_userId
      title: `${event.eventId}_${event.userId}`,
      _type: "eventAddress",
      user: {
        _type: "reference",
        _ref: event.userId,
      },
      eventRegister: {
        _type: "reference",
        _ref: event.eventRegisterId,
      },
      event: {
        _type: "reference",
        _ref: event.eventId,
      },
      address: event.address,
      district: event.district,
      amphoe: event.amphoe,
      province: event.province,
      zipcode: event.zipcode,
    };
    const created = await client.create(address);
    return created;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getAllRegistered = async (eventId: string) => {
  try {
    const query = groq`*[_type == "eventRegister" && event._ref == "${eventId}"]{
      sex,
      microchip,
      ownerName,
      province,
      "userId": user._ref,
      birthday,
      farmName,
      buffaloAge,
      name,
      type,
      fatherName,
      motherName,
      color,
      ownerTel
    }`;
    const data = await client.fetch(query);
    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getImages = async (eventId: string, registerEventId: string) => {
  try {
    const query = groq`*[_type == "eventImage" && event._ref == "${eventId}" && eventRegister._ref == "${registerEventId}"]{
    _id,
    "imageArray": imageArray[]{
      "title": imageTitle,
      "image": imageAsset.asset->url
    }
    }[0]`;
    const data = await client.fetch<EventImages>(query);
    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getApprovement = async (eventId: string, userId: string) => {
  try {
    const query = groq`*[_type == "approvment" && eventRegister._ref == "${userId}" && event._ref == "${eventId}"]{
      _id,
      approvementResult
    }[0]`;
    const data = await client.fetch<EventApprovement>(query);
    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getPublicApprovementStatus = async (docId: string) => {
  try {
    const query = groq`*[_type == "approvment" && _id == "${docId}"][0]`;
    const data = await client.fetch<any>(query);
    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const approve = async (
  docId: string,
  approve: boolean,
  comment?: string,
) => {
  try {
    const result = await client
      .patch(docId)
      .set({
        approvementResult: approve,
        comment: comment ?? "ผ่านการอนุมัติเรียบร้อยแล้ว",
      })
      .commit();

    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getAddress = async (eventId: string, registerEventId: string) => {
  try {
    const query = groq`*[_type == "eventAddress" && event._ref == "${eventId}" && eventRegister._ref == "${registerEventId}"]{
      address,
      district,
      amphoe,
      province,
      zipcode
    }[0]`;
    const data = await client.fetch<EventAddress>(query);
    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
};
