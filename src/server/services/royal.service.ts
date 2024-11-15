import { CreateNewApprovementDTO } from "~/interfaces/CreateNewApprovementDTO";
import { client } from "../../../sanity/lib/client";
import { CreateNewImageObjectDTO } from "~/interfaces/CreateImageObjectDTO";
import { CreateNewEventAddressDTO } from "~/interfaces/CreateNewEventAddress";

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
