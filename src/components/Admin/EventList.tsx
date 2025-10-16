import Link from "next/link";
import React from "react";
import { api } from "~/utils/api";

export default function EventList() {
  const { data, isLoading } = api.event.getAll.useQuery();

  console.log(data);

  if (isLoading) {
    return (
      <div className="h-full w-full">
        <div className="loading loading-spinner text-white"></div>
      </div>
    );
  }

  const getRegistrationStatus = (event: any) => {
    if (event.registrationActive === false) {
      return "ปิดรับสมัคร";
    }
    
    const now = new Date();
    if (event.registrationStartAt && new Date(event.registrationStartAt) > now) {
      return "ยังไม่เปิดรับสมัคร";
    }
    
    if (event.registrationDeadline && new Date(event.registrationDeadline) < now) {
      return "ปิดรับสมัคร";
    }
    
    if (!event.registrationDeadline && event.deadline && new Date(event.deadline) < now) {
      return "ปิดรับสมัคร";
    }
    
    return "เปิดรับสมัคร";
  };

  return (
    <table className="table text-white">
      <thead>
        <tr>
          <th>สถานะงาน</th>
          <th>สถานะรับสมัคร</th>
          <th>ชื่องาน</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {data?.map((event) => (
          <tr key={event.name}>
            <td>
              <span className={`badge ${event.isActive ? 'badge-success' : 'badge-error'}`}>
                {event.isActive ? "เปิด" : "ปิด"}
              </span>
            </td>
            <td>
              <span className={`badge ${getRegistrationStatus(event) === "เปิดรับสมัคร" ? 'badge-info' : 'badge-warning'}`}>
                {getRegistrationStatus(event)}
              </span>
            </td>
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
