// src/selectors/plans.routines.ts

import { routineStore } from '../data/entities/routine.store';
import { Routine, getTodaysRoutines, canStartRoutine } from '../domain/routine.rules';

export interface RoutineDisplay {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  priority: number;
  canStart: boolean;
  timeUntilStart?: number; // ms until next start time, or 0 if can start now
  days: number[];
}

/**
 * Get routines for today
 */
export function getTodaysRoutinesForDisplay(): RoutineDisplay[] {
  const routines = routineStore.getAll();
  const todaysRoutines = getTodaysRoutines(routines);

  return todaysRoutines.map(routine => ({
    id: routine.id,
    title: routine.title,
    startTime: routine.calendar.startTime,
    endTime: routine.calendar.endTime,
    priority: routine.calendar.priority,
    canStart: canStartRoutine(routine),
    days: routine.calendar.days,
  }));
}

/**
 * Get all routines with display info
 */
export function getAllRoutinesForDisplay(): RoutineDisplay[] {
  const routines = routineStore.getAll();

  return routines.map(routine => ({
    id: routine.id,
    title: routine.title,
    startTime: routine.calendar.startTime,
    endTime: routine.calendar.endTime,
    priority: routine.calendar.priority,
    canStart: canStartRoutine(routine),
    days: routine.calendar.days,
  }));
}

/**
 * Get routines for specific days
 */
export function getRoutinesForDays(days: number[]): RoutineDisplay[] {
  const routines = routineStore.getAll();
  const filteredRoutines = routines.filter(routine =>
    routine.calendar.days.some(day => days.includes(day))
  );

  return filteredRoutines.map(routine => ({
    id: routine.id,
    title: routine.title,
    startTime: routine.calendar.startTime,
    endTime: routine.calendar.endTime,
    priority: routine.calendar.priority,
    canStart: canStartRoutine(routine),
    days: routine.calendar.days,
  }));
}

/**
 * Get routines sorted by start time
 */
export function getRoutinesSortedByTime(days?: number[]): RoutineDisplay[] {
  const routines = days ? getRoutinesForDays(days) : getTodaysRoutinesForDisplay();

  return routines.sort((a, b) => {
    const [aHour, aMinute] = a.startTime.split(':').map(Number);
    const [bHour, bMinute] = b.startTime.split(':').map(Number);

    const aTime = aHour * 60 + aMinute;
    const bTime = bHour * 60 + bMinute;

    return aTime - bTime;
  });
}

/**
 * Get next routine (closest start time)
 */
export function getNextRoutine(): RoutineDisplay | null {
  const routines = getAllRoutinesForDisplay();
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // Filter routines that are available today and haven't ended yet
  const availableRoutines = routines.filter(routine => {
    const [startHour, startMinute] = routine.startTime.split(':').map(Number);
    const [endHour, endMinute] = routine.endTime.split(':').map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Handle routines that cross midnight
    if (endTime < startTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }

    return currentTime >= startTime && currentTime <= endTime;
  });

  if (availableRoutines.length === 0) {
    return null;
  }

  // Sort by priority (higher first)
  availableRoutines.sort((a, b) => b.priority - a.priority);

  return availableRoutines[0];
}

/**
 * Get routine by ID
 */
export function getRoutineById(id: string): RoutineDisplay | null {
  const routine = routineStore.getById(id);
  if (!routine) {
    return null;
  }

  return {
    id: routine.id,
    title: routine.title,
    startTime: routine.calendar.startTime,
    endTime: routine.calendar.endTime,
    priority: routine.calendar.priority,
    canStart: canStartRoutine(routine),
    days: routine.calendar.days,
  };
}

/**
 * Check if any routines can be started now
 */
export function hasStartableRoutines(): boolean {
  const routines = routineStore.getAll();
  return routines.some(routine => canStartRoutine(routine));
}