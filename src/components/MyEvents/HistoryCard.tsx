import React from "react";
import Link from "next/link";
import type { ApplicantApplication } from "~/server/services/competition-applicant-checkin";
import { formatBEDate } from "~/utils/be-calendar";
import {
  applicationLevelLabel,
  applicantRegistrationLabels,
  checkInTime,
} from "./applicant-history";

interface HistoryCardProps {
  event: ApplicantApplication;
  onShowQr: () => void;
}

/** A compact application summary; a QR opens separately instead of extending every card. */
export function HistoryCard({ event, onShowQr }: HistoryCardProps) {
  const checkedIn = event.checkInStatus === "checked_in";
  const showReRegister =
    event.event.eventType === "royal" &&
    event.registrationStatus === "rejected" &&
    event.event._id === "44da822e-7ec6-4e82-b530-a2ef06759f24";

  return (
    <article
      className="card h-full min-w-0 bg-accent shadow-xl"
      aria-label={`${event.name} งาน ${event.event.title} รุ่น ${event.type}`}
    >
      <div className="card-body gap-4 p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <h2 className="min-w-0 break-words text-xl font-bold text-buffalo-gold">
            🐃 {event.name}
          </h2>
          <span className="rounded-full bg-base-100 px-3 py-1 text-sm text-secondary">
            {applicantRegistrationLabels[event.registrationStatus]}
          </span>
        </div>
        <div className="space-y-2 break-words text-secondary">
          <p className="font-semibold">{event.event.title}</p>
          <p className="font-semibold text-buffalo-gold">{event.type}</p>
          {event.level ? (
            <p className="text-sm text-buffalo-cream">
              {applicationLevelLabel(event.level)}
            </p>
          ) : null}
          <p className="text-sm">
            ไมโครชิป{" "}
            <span className="ml-1 inline-block rounded-md bg-base-100 px-2 py-1 font-mono text-base">
              {event.microchip}
            </span>
          </p>
        </div>
        <div className="space-y-1 text-sm" role="status">
          <p
            className={
              checkedIn ? "font-semibold text-green-300" : "text-buffalo-cream"
            }
          >
            {checkedIn ? "รายงานตัวแล้ว" : "ยังไม่รายงานตัว"}
          </p>
          {event.checkedInAt ? (
            <p className="text-buffalo-cream">
              {checkInTime(event.checkedInAt)} (เวลาไทย)
            </p>
          ) : null}
          {!event.qrAvailable &&
          !checkedIn &&
          event.checkInEligibility.reason ? (
            <p className="text-buffalo-cream">
              {event.checkInEligibility.reason}
            </p>
          ) : null}
        </div>
        {event.qrAvailable || checkedIn ? (
          <button
            type="button"
            onClick={onShowQr}
            className="btn btn-primary min-h-[44px] w-full text-base"
          >
            {checkedIn ? "ดูการรายงานตัว" : "แสดง QR รายงานตัว"}
          </button>
        ) : null}
        <details className="mt-auto border-t border-buffalo-cream/20 pt-2 text-secondary">
          <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-buffalo-cream">
            ดูข้อมูลใบสมัคร
          </summary>
          <dl className="space-y-2 pb-1 text-sm">
            {[
              ["เจ้าของ", event.ownerName],
              ["ฟาร์ม", event.farmName],
              ["วันเกิด", event.birthday ? formatBEDate(event.birthday) : ""],
              ["เพศ", event.sex],
              ["สี", event.color],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="flex flex-wrap gap-x-2 break-words">
                  <dt className="text-buffalo-cream">{label}:</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </details>
        {event.registrationStatus === "rejected" && event.comment ? (
          <p className="break-words text-sm text-red-200">{event.comment}</p>
        ) : null}
        {showReRegister ? (
          <Link
            href={`/public/special-register/${event.event._id}`}
            className="btn btn-outline btn-error min-h-[44px] w-full"
          >
            สมัครใหม่อีกครั้ง
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default HistoryCard;
