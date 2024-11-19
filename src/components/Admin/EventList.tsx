import Link from "next/link";
import React from "react";
import { api } from "~/utils/api";

export default function EventList() {
  const { data, isLoading } = api.event.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="h-full w-full">
        <div className="loading loading-spinner text-white"></div>
      </div>
    );
  }

  return (
    <table className="table text-white">
      <thead>
        <tr>
          <th>สถานะ</th>
          <th>ชื่องาน</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {data?.map((event) => (
          <tr key={event.name}>
            <td>{event.isActive ? "เปิด" : "ปิด"}</td>
            <td>{event.name}</td>
            <td>
              <Link
                href={`/admin/event-manage/${event.eventId}`}
                className="btn"
              >
                ดูรายละเอียด
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
