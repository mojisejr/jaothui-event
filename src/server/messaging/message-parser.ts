import { MessageParserDTO } from "~/interfaces/MessageParserDTO";

export function messageParser({
  ownerName,
  buffaloName,
  eventName,
  microchip,
  eventAt,
}: MessageParserDTO) {
  return `
  ขอบคุณที่ท่านเข้าร่วมสมัครประกวดควายปลักไทยใน
📌งาน : ${eventName} 
📌ชื่อผู้สมัคร : ${ownerName}
📌ชื่อควาย : ${buffaloName}
📌เลขประจำตัวสัตว์ : ${microchip}
  `;
}
