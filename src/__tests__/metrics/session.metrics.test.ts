// src/__tests__/metrics/session.metrics.test.ts

import {
  calculateSessionMetrics,
  calculateManualEntryMetrics,
  validateSessionMetrics,
} from '../../metrics/session.metrics';
import { ActiveTimer } from '../../domain/timer.state';
import { TimerType, TimerState } from '../../domain/time.constants';

describe('Session Metrics', () => {
  const mockNow = 1000000000000;

  describe('calculateSessionMetrics', () => {
    describe('countdown timer', () => {
      it('calculates metrics for completed countdown session', () => {
        const timer: ActiveTimer = {
          id: 'test',
          entityType: 'TASK',
          entityId: 'task1',
          title: 'Test Task',
          timerType: TimerType.COUNTDOWN,
          state: TimerState.STOPPED,
          startTime: mockNow - 1500000, // 25 minutes ago
          endTime: mockNow,
          pausedDuration: 300000, // 5 minutes
          pauseCount: 2,
        };

        const metrics = calculateSessionMetrics(timer, mockNow);
        expect(metrics.totalMs).toBe(1500000);
        expect(metrics.pauseMs).toBe(300000);
        expect(metrics.productiveMs).toBe(1200000);
        expect(metrics.focusPct).toBe(80.0);
        expect(metrics.pauseCount).toBe(2);
        expect(metrics.isShortSession).toBe(false);
      });

      it('handles paused countdown timer', () => {
        const timer: ActiveTimer = {
          id: 'test',
          entityType: 'TASK',
          entityId: 'task1',
          title: 'Test Task',
          timerType: TimerType.COUNTDOWN,
          state: TimerState.PAUSED,
          startTime: mockNow - 600000,
          endTime: mockNow + 900000,
          pauseStartTime: mockNow - 30000, // Paused 30s ago
          pausedDuration: 120000, // 2 minutes previous pauses
          pauseCount: 3,
        };

        const metrics = calculateSessionMetrics(timer, mockNow);
        expect(metrics.pauseMs).toBe(150000); // 2m + 30s
      });

      it('flags short sessions', () => {
        const timer: ActiveTimer = {
          id: 'test',
          entityType: 'TASK',
          entityId: 'task1',
          title: 'Test Task',
          timerType: TimerType.COUNTDOWN,
          state: TimerState.STOPPED,
          startTime: mockNow - 30000, // 30 seconds ago
          endTime: mockNow,
          pausedDuration: 0,
          pauseCount: 0,
        };

        const metrics = calculateSessionMetrics(timer, mockNow);
        expect(metrics.isShortSession).toBe(true);
      });
    });

    describe('infinity timer', () => {
      it('calculates metrics for running infinity timer', () => {
        const timer: ActiveTimer = {
          id: 'test',
          entityType: 'TASK',
          entityId: 'task1',
          title: 'Test Task',
          timerType: TimerType.INFINITY,
          state: TimerState.RUNNING,
          startTime: mockNow - 3600000, // 1 hour ago
          pausedDuration: 600000, // 10 minutes
          pauseCount: 2,
        };

        const metrics = calculateSessionMetrics(timer, mockNow);
        expect(metrics.totalMs).toBe(4200000); // 1h + 10m
        expect(metrics.pauseMs).toBe(600000);
        expect(metrics.productiveMs).toBe(3600000);
        expect(metrics.focusPct).toBe(85.7); // 3600/4200 * 100
      });

      it('calculates metrics for paused infinity timer', () => {
        const timer: ActiveTimer = {
          id: 'test',
          entityType: 'TASK',
          entityId: 'task1',
          title: 'Test Task',
          timerType: TimerType.INFINITY,
          state: TimerState.PAUSED,
          startTime: mockNow - 3600000,
          pauseStartTime: mockNow - 300000, // Paused 5 minutes ago
          pausedDuration: 600000, // 10 minutes total
          pauseCount: 3,
        };

        const metrics = calculateSessionMetrics(timer, mockNow);
        expect(metrics.totalMs).toBe(600000); // Only paused duration
        expect(metrics.pauseMs).toBe(600000);
        expect(metrics.productiveMs).toBe(0);
      });
    });

    it('clamps values to bounds', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.INFINITY,
        state: TimerState.RUNNING,
        startTime: mockNow - 50000000000, // Very long ago
        pausedDuration: 0,
        pauseCount: 0,
      };

      const metrics = calculateSessionMetrics(timer, mockNow);
      expect(metrics.totalMs).toBeLessThanOrEqual(43200000000); // 12 hours max
    });
  });

  describe('calculateManualEntryMetrics', () => {
    it('calculates metrics from duration and productivity', () => {
      const metrics = calculateManualEntryMetrics(3600000, 75); // 1 hour at 75%
      expect(metrics.totalMs).toBe(3600000);
      expect(metrics.productiveMs).toBe(2700000);
      expect(metrics.pauseMs).toBe(900000);
      expect(metrics.focusPct).toBe(75.0);
      expect(metrics.pauseCount).toBe(0);
    });

    it('clamps productivity percentage', () => {
      const metrics = calculateManualEntryMetrics(3600000, 150); // Over 100%
      expect(metrics.focusPct).toBe(100);
    });

    it('handles zero duration', () => {
      const metrics = calculateManualEntryMetrics(0, 50);
      expect(metrics.totalMs).toBe(0);
      expect(metrics.focusPct).toBe(0);
    });
  });

  describe('validateSessionMetrics', () => {
    it('passes validation for correct metrics', () => {
      const metrics = {
        totalMs: 3600000,
        pauseMs: 900000,
        productiveMs: 2700000,
        focusPct: 75.0,
        pauseCount: 2,
        isShortSession: false,
      };

      expect(validateSessionMetrics(metrics)).toBe(true);
    });

    it('fails validation for negative values', () => {
      const metrics = {
        totalMs: -1000,
        pauseMs: 0,
        productiveMs: 0,
        focusPct: 0,
        pauseCount: 0,
        isShortSession: false,
      };

      expect(validateSessionMetrics(metrics)).toBe(false);
    });

    it('fails validation when pause exceeds total', () => {
      const metrics = {
        totalMs: 3600000,
        pauseMs: 4000000,
        productiveMs: -400000,
        focusPct: 0,
        pauseCount: 0,
        isShortSession: false,
      };

      expect(validateSessionMetrics(metrics)).toBe(false);
    });

    it('fails validation for focus percentage out of bounds', () => {
      const metrics = {
        totalMs: 3600000,
        pauseMs: 900000,
        productiveMs: 2700000,
        focusPct: 150,
        pauseCount: 2,
        isShortSession: false,
      };

      expect(validateSessionMetrics(metrics)).toBe(false);
    });

    it('fails validation when focus calculation doesn\'t match', () => {
      const metrics = {
        totalMs: 3600000,
        pauseMs: 900000,
        productiveMs: 2700000,
        focusPct: 50, // Should be 75%
        pauseCount: 2,
        isShortSession: false,
      };

      expect(validateSessionMetrics(metrics)).toBe(false);
    });
  });
});