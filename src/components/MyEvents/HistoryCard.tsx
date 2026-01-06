import React from "react";
import Link from "next/link";
import type { EventRegister } from "~/interfaces/EventRegister";
import { formatBEDate } from "~/utils/be-calendar";
import dayjs from "dayjs";

interface HistoryCardProps {
  event: EventRegister;
}

/**
 * HistoryCard - Mobile-first card component for displaying buffalo registration history
 * 
 * Features:
 * - Full visibility of event name and type (รุ่นที่สมัคร) without truncation
 * - Mobile-optimized layout with proper spacing
 * - Accessible with WCAG 2.1 AA compliance
 * - Touch-friendly with 44px+ touch targets
 * - Microchip highlighting with green background
 */
export function HistoryCard({ event }: HistoryCardProps) {
  // Determine if event is active or past based on current date
  const today = dayjs();
  const eventEndDate = dayjs(event.event.endAt);
  const isActive = today.isBefore(eventEndDate) || today.isSame(eventEndDate, "day");
  
  let statusLabel = "";
  let statusColor = "";

  if (event.event.eventType === "royal") {
    if (event.approvementResult === true) {
      statusLabel = "อนุมัติแล้ว";
      statusColor = "bg-green-500";
    } else if (event.approvementResult === false) {
      statusLabel = "ไม่ผ่านการอนุมัติ";
      statusColor = "bg-red-500";
    } else {
      statusLabel = "รอการอนุมัติ";
      statusColor = "bg-yellow-500 text-black";
    }
  } else {
    statusLabel = isActive ? "การสมัครสำเร็จ" : "จบงานแล้ว";
    statusColor = isActive ? "bg-event-active" : "bg-event-past";
  }

  // [SPECIAL-HACK-JAN2026]
  const showReRegisterButton =
    event.event.eventType === "royal" &&
    event.approvementResult === false &&
    event.event._id === "44da822e-7ec6-4e82-b530-a2ef06759f24";

  return (
    <article
      className="card bg-accent shadow-xl hover:shadow-2xl transition-shadow duration-200 w-full"
      role="article"
      aria-label={`Buffalo ${event.name} registered for ${event.event.title}`}
    >
      <div className="card-body p-4 sm:p-6">
        {/* Buffalo Name Header */}
        <h2 className="card-title text-lg sm:text-xl font-bold text-buffalo-gold mb-3 break-words">
          🐃 {event.name}
        </h2>

        {/* Event Information Section */}
        <div className="space-y-2 text-secondary">
          {/* Event Name - Full visibility, no truncation */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-buffalo-cream font-semibold uppercase tracking-wide">
              งาน
            </span>
            <p className="text-base font-semibold break-words">
              📅 {event.event.title}
            </p>
          </div>

          {/* Event Type (รุ่นที่สมัคร) - Full visibility, prominent display */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-buffalo-cream font-semibold uppercase tracking-wide">
              รุ่นที่สมัคร
            </span>
            <p className="text-base font-semibold text-buffalo-gold break-words">
              🏆 {event.type}
            </p>
          </div>

          {/* Event Level */}
          {event.level && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-buffalo-cream font-semibold uppercase tracking-wide">
                ประเภท
              </span>
              <p className="text-sm break-words">
                📊 {event.level}
              </p>
            </div>
          )}

          {/* Microchip - Highlighted with green background */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-buffalo-cream font-semibold uppercase tracking-wide">
              เลขไมโครชิบ
            </span>
            <span
              className="inline-block bg-microchip-green text-white px-3 py-2 rounded-md text-sm font-mono font-semibold w-fit"
              role="text"
              aria-label={`Microchip number ${event.microchip}`}
            >
              🔢 {event.microchip}
            </span>
          </div>

          {/* Color */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-buffalo-cream font-medium">สี:</span>
            <span className="break-words">🎨 {event.color}</span>
          </div>

          {/* Owner Name */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-buffalo-cream font-medium">เจ้าของ:</span>
            <span className="break-words">👤 {event.ownerName}</span>
          </div>

          {/* Birthday - BE Calendar Format */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-buffalo-cream font-medium">วันเกิด:</span>
            <span className="break-words">📅 {formatBEDate(event.birthday)}</span>
          </div>

          {/* Sex */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-buffalo-cream font-medium">เพศ:</span>
            <span className="break-words">🚻 {event.sex}</span>
          </div>

          {/* Farm Name (if available) */}
          {event.farmName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-buffalo-cream font-medium">ฟาร์ม:</span>
              <span className="break-words">🏘️ {event.farmName}</span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="card-actions mt-4 flex flex-col items-end gap-2">
          {/* [SPECIAL-HACK-JAN2026] Re-register Button */}
          {showReRegisterButton && (
            <Link
              href={`/public/special-register/${event.event._id}`}
              className="btn btn-error btn-outline btn-sm w-full sm:w-auto"
            >
              สมัครใหม่อีกครั้ง
            </Link>
          )}

          <div
            className={`badge badge-lg ${statusColor} border-none px-4 py-3 text-white`}
            role="status"
            aria-label={`Event status: ${statusLabel}`}
          >
            {statusLabel}
          </div>
          {event.comment && event.approvementResult === false && (
            <p className="w-full text-right text-xs text-red-300">
              {event.comment}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default HistoryCard;
