// src/domain/routine.rules.ts

import { DAY_CUT_HOUR, DAY_CUT_MINUTE } from './time.constants';

export interface RoutineCalendar {
  days: number[]; // 0-6 where 0 is Sunday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  priority: number;
}

export interface Routine {
  id: string;
  title: string;
  description?: string;
  calendar: RoutineCalendar;
  taskTemplateId?: string; // For Phase-2: link to countdown task template
}

/**
 * Check if routine is available on a given date
 */
export function isRoutineAvailable(routine: Routine, date: Date): boolean {
  const dayOfWeek = date.getDay();
  return routine.calendar.days.includes(dayOfWeek);
}

/**
 * Check if routine can be started at current time
 */
export function canStartRoutine(routine: Routine, now: Date = new Date()): boolean {
  if (!isRoutineAvailable(routine, now)) {
    return false;
  }

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMinute] = routine.calendar.startTime.split(':').map(Number);
  const [endHour, endMinute] = routine.calendar.endTime.split(':').map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Handle routines that cross midnight
  if (endTime < startTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }

  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Get today's date with IST day cut time
 */
export function getTodayWithCut(): Date {
  const now = new Date();
  const cut = new Date(now);
  cut.setHours(DAY_CUT_HOUR, DAY_CUT_MINUTE, 0, 0);

  // If current time is before cut, use yesterday
  if (now < cut) {
    cut.setDate(cut.getDate() - 1);
  }

  return cut;
}

/**
 * Get routines available today
 */
export function getTodaysRoutines(routines: Routine[]): Routine[] {
  const today = new Date();
  return routines.filter(routine => isRoutineAvailable(routine, today));
}

/**
 * Get routines that can be started now
 */
export function getStartableRoutines(routines: Routine[]): Routine[] {
  return routines.filter(routine => canStartRoutine(routine));
}

/**
 * Calculate time until next routine start
 */
export function getTimeUntilNextRoutine(routines: Routine[]): number | null {
  const now = new Date();
  const todayRoutines = getTodaysRoutines(routines)
    .filter(r => canStartRoutine(r, now));

  if (todayRoutines.length > 0) {
    return 0; // Can start immediately
  }

  // Find next routine time today
  const currentTime = now.getHours() * 60 + now.getMinutes();
  let nextTime: number | null = null;

  for (const routine of getTodaysRoutines(routines)) {
    const [startHour, startMinute] = routine.calendar.startTime.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;

    if (startTime > currentTime && (nextTime === null || startTime < nextTime)) {
      nextTime = startTime;
    }
  }

  if (nextTime !== null) {
    return (nextTime - currentTime) * 60 * 1000; // Convert to ms
  }

  return null;
}