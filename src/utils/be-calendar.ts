/**
 * BE Calendar Date Utility
 * Formats dates to Buddhist Era (BE) calendar format
 */

/**
 * Formats a date string to BE calendar format
 * @param dateString - ISO date string or date-like string
 * @returns Formatted date string in BE format with Gregorian equivalent
 * @example
 * formatBEDate("2023-05-15") => "BE 2566 (15/5/2023)"
 */
export function formatBEDate(dateString: string): string {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }
    
    const beYear = date.getFullYear() + 543;
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return `BE ${beYear} (${day}/${month}/${year})`;
  } catch (error) {
    console.error("Error formatting BE date:", error);
    return dateString;
  }
}

/**
 * Formats a date string to Thai locale BE format
 * @param dateString - ISO date string or date-like string
 * @returns Formatted date string in Thai BE format
 * @example
 * formatBEDateThai("2023-05-15") => "15 พ.ค. 2566"
 */
export function formatBEDateThai(dateString: string): string {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const beYear = date.getFullYear() + 543;
    const thaiDate = date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
    });
    
    return `${thaiDate} ${beYear}`;
  } catch (error) {
    console.error("Error formatting Thai BE date:", error);
    return dateString;
  }
}
