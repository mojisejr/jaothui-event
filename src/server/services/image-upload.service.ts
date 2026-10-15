/** Browser transport only: credentials and Sanity writer stay behind the authenticated API. */
export interface ImagesObject {
  title: string;
  image: File;
}
export const imagesUpload = async (
  userId: string,
  eventId: string,
  images: ImagesObject[],
  idToken: string,
  lineAccessToken?: string,
): Promise<Array<{ _id: string }>> => {
  if (!idToken && !lineAccessToken)
    throw new Error("กรุณาเข้าสู่ระบบ LINE ใหม่");
  return Promise.all(
    images.map(async ({ image }) => {
      if (image.size > 4 * 1024 * 1024) throw new Error("รูปต้องไม่เกิน 4MB");
      const response = await fetch(
        `/api/competitions/applicant-image?eventId=${encodeURIComponent(eventId)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken || lineAccessToken}`,
            "X-Line-Token-Type": idToken ? "id" : "access",
            "Content-Type": image.type,
          },
          body: image,
        },
      );
      if (!response.ok) throw new Error("ไม่สามารถอัพโหลดรูปได้");
      return response.json() as Promise<{ _id: string }>;
    }),
  );
};
