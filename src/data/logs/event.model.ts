// src/data/logs/event.model.ts

import { EventTypeType, EntityTypeType, TimerTypeType } from '../../domain/time.constants';

// Base event interface
export interface BaseEvent {
  id: string;
  type: EventTypeType;
  timestamp: number;
  dateKey: string; // YYYY-MM-DD for partitioning
}

// Timer events
export interface TimerStartEvent extends BaseEvent {
  type: 'TIMER_START';
  payload: {
    entityType: EntityTypeType;
    entityId: string;
    title: string;
    timerType: TimerTypeType;
    priority?: number;
    startTs: number;
    duration?: number; // For countdown in minutes
  };
}

export interface TimerPauseEvent extends BaseEvent {
  type: 'TIMER_PAUSE';
  payload: {
    entityId: string;
    pauseStartTs: number;
  };
}

export interface TimerResumeEvent extends BaseEvent {
  type: 'TIMER_RESUME';
  payload: {
    entityId: string;
    pauseEndTs: number;
    lastPauseMs: number;
  };
}

export interface TimerStopEvent extends BaseEvent {
  type: 'TIMER_STOP';
  payload: {
    entityId: string;
    stopTs: number;
    reason: string;
    note?: string;
    snapshot: {
      totalMs: number;
      productiveMs: number;
      pauseMs: number;
      pauseCount: number;
      focusPct: number;
    };
  };
}

// Manual time entry
export interface ManualTimeEntryEvent extends BaseEvent {
  type: 'MANUAL_TIME_ENTRY';
  payload: {
    entityId?: string; // Optional task ID
    date: string; // YYYY-MM-DD
    durationMs: number;
    productivePct: number;
    note?: string;
  };
}

// Task events
export interface TaskAddEvent extends BaseEvent {
  type: 'TASK_ADD';
  payload: {
    id: string;
    title: string;
    description?: string;
    duration?: number;
    priority?: number;
    status: string;
  };
}

export interface TaskUpdateEvent extends BaseEvent {
  type: 'TASK_UPDATE';
  payload: {
    id: string;
    updates: Partial<TaskAddEvent['payload']>;
  };
}

export interface TaskDeleteEvent extends BaseEvent {
  type: 'TASK_DELETE';
  payload: {
    id: string;
  };
}

// Routine events
export interface RoutineAddEvent extends BaseEvent {
  type: 'ROUTINE_ADD';
  payload: {
    id: string;
    title: string;
    description?: string;
    calendar: {
      days: number[];
      startTime: string;
      endTime: string;
      priority: number;
    };
    taskTemplateId?: string;
  };
}

export interface RoutineUpdateEvent extends BaseEvent {
  type: 'ROUTINE_UPDATE';
  payload: {
    id: string;
    updates: Partial<RoutineAddEvent['payload']>;
  };
}

export interface RoutineDeleteEvent extends BaseEvent {
  type: 'ROUTINE_DELETE';
  payload: {
    id: string;
  };
}

// Union type for all events
export type Event =
  | TimerStartEvent
  | TimerPauseEvent
  | TimerResumeEvent
  | TimerStopEvent
  | ManualTimeEntryEvent
  | TaskAddEvent
  | TaskUpdateEvent
  | TaskDeleteEvent
  | RoutineAddEvent
  | RoutineUpdateEvent
  | RoutineDeleteEvent;

// Event validators
export const EventValidators = {
  /**
   * Validate event structure
   */
  validate(event: Event): boolean {
    if (!event.id || !event.type || !event.timestamp || !event.dateKey) {
      return false;
    }

    switch (event.type) {
      case 'TIMER_START':
        return !!event.payload.entityId && !!event.payload.title && !!event.payload.startTs;
      case 'TIMER_PAUSE':
        return !!event.payload.entityId && !!event.payload.pauseStartTs;
      case 'TIMER_RESUME':
        return !!event.payload.entityId && !!event.payload.pauseEndTs && event.payload.lastPauseMs >= 0;
      case 'TIMER_STOP':
        return (
          !!event.payload.entityId &&
          !!event.payload.stopTs &&
          !!event.payload.snapshot &&
          typeof event.payload.snapshot.totalMs === 'number' &&
          typeof event.payload.snapshot.focusPct === 'number'
        );
      case 'MANUAL_TIME_ENTRY':
        return (
          !!event.payload.date &&
          typeof event.payload.durationMs === 'number' &&
          typeof event.payload.productivePct === 'number'
        );
      case 'TASK_ADD':
      case 'TASK_UPDATE':
      case 'TASK_DELETE':
        return !!event.payload.id;
      case 'ROUTINE_ADD':
      case 'ROUTINE_UPDATE':
      case 'ROUTINE_DELETE':
        return !!event.payload.id;
      default:
        return false;
    }
  },

  /**
   * Get event entity ID
   */
  getEntityId(event: Event): string | null {
    if ('entityId' in event.payload && event.payload.entityId) {
      return event.payload.entityId;
    }
    if ('id' in event.payload && event.payload.id) {
      return event.payload.id;
    }
    return null;
  },

  /**
   * Check if event affects timer state
   */
  isTimerEvent(event: Event): boolean {
    return [
      'TIMER_START',
      'TIMER_PAUSE',
      'TIMER_RESUME',
      'TIMER_STOP',
    ].includes(event.type);
  },
} as const;