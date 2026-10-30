import React, { useMemo, useState } from "react";
import Link from "next/link";
import Loading1 from "~/components/Shared/Loading1";
import { useLine } from "~/context/lineContext";
import HistoryCard from "~/components/MyEvents/HistoryCard";
import FilterBar from "~/components/MyEvents/FilterBar";
import { ApplicantQrDialog } from "~/components/MyEvents/ApplicantQrDialog";
import { useApplicantHistory } from "~/components/MyEvents/useApplicantHistory";
import {
  checkInTime,
  isCurrentApplication,
} from "~/components/MyEvents/applicant-history";

export default function MyEventPage() {
  const { profile, liff, loggedIn, login } = useLine();
  const { events, loading, error, updatedAt, refresh } = useApplicantHistory(
    liff,
    loggedIn ? profile?.userId : undefined,
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "past">(
    "active",
  );
  const [eventNameFilter, setEventNameFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const uniqueEvents = useMemo(
    () =>
      Array.from(
        new Set(events?.map((event) => event.event.title) ?? []),
      ).sort(),
    [events],
  );
  const filteredEvents = useMemo(
    () =>
      events?.filter((event) => {
        const active = isCurrentApplication(event.event.endAt);
        return (
          (statusFilter === "all" ||
            (statusFilter === "active" ? active : !active)) &&
          (!eventNameFilter || event.event.title === eventNameFilter)
        );
      }) ?? [],
    [events, statusFilter, eventNameFilter],
  );
  const selected = events?.find((event) => event._id === selectedId);

  return (
    <main className="container mx-auto min-h-screen px-4 py-6 text-secondary">
      <h1 className="mb-6 text-center text-2xl font-semibold sm:text-3xl">
        ประวัติการลงประกวดควาย
      </h1>
      {!loggedIn ? (
        <section className="mx-auto max-w-md space-y-4 rounded-xl bg-accent p-5 text-center">
          <p>เข้าสู่ระบบ LINE เพื่อดูใบสมัครและ QR รายงานตัวของคุณ</p>
          <button
            type="button"
            onClick={login}
            className="btn btn-primary min-h-[44px] w-full"
          >
            เข้าสู่ระบบ LINE
          </button>
        </section>
      ) : (
        <>
          {error ? (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-orange-300/30 bg-orange-400/10 p-4 text-orange-100"
            >
              {error}
            </p>
          ) : null}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-buffalo-cream">
              {updatedAt
                ? `ข้อมูลล่าสุด ${checkInTime(updatedAt.toISOString())}`
                : "กำลังยืนยันข้อมูลใบสมัคร"}
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading || !profile}
              className="btn btn-outline btn-secondary min-h-[44px]"
            >
              {loading ? "กำลังโหลด…" : "โหลดข้อมูลล่าสุด"}
            </button>
          </div>
          {!events && !error ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loading1 />
            </div>
          ) : events ? (
            !events.length ? (
              <section className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
                <p className="text-xl font-semibold">ยังไม่มีประวัติการสมัคร</p>
                <Link href="/events" className="btn btn-primary min-h-[44px]">
                  ไปสมัครงานประกวด
                </Link>
              </section>
            ) : (
              <>
                <FilterBar
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  eventNameFilter={eventNameFilter}
                  onEventNameFilterChange={setEventNameFilter}
                  uniqueEvents={uniqueEvents}
                  resultCount={filteredEvents.length}
                  totalCount={events.length}
                  onClearFilters={() => {
                    setStatusFilter("active");
                    setEventNameFilter("");
                  }}
                />
                {!filteredEvents.length ? (
                  <p role="status" className="py-12 text-center">
                    ไม่พบใบสมัครตามตัวกรอง ลองเลือกทั้งหมดหรือเปลี่ยนชื่องาน
                  </p>
                ) : (
                  <ul
                    className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3"
                    aria-label="ใบสมัครประกวดควาย"
                  >
                    {filteredEvents.map((event) => (
                      <li key={event._id} className="min-w-0">
                        <HistoryCard
                          event={event}
                          onShowQr={() => setSelectedId(event._id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )
          ) : null}
          {selected && liff ? (
            <ApplicantQrDialog
              key={selected._id}
              application={selected}
              liff={liff}
              onClose={() => setSelectedId(undefined)}
              onUpdated={() => void refresh()}
            />
          ) : null}
        </>
      )}
    </main>
  );
}
