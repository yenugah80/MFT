/**
 * Date Helper Utilities
 *
 * Timezone-safe date operations to prevent off-by-one errors
 * caused by UTC conversion in toISOString()
 */

/**
 * Format date as YYYY-MM-DD in LOCAL timezone (no UTC conversion)
 *
 * IMPORTANT: Do NOT use date.toISOString().split('T')[0] for date keys!
 * toISOString() converts to UTC which causes off-by-one errors for users
 * in timezones ahead of UTC (e.g., Asia, Australia).
 *
 * Example of the problem:
 * - User in Tokyo (UTC+9) at midnight Dec 25
 * - new Date(2025, 11, 25) → 2025-12-25 00:00:00 JST
 * - toISOString() → "2025-12-24T15:00:00.000Z" (converts to UTC, becomes Dec 24!)
 * - split('T')[0] → "2025-12-24" ❌ Wrong day!
 *
 * @param {Date} date - Date object to format
 * @returns {string} Date in YYYY-MM-DD format (local timezone)
 *
 * @example
 * const date = new Date(2025, 11, 25);
 * formatDateLocal(date); // "2025-12-25" (always correct, any timezone)
 */
export function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD in local timezone
 * @returns {string} Today's date in YYYY-MM-DD format
 *
 * @example
 * getTodayKey(); // "2025-12-25"
 */
export function getTodayKey() {
  return formatDateLocal(new Date());
}

/**
 * Parse YYYY-MM-DD string to Date object in local timezone
 * Avoids timezone issues when creating dates from strings
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object in local timezone
 *
 * @example
 * parseLocalDate("2025-12-25"); // Date object for Dec 25, 2025 at 00:00 local time
 */
export function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get date N days ago as YYYY-MM-DD
 * @param {number} daysAgo - Number of days to go back
 * @returns {string} Date in YYYY-MM-DD format
 *
 * @example
 * getDateNDaysAgo(7); // Date 7 days ago as "2025-12-18"
 */
export function getDateNDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatDateLocal(date);
}

/**
 * Check if two date strings represent the same day
 * @param {string} dateStr1 - First date (YYYY-MM-DD)
 * @param {string} dateStr2 - Second date (YYYY-MM-DD)
 * @returns {boolean} True if same day
 */
export function isSameDay(dateStr1, dateStr2) {
  return dateStr1 === dateStr2;
}

/**
 * Check if date string is today
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {boolean} True if today
 */
export function isToday(dateStr) {
  return dateStr === getTodayKey();
}
