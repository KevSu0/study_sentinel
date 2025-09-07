
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { subDays, parseISO, startOfDay } from 'date-fns';

// --- Timezone helpers ---
function getActiveTimeZone(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const tz = localStorage.getItem('region.timezone')
        || localStorage.getItem('studySentinel.timezone')
        || localStorage.getItem('timezone');
      if (tz) return tz;
    }
  } catch {}
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function getTZParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  } as any);
  const parts = dtf.formatToParts(date);
  const map: Record<string, number> = {} as any;
  for (const p of parts) {
    if (p.type === 'year' || p.type === 'month' || p.type === 'day' || p.type === 'hour' || p.type === 'minute' || p.type === 'second') {
      map[p.type] = parseInt(p.value, 10);
    }
  }
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second,
  };
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const p = getTZParts(date, timeZone);
  const asUTC = Date.UTC(p.year, (p.month || 1) - 1, p.day || 1, p.hour || 0, p.minute || 0, p.second || 0);
  return asUTC - date.getTime();
}

function daysInMonth(year: number, month1to12: number) {
  if (month1to12 === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    return isLeap ? 29 : 28;
  }
  return [0,31,28,31,30,31,30,31,31,30,31,30,31][month1to12] || 30;
}

function prevYMD(y: number, m: number, d: number) {
  d -= 1;
  if (d >= 1) return { y, m, d };
  m -= 1;
  if (m >= 1) return { y, m, d: daysInMonth(y, m) };
  return { y: y - 1, m: 12, d: daysInMonth(y - 1, 12) };
}

function startOfStudyDayInTZ(date: Date, timeZone: string): Date {
  // Determine local date components for the given instant
  const parts = getTZParts(date, timeZone);
  let y = parts.year, m = parts.month, d = parts.day;
  if (typeof y !== 'number' || typeof m !== 'number' || typeof d !== 'number') {
    // Fallback to original behavior if Intl not available
    let studyDay = startOfDay(date);
    if (date.getHours() < 4) studyDay = subDays(studyDay, 1);
    studyDay.setHours(4, 0, 0, 0);
    return studyDay;
  }
  // If local time before 4 AM, use previous local day
  if ((parts.hour || 0) < 4) {
    const prev = prevYMD(y, m, d);
    y = prev.y; m = prev.m; d = prev.d;
  }
  // Build UTC timestamp corresponding to local 04:00:00 in the target timezone
  const guessUTC = Date.UTC(y, m - 1, d, 4, 0, 0);
  const offsetAtBoundary = tzOffsetMs(new Date(guessUTC), timeZone);
  const boundaryUTC = guessUTC - offsetAtBoundary;
  return new Date(boundaryUTC);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateShortId(prefix: 'T' | 'R'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
}

/**
 * Returns the "session date" for the app, where the day rolls over at 4 AM.
 * The date returned is the start of the study day.
 * @returns {Date} The current session date object.
 */
export function getSessionDate(): Date {
  const tz = getActiveTimeZone();
  return startOfStudyDayInTZ(new Date(), tz);
}

/**
 * For a given timestamp, returns the "study day" it belongs to.
 * The day rolls over at 4 AM.
 * @param {string} timestamp ISO 8601 timestamp string.
 * @returns {Date} The date object representing the start of the study day.
 */
export function getStudyDateForTimestamp(timestamp: string): Date {
  const date = parseISO(timestamp);
  return getStudyDay(date);
};

/**
 * For a given date, returns the "study day" it belongs to.
 * The day rolls over at 4 AM.
 * The date returned is the start of the study day.
 * @param {Date} date The date object.
 * @returns {Date} The date object representing the start of the study day.
 */
export function getStudyDay(date: Date): Date {
  const tz = getActiveTimeZone();
  return startOfStudyDayInTZ(date, tz);
}

export function getTimeSinceStudyDayStart(timestamp: number | null): number | null {
  if (timestamp === null) return null;
  const date = new Date(timestamp);
  const studyDayStart = getStudyDay(date);
  return date.getTime() - studyDayStart.getTime();
}


export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0s';

  const totalSeconds = Math.round(seconds);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}
