import React, { useEffect, useState } from "react";
import {
  THAI_MONTHS_FULL,
  parseIsoDate,
  thaiToIso,
  getBeYearRange,
  isValidIsoDate,
} from "~/utils/thaiDateUtils";

interface ThaiDatePickerProps {
  value?: string; // ISO format: YYYY-MM-DD
  onChange?: (isoDate: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  minYear?: number; // Minimum AD year
  maxYear?: number; // Maximum AD year
}

/**
 * Thai Date Picker Component
 * Displays date selection in Thai Buddhist Era (BE) calendar format
 * Outputs date in ISO format (YYYY-MM-DD) for backend storage
 */
const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  className = "",
  placeholder = "เลือกวันที่",
  minYear,
  maxYear,
}) => {
  const [day, setDay] = useState<number | "">("");
  const [monthIndex, setMonthIndex] = useState<number | "">("");
  const [beYear, setBeYear] = useState<number | "">("");

  // Initialize from value prop
  useEffect(() => {
    if (value && isValidIsoDate(value)) {
      const parsed = parseIsoDate(value);
      if (parsed) {
        setDay(parsed.day);
        setMonthIndex(parsed.monthIndex);
        setBeYear(parsed.beYear);
      }
    } else if (!value) {
      // Reset if value is cleared
      setDay("");
      setMonthIndex("");
      setBeYear("");
    }
  }, [value]);

  // Notify parent of changes
  useEffect(() => {
    if (day && monthIndex !== "" && beYear) {
      const isoDate = thaiToIso(Number(day), Number(monthIndex), Number(beYear));
      if (isValidIsoDate(isoDate) && onChange) {
        onChange(isoDate);
      }
    }
  }, [day, monthIndex, beYear]);

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = e.target.value;
    setDay(newDay === "" ? "" : Number(newDay));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = e.target.value;
    setMonthIndex(newMonth === "" ? "" : Number(newMonth));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value;
    setBeYear(newYear === "" ? "" : Number(newYear));
  };

  // Generate days array (1-31)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // Generate BE years
  const beYears = getBeYearRange(minYear, maxYear);

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {/* Day selector */}
      <select
        value={day}
        onChange={handleDayChange}
        disabled={disabled}
        required={required}
        className="select select-sm select-bordered text-black disabled:text-slate-300"
      >
        <option value="">วัน</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      {/* Month selector */}
      <select
        value={monthIndex}
        onChange={handleMonthChange}
        disabled={disabled}
        required={required}
        className="select select-sm select-bordered text-black disabled:text-slate-300"
      >
        <option value="">เดือน</option>
        {THAI_MONTHS_FULL.map((month, index) => (
          <option key={index} value={index}>
            {month}
          </option>
        ))}
      </select>

      {/* Year selector (BE) */}
      <select
        value={beYear}
        onChange={handleYearChange}
        disabled={disabled}
        required={required}
        className="select select-sm select-bordered text-black disabled:text-slate-300"
      >
        <option value="">พ.ศ.</option>
        {beYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ThaiDatePicker;
