import React from "react";
import { api } from "~/utils/api";
import Image from "next/image";

interface RegisterImagesDetailProps {
  userId: string;
  targetId: string;
  eventId: string;
}

export default function RegisterImagesDetail({
  userId,
  targetId,
  eventId,
}: RegisterImagesDetailProps) {
  const { data, isLoading } = api.royal.getImages.useQuery({
    userId: userId,
    targetId: targetId,
    eventId: eventId,
  });

  if (isLoading) {
    return <div className="loading loading-spinner"></div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div>
      <h2>ข้อมูลภาพ</h2>
      {data.imageArray.map((img) => (
        <div key={img.title}>
          <h3>{img.title}</h3>
          <figure className="max-w-1/2">
            <Image src={img.image} alt={img.title} width={1000} height={700} />
          </figure>
        </div>
      ))}
    </div>
  );
}
