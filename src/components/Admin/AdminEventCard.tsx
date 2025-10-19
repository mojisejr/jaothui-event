import Link from "next/link";
import React from "react";

interface AdminEventCardProps {
  event: {
    eventId: string;
    name: string;
    isActive?: boolean;
    registrationActive?: boolean;
    registrationStartAt?: string;
    registrationDeadline?: string;
    deadline?: string;
    eventAt?: string;
    endAt?: string;
  };
  getRegistrationStatus: (event: any) => string;
}

const AdminEventCard: React.FC<AdminEventCardProps> = ({
  event,
  getRegistrationStatus,
}) => {
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "เปิดรับสมัคร":
        return "badge-info";
      case "เปิด":
        return "badge-success";
      case "ปิด":
      case "ปิดรับสมัคร":
        return "badge-error";
      default:
        return "badge-warning";
    }
  };

  const formatDateRange = (event: any) => {
    if (!event.eventAt && !event.endAt) return "";
    const start = event.eventAt
      ? new Date(event.eventAt).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";
    const end = event.endAt
      ? new Date(event.endAt).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";
    return start && end ? `${start} - ${end}` : start || end;
  };

  const registrationStatus = getRegistrationStatus(event);
  const dateRange = formatDateRange(event);

  return (
    <div
      className="card card-compact bg-base-200 shadow-lg transition-shadow hover:shadow-xl"
      role="article"
    >
      <div className="card-body p-4 md:p-6">
        <h2 className="card-title text-lg md:text-xl">{event.name}</h2>
        {dateRange && (
          <p className="text-sm text-base-content/70">{dateRange}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <span
            className={`badge badge-sm ${
              event.isActive ? "badge-success" : "badge-error"
            }`}
            aria-label={`สถานะงาน: ${event.isActive ? "เปิด" : "ปิด"}`}
          >
            {event.isActive ? "เปิด" : "ปิด"}
          </span>
          <span
            className={`badge badge-sm ${getBadgeVariant(registrationStatus)}`}
            aria-label={`สถานะรับสมัคร: ${registrationStatus}`}
          >
            {registrationStatus}
          </span>
        </div>
        <div className="card-actions justify-end">
          <Link
            href={`/admin/event-manage/${event.eventId}`}
            className="btn btn-primary btn-sm transition-transform hover:scale-105"
          >
            ดูรายละเอียด
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminEventCard;
