import { CreateNewApprovementDTO } from "~/interfaces/CreateNewApprovementDTO";
import { client } from "../../../sanity/lib/client";
import { CreateNewImageObjectDTO } from "~/interfaces/CreateImageObjectDTO";
import { CreateNewEventAddressDTO } from "~/interfaces/CreateNewEventAddress";
import { groq } from "next-sanity";
import { EventImages } from "~/interfaces/EventImage";
import { EventApprovement } from "~/interfaces/EventApprovement";
import { EventAddress } from "~/interfaces/EventAddress";

export const royalEventId = "dc6428a0-814c-430c-878a-42e8365adbb0";

export const createNewImageObjects = async (
  object: CreateNewImageObjectDTO,
) => {
  try {
    const document = {
      _type: "eventImage",
      user: {
        _ref: object.userId,
        _type: "reference",
      },
      event: {
        _ref: object.eventId,
        _type: "reference",
      },
      imageArray: [
        {
          _key: object.buffaloImageId,
          imageTitle: "ภาพประจำตัวสัตว์",
          imageAsset: {
            _type: "image",
            asset: { _type: "reference", _ref: object.buffaloImageId },
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
        {
          _key: object.d1ImageId,
          imageTitle: "เอกสารตรวจโรคแท้งติดต่อ",
          imageAsset: {
            _type: "image",
            asset: { _type: "reference", _ref: object.d1ImageId },
          },
        },
        {
          _key: object.d2ImageId,
          imageTitle: "ใบรับรองการตรวจโครโมโซม",
          imageAsset: {
            _type: "image",
            asset: { _type: "reference", _ref: object.d2ImageId },
          },
        },
        {
          _key: object.d3ImageId,
          imageTitle: "ใบรับรองการฉีดวัคซีน FMD และคอบวม",
          imageAsset: {
            _type: "image",
            asset: { _type: "reference", _ref: object.d3ImageId },
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
      _type: "eventAddress",
      user: {
        _type: "reference",
        _ref: event.userId,
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

export const getAllRegistered = async () => {
  try {
    const query = groq`*[_type == "eventRegister" && event._ref == "${royalEventId}"]{
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

export const getImages = async (userId: string) => {
  try {
    const query = groq`*[_type == "eventImage" && event._ref == "${royalEventId}" && user._ref == "${userId}"]{
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

export const getApprovement = async (userId: string) => {
  try {
    const query = groq`*[_type == "approvment" && eventRegister._ref == "${userId}" && event._ref == "${royalEventId}"]{
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

export const approve = async (docId: string) => {
  try {
    const result = await client
      .patch(docId)
      .set({
        approve: true,
      })
      .commit();

    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getAddress = async (userId: string) => {
  try {
    const query = groq`*[_type == "eventAddress" && event._ref == "${royalEventId}" && user._ref == "${userId}"]{
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
