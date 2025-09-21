// src/domain/time.constants.ts

// IST day cut time (04:00 local)
export const DAY_CUT_HOUR = 4;
export const DAY_CUT_MINUTE = 0;

// Time boundaries in milliseconds
export const MIN_SESSION_MS = 60 * 1000; // 60 seconds
export const MIN_PAUSE_MS = 5 * 1000; // 5 seconds
export const MAX_SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours

// Focus percentage precision
export const FOCUS_PRECISION = 1; // 1 decimal place

// Timer states
export const TimerState = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED',
} as const;

export type TimerStateType = typeof TimerState[keyof typeof TimerState];

// Timer types
export const TimerType = {
  COUNTDOWN: 'COUNTDOWN',
  INFINITY: 'INFINITY',
} as const;

export type TimerTypeType = typeof TimerType[keyof typeof TimerType];

// Entity types
export const EntityType = {
  TASK: 'TASK',
  ROUTINE: 'ROUTINE',
} as const;

export type EntityTypeType = typeof EntityType[keyof typeof EntityType];

// Event types
export const EventType = {
  TIMER_START: 'TIMER_START',
  TIMER_PAUSE: 'TIMER_PAUSE',
  TIMER_RESUME: 'TIMER_RESUME',
  TIMER_STOP: 'TIMER_STOP',
  MANUAL_TIME_ENTRY: 'MANUAL_TIME_ENTRY',
  TASK_ADD: 'TASK_ADD',
  TASK_UPDATE: 'TASK_UPDATE',
  TASK_DELETE: 'TASK_DELETE',
  ROUTINE_ADD: 'ROUTINE_ADD',
  ROUTINE_UPDATE: 'ROUTINE_UPDATE',
  ROUTINE_DELETE: 'ROUTINE_DELETE',
} as const;

export type EventTypeType = typeof EventType[keyof typeof EventType];

// Storage keys
export const StorageKeys = {
  ACTIVE_TIMER: 'SS_V1_ACTIVE_TIMER',
  TASKS: 'SS_V1_TASKS',
  ROUTINES: 'SS_V1_ROUTINES',
  SETTINGS: 'SS_V1_SETTINGS',
  LOG_PREFIX: 'SS_V1_LOG_',
} as const;