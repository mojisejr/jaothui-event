import React from "react";

interface FilterBarProps {
  statusFilter: "all" | "active" | "past";
  onStatusFilterChange: (status: "all" | "active" | "past") => void;
  eventNameFilter: string;
  onEventNameFilterChange: (eventName: string) => void;
  uniqueEvents: string[];
  resultCount: number;
  totalCount: number;
  onClearFilters: () => void;
}

/**
 * FilterBar - Mobile-first filter component for history display
 * 
 * Features:
 * - Mobile-optimized with 44px+ touch targets
 * - Status filter pills (All/Active/Past)
 * - Event selection dropdown
 * - Result counter display
 * - Clear filters functionality
 * - Thai text optimized
 */
export function FilterBar({
  statusFilter,
  onStatusFilterChange,
  eventNameFilter,
  onEventNameFilterChange,
  uniqueEvents,
  resultCount,
  totalCount,
  onClearFilters,
}: FilterBarProps) {
  return (
    <div className="bg-accent rounded-lg p-4 sm:p-6 shadow-lg mb-6 space-y-4">
      {/* Status Filter Pills */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-buffalo-cream uppercase tracking-wide">
          สถานะงาน
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onStatusFilterChange("all")}
            className={`btn min-h-[44px] flex-1 sm:flex-none sm:min-w-[100px] ${
              statusFilter === "all"
                ? "btn-primary"
                : "btn-outline btn-secondary"
            }`}
            aria-pressed={statusFilter === "all"}
            aria-label="แสดงทั้งหมด"
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => onStatusFilterChange("active")}
            className={`btn min-h-[44px] flex-1 sm:flex-none sm:min-w-[100px] ${
              statusFilter === "active"
                ? "btn-primary"
                : "btn-outline btn-secondary"
            }`}
            aria-pressed={statusFilter === "active"}
            aria-label="แสดงงานที่กำลังดำเนินการ"
          >
            กำลังดำเนินการ
          </button>
          <button
            onClick={() => onStatusFilterChange("past")}
            className={`btn min-h-[44px] flex-1 sm:flex-none sm:min-w-[100px] ${
              statusFilter === "past"
                ? "btn-primary"
                : "btn-outline btn-secondary"
            }`}
            aria-pressed={statusFilter === "past"}
            aria-label="แสดงงานที่สิ้นสุดแล้ว"
          >
            สิ้นสุดแล้ว
          </button>
        </div>
      </div>

      {/* Event Name Filter */}
      <div className="space-y-2">
        <label
          htmlFor="event-filter"
          className="text-sm font-semibold text-buffalo-cream uppercase tracking-wide"
        >
          ชื่องาน
        </label>
        <select
          id="event-filter"
          value={eventNameFilter}
          onChange={(e) => onEventNameFilterChange(e.target.value)}
          className="select select-bordered w-full min-h-[44px] bg-base-200 text-secondary"
          aria-label="เลือกชื่องานที่ต้องการดู"
        >
          <option value="">ทั้งหมด</option>
          {uniqueEvents.map((eventName) => (
            <option key={eventName} value={eventName}>
              {eventName}
            </option>
          ))}
        </select>
      </div>

      {/* Results Counter and Clear Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-buffalo-cream/20">
        <div className="text-sm text-buffalo-cream">
          แสดง <span className="font-bold text-buffalo-gold">{resultCount}</span> จาก{" "}
          <span className="font-bold text-buffalo-gold">{totalCount}</span> รายการ
        </div>
        {(statusFilter !== "active" || eventNameFilter !== "") && (
          <button
            onClick={onClearFilters}
            className="btn btn-outline btn-secondary btn-sm min-h-[44px] sm:min-h-[36px]"
            aria-label="ล้างตัวกรอง"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>
    </div>
  );
}

export default FilterBar;
