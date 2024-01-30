import { MessageParserDTO } from "~/interfaces/MessageParserDTO";

export function messageParser({
  ownerName,
  buffaloName,
  eventName,
  microchip,
  eventAt,
}: MessageParserDTO) {
  return `
  สมัครเข้าร่วมประกวดในงาน ${eventName}
  ชื่อผู้สมัคร: ${ownerName}
  ชื่อควาย:  ${buffaloName}
  ไมโครชิป: ${microchip}
  `;
}
