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

export function royalMessageParser({
  ownerName,
  buffaloName,
  microchip,
}: {
  ownerName: string;
  buffaloName: string;
  microchip: string;
}) {
  return `
  🙏ขอขอบคุณ🙏
  👩‍🌾คุณ ${ownerName}👨🏻‍🌾

  =====================
  การลงทะเบียนคัดเลือกเข้าประกวด
  =====================
  ชื่อควาย
  ✅ ${buffaloName} 
  เลขประจำตัวสัตว์
  ✅ ${microchip}
  ได้รับการลงทะเบียนเรียบร้อยแล้ว
  ✅ อยู่ระหว่างการพิจารณา

  "กรุณารอการตอบกลับ"
  `;
}
