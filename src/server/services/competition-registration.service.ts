import {
  registrationIdentity,
  existingRegistration,
} from "./competition-idempotency.service";
import type { CreateNewEventRegisterDTO } from "~/interfaces/CreateNewEventRegisterDTO";
import { client } from "~/server/sanity/client";
import {
  assertCompetitionRegistration,
  calculateRegistrationAge,
  type CompetitionPolicyEvent,
} from "./competition-policy";
import { getPossibleEvents, getSpecialEvents } from "~/utils/getPossibleEvents";
export type RegistrationEvent = CompetitionPolicyEvent & {
  _id: string;
  _rev: string;
  eventType?: string;
};
export async function prepareCompetitionRegistration(
  data: {
    eventId: string;
    birthday: string;
    type: string;
    level: string;
    color?: string;
  },
  audience: "public" | "onsite",
  now = new Date(),
) {
  const event = await client.getDocument<RegistrationEvent>(data.eventId);
  if (!event) throw new Error("ไม่พบงานแข่งขัน");
  assertCompetitionRegistration(event, audience, now);
  const age = calculateRegistrationAge(event, data.birthday, data.color);
  const catalogType =
    data.level === "จังหวัด"
      ? "provinceEventType"
      : data.level === "ประเทศ"
        ? "nationalEventType"
        : null;
  if (!catalogType) throw new Error("ระดับการแข่งขันไม่ถูกต้อง");
  const catalogs = await client.fetch<Array<{ data: string[] }>>(
    "*[_type == $catalogType && event._ref == $eventId]{data}",
    { catalogType, eventId: data.eventId },
  );
  const labels = catalogs.flatMap((catalog) => catalog.data ?? []);
  const normalize = (label: string) =>
    label
      .replace(/\[SP\]/g, "")
      .trim()
      .replace(/\s+/g, " ");
  const allowed = [
    ...getPossibleEvents(age, labels),
    ...getSpecialEvents(labels),
  ].filter((label): label is string => !!label);
  const type = allowed.find(
    (label) => normalize(label) === normalize(data.type),
  );
  if (!type) throw new Error("รุ่นการแข่งขันไม่ตรงกับอายุหรือชุดรุ่นของงาน");
  return { event, buffaloAge: age, type: normalize(type) };
}
/** Every competing admin mutation touches this same revision, so close/rule changes cannot race a stale signup. */
export function registrationTransaction(event: RegistrationEvent) {
  return client
    .transaction()
    .patch(event._id, (patch) =>
      patch
        .ifRevisionId(event._rev)
        .setIfMissing({
          competitionWriteFence: 0,
          competitionRegistrationCount: 0,
        })
        .inc({ competitionWriteFence: 1, competitionRegistrationCount: 1 }),
    );
}

export async function createRoyalCompetitionRegistration(
  data: CreateNewEventRegisterDTO & {
    operationId: string;
    address: string;
    district: string;
    amphoe: string;
    zipcode: string;
    imageIds: string[];
  },
) {
  const payload = { ...data };
  const identity = registrationIdentity(data, payload);
  const existing = await existingRegistration(identity.id, identity.hash);
  if (existing)
    return {
      registration: existing,
      approvalId: `${identity.id}.approval`,
      replayed: true,
    };
  const prepared = await prepareCompetitionRegistration(data, "public");
  if (prepared.event.eventType !== "royal")
    throw new Error("กิจกรรมนี้ไม่ใช่ประเภท Royal");
  const ownedAssets = await client.fetch<number>(
    'count(*[_type == "sanity.imageAsset" && _id in $ids && source.id == $owner])',
    { ids: data.imageIds, owner: `competition:${data.eventId}:${data.userId}` },
  );
  if (new Set(data.imageIds).size !== 5 || ownedAssets !== 5)
    throw new Error("รูปภาพไม่ตรงกับผู้สมัครและงานนี้ กรุณาอัพโหลดใหม่");
  const registerId = identity.id,
    imageId = `${identity.id}.images`,
    approvalId = `${identity.id}.approval`;
  const registration = {
    _id: registerId,
    registrationRequestHash: identity.hash,
    _type: "eventRegister",
    type: prepared.type,
    level: data.level,
    name: data.name,
    sex: data.sex,
    color: data.color,
    birthday: data.birthday,
    microchip: data.microchip,
    ownerName: data.ownerName,
    ownerTel: data.ownerTel,
    fatherName: data.fatherName,
    motherName: data.motherName,
    farmName: data.farmName,
    province: data.province,
    buffaloAge: prepared.buffaloAge,
    user: { _type: "reference", _ref: data.userId },
    event: { _type: "reference", _ref: data.eventId },
  };
  const refs = {
    event: { _type: "reference", _ref: data.eventId },
    eventRegister: { _type: "reference", _ref: registerId },
  };
  const image = {
    _id: imageId,
    _type: "eventImage",
    ...refs,
    user: { _type: "reference", _ref: data.userId },
    imageArray: data.imageIds.map((id, index) => ({
      _key: String(index),
      imageTitle: [
        "ภาพประจำตัวสัตว์ (ภาพที่ 1)",
        "ภาพประจำตัวสัตว์ (ภาพที่ 2)",
        "ภาพถ่ายหน้าตรงกระบือ",
        "ภาพถ่ายด้านข้างกระบือ",
        "ภาพถ่ายด้านท้ายกระบือ",
      ][index],
      imageAsset: { _type: "image", asset: { _type: "reference", _ref: id } },
    })),
  };
  const approval = {
    _id: approvalId,
    _type: "approvment",
    ...refs,
    eventImage: { _type: "reference", _ref: imageId },
  };
  const address = {
    _id: `${identity.id}.address`,
    _type: "eventAddress",
    ...refs,
    user: { _type: "reference", _ref: data.userId },
    address: data.address,
    district: data.district,
    amphoe: data.amphoe,
    province: data.province,
    zipcode: data.zipcode,
  };
  try {
    const results = await registrationTransaction(prepared.event)
      .create(registration)
      .create(image)
      .create(approval)
      .create(address)
      .commit({ returnDocuments: true });
    return { registration: results[1]!, approvalId, replayed: false };
  } catch (error) {
    const replay = await existingRegistration(identity.id, identity.hash);
    if (replay) return { registration: replay, approvalId, replayed: true };
    throw error;
  }
}
