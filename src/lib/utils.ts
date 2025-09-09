
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { subDays, parseISO, addMinutes } from 'date-fns';

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
 * @returns {Date} The current session date object.
 */
// Read user-configured study day start in minutes from localStorage; default 240 (4:00)
export function getStudyDayStartMinutes(): number {
  try {
    const raw = localStorage.getItem('studyDayStartMinutes');
    const n = raw ? parseInt(raw, 10) : 240;
    return Number.isFinite(n) && n >= 0 && n < 24 * 60 ? n : 240;
  } catch {
    return 240;
  }
}

// Given a date (local), return the study-day start Date for that calendar day
export function getStudyDayStart(date: Date): Date {
  const minutes = getStudyDayStartMinutes();
  const d = new Date(date.getTime());
  // Set to local midnight
  d.setHours(0, 0, 0, 0);
  // Add the offset minutes to reach study-day start time
  return addMinutes(d, minutes);
}

// Returns a Date representing "now" if we are after today's study-day start, otherwise the prior day
export function getSessionDate(): Date {
  const now = new Date();
  const todayStart = getStudyDayStart(now);
  if (now < todayStart) {
    const yesterday = subDays(now, 1);
    const yStart = getStudyDayStart(yesterday);
    // Return a date anchored to yesterday (preserve time for callers that format date only)
    return yStart;
  }
  return todayStart;
}

/**
 * For a given timestamp, returns the "study day" it belongs to.
 * The day rolls over at 4 AM.
 * @param {string} timestamp ISO 8601 timestamp string.
 * @returns {Date} The date object representing the study day.
 */
export function getStudyDateForTimestamp(timestamp: string): Date {
  const dt = parseISO(timestamp);
  const startToday = getStudyDayStart(dt);
  if (dt < startToday) {
    const prev = subDays(dt, 1);
    return getStudyDayStart(prev);
  }
  return startToday;
};

/**
 * For a given date, returns the "study day" it belongs to.
 * The day rolls over at 4 AM.
 * @param {Date} date The date object.
 * @returns {Date} The date object representing the study day.
 */
export function getStudyDay(date: Date): Date {
  const start = getStudyDayStart(date);
  if (date < start) {
    const prev = subDays(date, 1);
    return getStudyDayStart(prev);
  }
  return start;
}

export function getTimeSinceStudyDayStart(timestamp: number | null): number | null {
  if (timestamp === null) return null;
  const dt = new Date(timestamp);
  const start = getStudyDay(dt);
  return dt.getTime() - start.getTime();
}

// Helpers to compute inclusive [start, end) bounds for a study day
export function getStudyDayBounds(date: Date): { start: Date; end: Date } {
  const start = getStudyDay(date);
  const end = addMinutes(start, 24 * 60); // exclusive upper bound
  return { start, end };
}

// Given yyyy-MM-dd keys (study-day labels), return absolute bounds
export function getStudyRangeBoundsFromKeys(startKey: string, endKey: string): { start: Date; end: Date } {
  // Parse keys as local dates
  const [sy, sm, sd] = startKey.split('-').map(n => parseInt(n, 10));
  const [ey, em, ed] = endKey.split('-').map(n => parseInt(n, 10));
  const startDate = new Date(sy, (sm || 1) - 1, sd || 1, 12, 0, 0, 0); // noon to avoid DST edge, then corrected by getStudyDayStart
  const endDate = new Date(ey, (em || 1) - 1, ed || 1, 12, 0, 0, 0);
  const start = getStudyDay(startDate);
  const endBounds = getStudyDayBounds(endDate);
  const end = endBounds.end; // exclusive
  return { start, end };
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
