import { getCompetitionPolicy } from "~/server/services/competition-policy";
import React from "react";
import { api } from "~/utils/api";
import AdminEventCard from "./AdminEventCard";

export default function EventList() {
  const { data, isLoading, error } = api.event.getAll.useQuery();

  console.log(data);

  // Make a local sorted copy so UI shows newest events first.
  // Sort by: eventAt (start date) -> registrationStartAt -> registrationDeadline
  const getEventTimestamp = (event: any) => {
    const tryDates = [
      event.eventAt,
      event.registrationStartAt,
      event.registrationDeadline,
      event.deadline,
    ];
    for (const d of tryDates) {
      if (d) {
        const t = Date.parse(d);
        if (!Number.isNaN(t)) return t;
      }
    }
    return 0;
  };

  const sortedEvents =
    data && Array.isArray(data)
      ? [...data].sort((a: any, b: any) => {
          return getEventTimestamp(b) - getEventTimestamp(a);
        })
      : data;

  // Use `isActive` to determine visual emphasis. If an event is not active
  // it should appear faded even if registration fields indicate 'open'.
  // This keeps the admin view consistent with actual active state.

  const getRegistrationStatus = (event: any) => {
    const status = getCompetitionPolicy(event).publicRegistration;
    return status === "open"
      ? "เปิดรับสมัคร"
      : status === "not-yet"
        ? "ยังไม่เปิดรับสมัคร"
        : "ปิดรับสมัคร";
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="card animate-pulse bg-base-200 shadow-lg"
            role="status"
            aria-label="Loading event"
          >
            <div className="card-body p-4 md:p-6">
              <div className="h-6 w-3/4 rounded bg-base-300"></div>
              <div className="mt-2 h-4 w-1/2 rounded bg-base-300"></div>
              <div className="mt-2 flex gap-2">
                <div className="h-6 w-16 rounded bg-base-300"></div>
                <div className="h-6 w-24 rounded bg-base-300"></div>
              </div>
              <div className="mt-2 flex justify-end">
                <div className="h-8 w-24 rounded bg-base-300"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>เกิดข้อผิดพลาดในการโหลดข้อมูลงาน</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="alert alert-info">
        <span>ไม่พบข้อมูลงานในระบบ</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {(sortedEvents as any[]).map((event) => {
        // emphasize only when event.isActive is true
        const open = !!event.isActive;
        return (
          <AdminEventCard
            key={event.eventId}
            event={event}
            isOpen={open}
            getRegistrationStatus={getRegistrationStatus}
          />
        );
      })}
    </div>
  );
}
