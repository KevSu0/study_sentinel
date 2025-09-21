// src/domain/timer.state.ts

import { TimerState as TimerStateConstants, TimerStateType, TimerTypeType, EntityTypeType } from './time.constants';

// Re-export for convenience
export const TimerState = TimerStateConstants;

export interface ActiveTimer {
  id: string;
  entityType: EntityTypeType;
  entityId: string;
  title: string;
  timerType: TimerTypeType;
  priority?: number;
  state: TimerStateType;

  // Timestamps
  startTime: number; // When timer was first started
  endTime?: number; // For countdown timers only
  pauseStartTime?: number; // When current pause started
  lastPauseEnd?: number; // When last pause ended

  // Durations
  pausedDuration: number; // Total time spent in paused state
  pauseCount: number; // Number of pauses taken
  pausedTime?: number; // Remaining time for countdown when paused

  // Context
  duration?: number; // Original duration in minutes for countdown
  note?: string;
}

export interface TimerTransition {
  from: TimerStateType;
  to: TimerStateType;
  timestamp: number;
  payload?: any;
}

export interface TimerStateMachine {
  currentState: TimerStateType;
  transitions: TimerTransition[];
  invariants: () => boolean;
}

// State transition rules
export const TRANSITIONS = {
  [TimerState.IDLE]: [TimerState.RUNNING],
  [TimerState.RUNNING]: [TimerState.PAUSED, TimerState.STOPPED],
  [TimerState.PAUSED]: [TimerState.RUNNING, TimerState.STOPPED],
  [TimerState.STOPPED]: [TimerState.IDLE],
} as const;

// Invariants that must always be true
export const INVARIANTS = {
  SINGLE_ACTIVE_TIMER: 'Only one active timer can exist at any time',
  NO_OVERLAP: 'No overlapping timer sessions',
  PAUSE_BOUNDS: 'Pause duration must be >= MIN_PAUSE_MS',
  SESSION_BOUNDS: 'Session duration must be between MIN_SESSION_MS and MAX_SESSION_MS',
} as const;