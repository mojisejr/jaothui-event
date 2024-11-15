import { client } from "../../../sanity/lib/client";

export interface ImagesObject {
  title: string;
  image: File;
}

export const imagesUpload = async (
  userId: string,
  eventId: string,
  images: ImagesObject[],
) => {
  if (images.length <= 0 || !images) {
    return [];
  }

  const results = await Promise.all(
    images.map(async (img) => {
      const image = await client.assets.upload("image", img.image, {
        filename: `${img.title}-${userId}-${eventId}.${img.image.name.split(".")[1]}`,
      });
      return image;
    }),
  );

  return results;
};
