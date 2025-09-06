
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { subDays, parseISO, set, startOfDay } from 'date-fns';

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
export function getSessionDate(): Date {
  // Use local time for 4 AM rollover to match user expectation across widgets
  const now = new Date();
  const hour = now.getHours();
  const midnightLocal = new Date(now.getTime());
  midnightLocal.setHours(0, 0, 0, 0);
  return hour < 4 ? subDays(midnightLocal, 1) : now;
}

/**
 * For a given timestamp, returns the "study day" it belongs to.
 * The day rolls over at 4 AM.
 * @param {string} timestamp ISO 8601 timestamp string.
 * @returns {Date} The date object representing the study day.
 */
export function getStudyDateForTimestamp(timestamp: string): Date {
  // Parse as local time; apply 4 AM local rollover
  const date = parseISO(timestamp);
  const hour = date.getHours();
  const midnightLocal = new Date(date.getTime());
  midnightLocal.setHours(0, 0, 0, 0);
  if (hour < 4) {
    return subDays(midnightLocal, 1);
  }
  return date;
};

/**
 * For a given date, returns the "study day" it belongs to.
 * The day rolls over at 4 AM.
 * @param {Date} date The date object.
 * @returns {Date} The date object representing the study day.
 */
export function getStudyDay(date: Date): Date {
  const hour = date.getHours();
  const midnightLocal = new Date(date.getTime());
  midnightLocal.setHours(0, 0, 0, 0);
  if (hour < 4) {
    return subDays(midnightLocal, 1);
  }
  return date;
}

export function getTimeSinceStudyDayStart(timestamp: number | null): number | null {
  if (timestamp === null) return null;
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const hour = date.getHours();
  // 4 AM local for the study day start
  let studyDayStart = new Date(y, m, d, 4, 0, 0, 0);
  if (hour < 4) {
    studyDayStart = subDays(studyDayStart, 1);
  }
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
