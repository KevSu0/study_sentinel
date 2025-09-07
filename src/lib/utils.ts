
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { subDays, parseISO, startOfDay } from 'date-fns';

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
  const now = new Date();
  let studyDay = startOfDay(now);
  if (now.getHours() < 4) {
    studyDay = subDays(studyDay, 1);
  }
  // Set the time to 4 AM
  studyDay.setHours(4, 0, 0, 0);
  return studyDay;
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
  let studyDay = startOfDay(date);
  if (date.getHours() < 4) {
    studyDay = subDays(studyDay, 1);
  }
  // Set the time to 4 AM
  studyDay.setHours(4, 0, 0, 0);
  return studyDay;
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
