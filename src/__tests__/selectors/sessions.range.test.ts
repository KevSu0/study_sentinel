// src/__tests__/selectors/sessions.range.test.ts

import { getSessionsInRange, getSessionsForDate } from '../../selectors/sessions.range';
import { Event, TimerStartEvent, TimerStopEvent, ManualTimeEntryEvent } from '../../data/logs/event.model';
import { Session } from '../../selectors/sessions.range';

// Mock the event.append module
jest.mock('../../data/logs/event.append', () => ({
  eventAppend: {
    getEvents: jest.fn()
  },
  createEvent: jest.fn((type: string, payload: any) => ({
    type,
    payload,
    id: `test-${type}-${Date.now()}`
  }))
}));

// Get the mocked function
const { eventAppend } = require('../../data/logs/event.append');
const mockGetEvents = eventAppend.getEvents;

// Helper to create test events
function createTestEvent(type: string, payload: any): Event {
  return {
    type,
    payload,
    id: `test-${type}-${Date.now()}`,
    timestamp: Date.now()
  } as Event;
}

describe('Sessions Range', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSessionsInRange', () => {
    it('returns empty array when no events', () => {
      mockGetEvents.mockReturnValue([]);

      const sessions = getSessionsInRange('2024-01-15', '2024-01-15');

      expect(sessions).toHaveLength(0);
      expect(mockGetEvents).toHaveBeenCalledWith('2024-01-15', '2024-01-15');
    });

    it('reconstructs countdown session from events', () => {
      const events = [
        createTestEvent('TIMER_START', {
          entityType: 'TASK',
          entityId: 'task1',
          title: 'Test Task',
          timerType: 'COUNTDOWN',
          startTs: 1000000000000,
          duration: 25,
        }),
        createTestEvent('TIMER_STOP', {
          entityId: 'task1',
          stopTs: 100000001500000,
          reason: 'completed',
          snapshot: {
            totalMs: 1500000,
            productiveMs: 1200000,
            pauseMs: 300000,
            pauseCount: 2,
            focusPct: 80,
          },
        }),
      ];

      mockGetEvents.mockReturnValue(events);

      const sessions = getSessionsInRange('2024-01-15', '2024-01-15');

      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        type: 'countdown',
        title: 'Test Task',
        totalMs: 1500000,
        pauseMs: 300000,
        pauseCount: 2,
        focusPct: 80,
        entityType: 'task',
      });
    });

    it('reconstructs infinity session from events', () => {
      const events = [
        createTestEvent('TIMER_START', {
          entityType: 'ROUTINE',
          entityId: 'routine1',
          title: 'Morning Routine',
          timerType: 'INFINITY',
          startTs: 1000000000000,
        }),
        createTestEvent('TIMER_STOP', {
          entityId: 'routine1',
          stopTs: 1000000036000000,
          reason: 'completed',
          snapshot: {
            totalMs: 3600000,
            productiveMs: 3600000,
            pauseMs: 0,
            pauseCount: 0,
            focusPct: 100,
          },
        }),
      ];

      mockGetEvents.mockReturnValue(events);

      const sessions = getSessionsInRange('2024-01-15', '2024-01-15');

      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        type: 'infinity',
        title: 'Morning Routine',
        totalMs: 3600000,
        pauseMs: 0,
        pauseCount: 0,
        focusPct: 100,
        entityType: 'routine',
      });
    });

    it('includes manual time entries', () => {
      const events = [
        createTestEvent('MANUAL_TIME_ENTRY', {
          date: '2024-01-15',
          durationMs: 1800000,
          productivePct: 70,
          note: 'Manual work',
        }),
      ];

      mockGetEvents.mockReturnValue(events);

      const sessions = getSessionsInRange('2024-01-15', '2024-01-15', true);

      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        type: 'manual',
        title: 'Manual Entry',
        totalMs: 1800000,
        pauseMs: 540000, // 30% of 1800000
        focusPct: 70,
        entityType: 'manual',
      });
    });

    it('excludes manual entries when includeManual=false', () => {
      const events = [
        createTestEvent('MANUAL_TIME_ENTRY', {
          date: '2024-01-15',
          durationMs: 1800000,
          productivePct: 70,
        }),
      ];

      mockGetEvents.mockReturnValue(events);

      const sessions = getSessionsInRange('2024-01-15', '2024-01-15', false);

      expect(sessions).toHaveLength(0);
    });

    it('sorts sessions by start time', () => {
      const events = [
        createTestEvent('TIMER_START', {
          entityType: 'TASK',
          entityId: 'task1',
          title: 'Task 1',
          timerType: 'COUNTDOWN',
          startTs: 1000000020000000,
        }),
        createTestEvent('TIMER_STOP', {
          entityId: 'task1',
          stopTs: 1000000021000000,
          reason: 'completed',
          snapshot: { totalMs: 100000, productiveMs: 100000, pauseMs: 0, pauseCount: 0, focusPct: 100 },
        }),
        createTestEvent('TIMER_START', {
          entityType: 'TASK',
          entityId: 'task2',
          title: 'Task 2',
          timerType: 'COUNTDOWN',
          startTs: 1000000000000000,
        }),
        createTestEvent('TIMER_STOP', {
          entityId: 'task2',
          stopTs: 1000000001000000,
          reason: 'completed',
          snapshot: { totalMs: 100000, productiveMs: 100000, pauseMs: 0, pauseCount: 0, focusPct: 100 },
        }),
      ];

      mockGetEvents.mockReturnValue(events);

      const sessions = getSessionsInRange('2024-01-15', '2024-01-15');

      expect(sessions).toHaveLength(2);
      expect(sessions[0].title).toBe('Task 2'); // Earlier session
      expect(sessions[1].title).toBe('Task 1'); // Later session
    });

    it('flags short sessions', () => {
      const events = [
        createTestEvent('TIMER_START', {
          entityType: 'TASK',
          entityId: 'task1',
          title: 'Short Task',
          timerType: 'COUNTDOWN',
          startTs: 1000000000000,
        }),
        createTestEvent('TIMER_STOP', {
          entityId: 'task1',
          stopTs: 100000000030000, // 30 seconds
          reason: 'completed',
          snapshot: { totalMs: 30000, productiveMs: 30000, pauseMs: 0, pauseCount: 0, focusPct: 100 },
        }),
      ];

      mockGetEvents.mockReturnValue(events);

      const sessions = getSessionsInRange('2024-01-15', '2024-01-15');

      expect(sessions[0].isShortSession).toBe(true);
    });

    it('handles incomplete timer sessions (no stop event)', () => {
      const events = [
        createTestEvent('TIMER_START', {
          entityType: 'TASK',
          entityId: 'task1',
          title: 'Incomplete Task',
          timerType: 'COUNTDOWN',
          startTs: 1000000000000,
        }),
      ];

      mockGetEvents.mockReturnValue(events);

      const sessions = getSessionsInRange('2024-01-15', '2024-01-15');

      expect(sessions).toHaveLength(0); // No completed sessions
    });
  });

  describe('getSessionsForDate', () => {
    it('calls getSessionsInRange with same start and end date', () => {
      mockGetEvents.mockReturnValue([]);

      const result = getSessionsForDate('2024-01-15', true);

      expect(mockGetEvents).toHaveBeenCalledWith('2024-01-15', '2024-01-15');
    });
  });
});