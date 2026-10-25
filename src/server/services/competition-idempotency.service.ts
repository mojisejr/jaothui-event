import { createHash } from "node:crypto";
import { client } from "~/server/sanity/client";
export function registrationIdentity(
  data: { eventId: string; userId: string; operationId: string },
  payload: unknown,
) {
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  return {
    id: `competition-registration.${digest(`${data.eventId}:${data.userId}:${data.operationId}`)}`,
    hash: digest(
      JSON.stringify(
        payload,
        Object.keys(payload as object)
          .filter(
            (key) =>
              ![
                "idToken",
                "lineAccessToken",
                "imageIds",
                "buffaloImage",
                "buffaloImage2",
                "frontImage",
                "sideImage",
                "backImage",
              ].includes(key),
          )
          .sort(),
      ),
    ),
  };
}
export async function existingRegistration(id: string, hash: string) {
  const existing = await client.getDocument<{
    _id: string;
    registrationRequestHash?: string;
  }>(id);
  if (existing && existing.registrationRequestHash !== hash)
    throw new Error("คำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว กรุณาโหลดหน้าใหม่");
  return existing;
}
