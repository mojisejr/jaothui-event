import { MessageParserDTO } from "~/interfaces/MessageParserDTO";

export function messageParser({
  ownerName,
  buffaloName,
  eventName,
  microchip,
  eventAt,
  docId,
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
  docId,
}: {
  ownerName: string;
  buffaloName: string;
  microchip: string;
  docId: string;
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

  🌐 ตรวจสอบสถานะ
  https://jaothui-events.vercel.app/public/register-status/${docId}
  `;
}

export function royalApprovementMessageParser({
  docId,
  ownerName,
  buffaloName,
  microchip,
  comment,
  success,
}: {
  docId: string;
  ownerName: string;
  buffaloName: string;
  microchip: string;
  comment?: string;
  success: boolean;
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
  ${
    success
      ? `
  ✅ ได้ผ่านการพิจารณาเรียบร้อยแล้ว
  "กรุณาติดต่อปศุสัตว์ในพื้นที่
  เพื่อรับการตรวจโครโมโซม
  (ไม่มีค่าใช้จ่าย)"
    `
      : `
  ❌ ไม่ผ่านการอนุมัติ
  "${comment}"`
  }
  
  🌐 ตรวจสอบสถานะ
  https://jaothui-events.vercel.app/public/register-status/${docId}
  `;
}
