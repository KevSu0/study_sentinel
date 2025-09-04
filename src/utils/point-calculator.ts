/**
 * Point calculation utilities for tasks and routines
 */

import { type StudyTask, type Routine, type TaskPriority } from '../state/types/state-types';

/**
 * Calculate points earned for completing a task
 */
export const calculateTaskPoints = (task: StudyTask, actualDuration: number): number => {
  const basePriority = {
    low: 1,
    medium: 2,
    high: 3,
    urgent: 4,
  };

  const priorityMultiplier = basePriority[task.priority] || 1;
  const durationMinutes = Math.floor(actualDuration / (1000 * 60));
  const basePoints = Math.max(1, Math.floor(durationMinutes / 5)); // 1 point per 5 minutes
  
  return basePoints * priorityMultiplier;
};

/**
 * Calculate points earned for completing a routine session
 */
export function calculateRoutinePoints(actualDuration: number, routine: Routine): number {
  const basePoints = Math.floor(actualDuration / 60000) * 2; // 2 points per minute
  const priorityMultiplier = routine.priority === 'high' ? 1.5 : routine.priority === 'medium' ? 1.2 : 1.0;
  
  // Calculate expected duration from startTime and endTime
  const [startHour, startMin] = routine.startTime.split(':').map(Number);
  const [endHour, endMin] = routine.endTime.split(':').map(Number);
  const expectedDuration = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) * 60000; // in milliseconds
  
  const completionBonus = actualDuration >= expectedDuration ? 5 : 0;
  
  return Math.round((basePoints * priorityMultiplier) + completionBonus);
}

/**
 * Calculate general points based on duration and type
 */
export const calculatePoints = (duration: number, type: 'task' | 'routine' = 'task'): number => {
  const durationMinutes = Math.floor(duration / (1000 * 60));
  
  if (type === 'routine') {
    return Math.max(1, Math.floor(durationMinutes / 10));
  }
  
  return Math.max(1, Math.floor(durationMinutes / 5));
};