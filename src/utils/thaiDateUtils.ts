/**
 * Thai Date Utilities for BE (Buddhist Era) Calendar
 * Handles conversion between ISO format and Thai Buddhist Era calendar
 */

export const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

/**
 * Convert AD year to BE year
 * @param adYear - Anno Domini year
 * @returns Buddhist Era year
 */
export function adToBe(adYear: number): number {
  return adYear + 543;
}

/**
 * Convert BE year to AD year
 * @param beYear - Buddhist Era year
 * @returns Anno Domini year
 */
export function beToAd(beYear: number): number {
  return beYear - 543;
}

/**
 * Format ISO date string to Thai display format
 * @param isoDate - ISO date string (YYYY-MM-DD)
 * @returns Thai formatted date string (DD เดือน พ.ศ. YYYY)
 * @example formatIsoToThai("2024-12-25") => "25 ธันวาคม พ.ศ. 2567"
 */
export function formatIsoToThai(isoDate: string): string {
  if (!isoDate) return "";
  
  try {
    const [year, month, day] = isoDate.split("-").map(Number);
    if (!year || !month || !day) return "";
    
    const beYear = adToBe(year);
    const monthName = THAI_MONTHS_FULL[month - 1];
    
    return `${day} ${monthName} พ.ศ. ${beYear}`;
  } catch {
    return "";
  }
}

/**
 * Parse ISO date string to Thai date components
 * @param isoDate - ISO date string (YYYY-MM-DD)
 * @returns Object with day, month index (0-11), and BE year
 */
export function parseIsoDate(isoDate: string): {
  day: number;
  monthIndex: number;
  beYear: number;
} | null {
  if (!isoDate) return null;
  
  try {
    const [year, month, day] = isoDate.split("-").map(Number);
    if (!year || !month || !day) return null;
    
    return {
      day,
      monthIndex: month - 1,
      beYear: adToBe(year),
    };
  } catch {
    return null;
  }
}

/**
 * Convert Thai date components to ISO format
 * @param day - Day of month (1-31)
 * @param monthIndex - Month index (0-11)
 * @param beYear - Buddhist Era year
 * @returns ISO date string (YYYY-MM-DD)
 */
export function thaiToIso(day: number, monthIndex: number, beYear: number): string {
  const adYear = beToAd(beYear);
  const month = monthIndex + 1;
  
  const paddedMonth = month.toString().padStart(2, "0");
  const paddedDay = day.toString().padStart(2, "0");
  
  return `${adYear}-${paddedMonth}-${paddedDay}`;
}

/**
 * Get array of years in BE format for selection
 * @param startYear - Starting AD year (default: 100 years ago)
 * @param endYear - Ending AD year (default: current year)
 * @returns Array of BE years in descending order
 */
export function getBeYearRange(
  startYear?: number,
  endYear?: number
): number[] {
  const currentYear = new Date().getFullYear();
  const start = startYear ?? currentYear - 100;
  const end = endYear ?? currentYear;
  
  const years: number[] = [];
  for (let year = end; year >= start; year--) {
    years.push(adToBe(year));
  }
  
  return years;
}

/**
 * Validate if a date string is in valid ISO format
 * @param isoDate - Date string to validate
 * @returns True if valid ISO format
 */
export function isValidIsoDate(isoDate: string): boolean {
  if (!isoDate) return false;
  
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(isoDate)) return false;
  
  const date = new Date(isoDate);
  return !isNaN(date.getTime());
}

/**
 * Get current date in ISO format
 * @returns Current date as ISO string (YYYY-MM-DD)
 */
export function getCurrentIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}
