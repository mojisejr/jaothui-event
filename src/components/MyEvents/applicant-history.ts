import type { Liff } from "@line/liff";

/** Pass reads use POST bodies: LINE credentials must never become URL parameters. */
export function applicantAuthorization(
  liff: Pick<Liff, "getIDToken" | "getAccessToken"> | undefined,
): { idToken?: string; lineAccessToken?: string } {
  const idToken = liff?.getIDToken();
  if (idToken) return { idToken };
  const lineAccessToken = liff?.getAccessToken();
  if (lineAccessToken) return { lineAccessToken };
  throw new Error("กรุณาเข้าสู่ระบบ LINE ใหม่เพื่อดูใบสมัครของคุณ");
}

export function bangkokDay(now = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function isCurrentApplication(endAt: string, today = bangkokDay()) {
  return /^\d{4}-\d{2}-\d{2}/.test(endAt) && endAt.slice(0, 10) >= today;
}

export const applicantRegistrationLabels = {
  registered: "สมัครสำเร็จ",
  pending: "รอการอนุมัติ",
  accepted: "อนุมัติแล้ว",
  rejected: "ไม่ผ่านการอนุมัติ",
  needs_type_review: "ต้องตรวจประเภทงาน",
};

export function applicationLevelLabel(level: string) {
  if (level === "national" || level === "ประเทศ") return "รุ่นแข่งขัน";
  if (level === "province" || level === "จังหวัด") return "รุ่นจังหวัด";
  return level;
}

export function checkInTime(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed)
    : "ไม่พบเวลาที่บันทึก";
}
