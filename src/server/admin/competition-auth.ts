import { createHash, timingSafeEqual } from "node:crypto";
import { CompetitionAdminError } from "./competition-contract";
export function assertCompetitionBridgeAuth(
  authorization: string | undefined,
  expected = process.env.JAOTHUI_COMPETITION_ADMIN_API_KEY,
): void {
  if (!expected || expected.length < 32)
    throw new CompetitionAdminError(
      503,
      "BRIDGE_NOT_CONFIGURED",
      "ยังไม่ได้ตั้งค่าการเชื่อมต่อหลังบ้าน",
    );
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!supplied || !timingSafeEqual(digest(supplied), digest(expected)))
    throw new CompetitionAdminError(
      401,
      "UNAUTHORIZED",
      "ไม่มีสิทธิ์ใช้บริการ",
    );
}
