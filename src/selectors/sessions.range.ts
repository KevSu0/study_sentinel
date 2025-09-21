// src/selectors/sessions.range.ts

import { eventAppend } from '../data/logs/event.append';
import { Event, TimerStopEvent, ManualTimeEntryEvent } from '../data/logs/event.model';
import { calculateSessionMetrics, calculateManualEntryMetrics } from '../metrics/session.metrics';
import { getDateKey } from '../metrics/day.split';
import { Task } from '../data/entities/task.store';
import { Routine } from '../domain/routine.rules';
import { validateSessionMetrics, validateSessionConstraints } from '../lib/invariants';

export interface Session {
  id: string;
  startTs: number;
  endTs: number;
  totalMs: number;
  pauseMs: number;
  productiveMs: number;
  pauseCount: number;
  focusPct: number;
  type: 'countdown' | 'infinity' | 'manual';
  sourceId: string;
  title: string;
  priority?: number;
  note?: string;
  isShortSession: boolean;
  entityType: 'task' | 'routine' | 'manual';
}

/**
 * Get sessions for date range
 */
export function getSessionsInRange(
  startDate: string,
  endDate: string,
  includeManual: boolean = true
): Session[] {
  const events = eventAppend.getEvents(startDate, endDate);
  const sessions: Session[] = [];

  // Reconstruct timer sessions
  const timerSessions = reconstructTimerSessions(events);
  sessions.push(...timerSessions);

  // Add manual entries if included
  if (includeManual) {
    const manualSessions = reconstructManualSessions(events);
    sessions.push(...manualSessions);
  }

  // Sort by start time
  return sessions.sort((a, b) => a.startTs - b.startTs);
}

/**
 * Get sessions for a single date
 */
export function getSessionsForDate(
  date: string,
  includeManual: boolean = true
): Session[] {
  return getSessionsInRange(date, date, includeManual);
}

/**
 * Reconstruct timer sessions from events
 */
function reconstructTimerSessions(events: Event[]): Session[] {
  const sessions: Session[] = [];
  const activeTimers = new Map<string, Partial<Session>>();

  for (const event of events) {
    if (!isTimerEvent(event)) continue;

    const entityId = getEventEntityId(event);
    if (!entityId) continue;

    switch (event.type) {
      case 'TIMER_START':
        // Initialize session
        activeTimers.set(entityId, {
          id: event.id,
          sourceId: entityId,
          title: event.payload.title,
          startTs: event.payload.startTs,
          type: event.payload.timerType === 'COUNTDOWN' ? 'countdown' : 'infinity',
          entityType: event.payload.entityType.toLowerCase() as 'task' | 'routine',
          priority: event.payload.priority,
        });
        break;

      case 'TIMER_STOP':
        // Complete session
        const timerSession = activeTimers.get(entityId);
        if (timerSession) {
          const session = {
            ...timerSession,
            id: event.id,
            endTs: event.payload.stopTs,
            totalMs: event.payload.snapshot.totalMs,
            pauseMs: event.payload.snapshot.pauseMs,
            productiveMs: event.payload.snapshot.productiveMs,
            pauseCount: event.payload.snapshot.pauseCount,
            focusPct: event.payload.snapshot.focusPct,
            note: event.payload.note,
            isShortSession: event.payload.snapshot.totalMs < 60000,
          } as Session;

          // Validate in development
          validateSessionMetrics(session);
          validateSessionConstraints(session);

          sessions.push(session);
          activeTimers.delete(entityId);
        }
        break;
    }
  }

  return sessions;
}

/**
 * Reconstruct manual sessions from events
 */
function reconstructManualSessions(events: Event[]): Session[] {
  const manualEvents = events.filter(
    (event): event is ManualTimeEntryEvent => event && event.type === 'MANUAL_TIME_ENTRY'
  );

  return manualEvents.map(event => {
    const metrics = calculateManualEntryMetrics(
      event.payload.durationMs,
      event.payload.productivePct
    );

    const session = {
      id: event.id,
      startTs: new Date(event.payload.date).getTime(),
      endTs: new Date(event.payload.date).getTime() + event.payload.durationMs,
      totalMs: metrics.totalMs,
      pauseMs: metrics.pauseMs,
      productiveMs: metrics.productiveMs,
      pauseCount: 0,
      focusPct: metrics.focusPct,
      type: 'manual',
      sourceId: event.payload.entityId || 'manual',
      title: 'Manual Entry',
      note: event.payload.note,
      isShortSession: metrics.isShortSession,
      entityType: event.payload.entityId ? 'task' : 'manual',
    };

    // Validate in development
    validateSessionMetrics(session);
    validateSessionConstraints(session);

    return session;
  });
}

/**
 * Helper to check if event is a timer event
 */
function isTimerEvent(event: Event): boolean {
  return event && [
    'TIMER_START',
    'TIMER_PAUSE',
    'TIMER_RESUME',
    'TIMER_STOP',
  ].includes(event.type);
}

/**
 * Helper to get entity ID from event
 */
function getEventEntityId(event: Event): string | null {
  if ('entityId' in event.payload && event.payload.entityId) {
    return event.payload.entityId;
  }
  return null;
}

/**
 * Get session by ID
 */
export function getSessionById(sessionId: string, startDate?: string, endDate?: string): Session | null {
  if (!startDate || !endDate) {
    // Default to last 30 days
    const now = new Date();
    const start = getDateKey(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = getDateKey(now.getTime());
    startDate = start;
    endDate = end;
  }

  const sessions = getSessionsInRange(startDate, endDate);
  return sessions.find(session => session.id === sessionId) || null;
}

/**
 * Get sessions by entity (task/routine)
 */
export function getSessionsByEntity(
  entityId: string,
  startDate: string,
  endDate: string
): Session[] {
  return getSessionsInRange(startDate, endDate).filter(
    session => session.sourceId === entityId
  );
}