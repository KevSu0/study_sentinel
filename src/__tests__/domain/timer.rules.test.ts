// src/__tests__/domain/timer.rules.test.ts

import {
  calculateRemainingTime,
  calculateProgress,
  isOvertime,
  calculateElapsedInfinity,
  validateTransition,
  calculateStopMetrics,
} from '../../domain/timer.rules';
import { ActiveTimer } from '../../domain/timer.state';
import { TimerType, TimerState } from '../../domain/time.constants';

describe('Timer Rules', () => {
  const mockNow = 1000000000000; // Fixed timestamp for testing

  describe('calculateRemainingTime', () => {
    it('calculates remaining time for countdown timer', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.COUNTDOWN,
        state: TimerState.RUNNING,
        startTime: mockNow - 600000, // 10 minutes ago
        endTime: mockNow + 900000, // 15 minutes from now
        pausedDuration: 0,
        pauseCount: 0,
      };

      const remaining = calculateRemainingTime(timer, mockNow);
      expect(remaining).toBe(900000); // 15 minutes
    });

    it('returns 0 for infinity timer', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.INFINITY,
        state: TimerState.RUNNING,
        startTime: mockNow - 600000,
        pausedDuration: 0,
        pauseCount: 0,
      };

      const remaining = calculateRemainingTime(timer, mockNow);
      expect(remaining).toBe(0);
    });
  });

  describe('calculateProgress', () => {
    it('calculates progress percentage for countdown timer', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.COUNTDOWN,
        state: TimerState.RUNNING,
        startTime: mockNow - 600000, // 10 minutes ago
        endTime: mockNow + 900000, // 15 minutes from now
        duration: 25, // 25 minutes total
        pausedDuration: 0,
        pauseCount: 0,
      };

      const progress = calculateProgress(timer, mockNow);
      expect(progress).toBe(40); // 10/25 = 40%
    });

    it('clamps progress between 0 and 100', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.COUNTDOWN,
        state: TimerState.RUNNING,
        startTime: mockNow + 600000, // Future start time
        endTime: mockNow + 900000,
        duration: 5,
        pausedDuration: 0,
        pauseCount: 0,
      };

      const progress = calculateProgress(timer, mockNow);
      expect(progress).toBe(0);
    });
  });

  describe('isOvertime', () => {
    it('detects overtime for countdown timer', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.COUNTDOWN,
        state: TimerState.RUNNING,
        startTime: mockNow - 600000,
        endTime: mockNow - 100000, // Ended 100 seconds ago
        pausedDuration: 0,
        pauseCount: 0,
      };

      const overtime = isOvertime(timer, mockNow);
      expect(overtime).toBe(true);
    });

    it('returns false for timer not in overtime', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.COUNTDOWN,
        state: TimerState.RUNNING,
        startTime: mockNow - 600000,
        endTime: mockNow + 600000,
        pausedDuration: 0,
        pauseCount: 0,
      };

      const overtime = isOvertime(timer, mockNow);
      expect(overtime).toBe(false);
    });
  });

  describe('calculateElapsedInfinity', () => {
    it('calculates elapsed time for running infinity timer', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.INFINITY,
        state: TimerState.RUNNING,
        startTime: mockNow - 300000, // 5 minutes ago
        pausedDuration: 60000, // 1 minute of pauses
        pauseCount: 2,
      };

      const elapsed = calculateElapsedInfinity(timer, mockNow);
      expect(elapsed).toBe(300000); // 5 minutes
    });

    it('returns 0 for paused timer', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.INFINITY,
        state: TimerState.PAUSED,
        startTime: mockNow - 300000,
        pauseStartTime: mockNow - 30000,
        pausedDuration: 60000,
        pauseCount: 2,
      };

      const elapsed = calculateElapsedInfinity(timer, mockNow);
      expect(elapsed).toBe(0);
    });
  });

  describe('validateTransition', () => {
    it('allows valid transitions', () => {
      expect(validateTransition('IDLE', 'RUNNING').valid).toBe(true);
      expect(validateTransition('RUNNING', 'PAUSED').valid).toBe(true);
      expect(validateTransition('RUNNING', 'STOPPED').valid).toBe(true);
      expect(validateTransition('PAUSED', 'RUNNING').valid).toBe(true);
      expect(validateTransition('PAUSED', 'STOPPED').valid).toBe(true);
      expect(validateTransition('STOPPED', 'IDLE').valid).toBe(true);
    });

    it('rejects invalid transitions', () => {
      expect(validateTransition('RUNNING', 'IDLE').valid).toBe(false);
      expect(validateTransition('IDLE', 'STOPPED').valid).toBe(false);
      expect(validateTransition('STOPPED', 'RUNNING').valid).toBe(false);
    });
  });

  describe('calculateStopMetrics', () => {
    it('calculates metrics for countdown timer', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.COUNTDOWN,
        state: TimerState.RUNNING,
        startTime: mockNow - 1500000, // 25 minutes ago
        endTime: mockNow, // Just ended
        pausedDuration: 300000, // 5 minutes of pauses
        pauseCount: 2,
      };

      const metrics = calculateStopMetrics(timer, mockNow);
      expect(metrics.totalMs).toBe(1500000); // 25 minutes
      expect(metrics.pauseMs).toBe(300000); // 5 minutes
      expect(metrics.productiveMs).toBe(1200000); // 20 minutes
    });

    it('calculates metrics for infinity timer', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.INFINITY,
        state: TimerState.RUNNING,
        startTime: mockNow - 1500000, // 25 minutes ago
        pausedDuration: 300000, // 5 minutes of pauses
        pauseCount: 2,
      };

      const metrics = calculateStopMetrics(timer, mockNow);
      expect(metrics.totalMs).toBe(1800000); // 30 minutes total (25 running + 5 paused)
      expect(metrics.pauseMs).toBe(300000); // 5 minutes
      expect(metrics.productiveMs).toBe(1500000); // 25 minutes
    });

    it('handles paused state with open pause', () => {
      const timer: ActiveTimer = {
        id: 'test',
        entityType: 'TASK',
        entityId: 'task1',
        title: 'Test Task',
        timerType: TimerType.COUNTDOWN,
        state: TimerState.PAUSED,
        startTime: mockNow - 1500000,
        endTime: mockNow + 300000, // 5 minutes left
        pauseStartTime: mockNow - 60000, // Paused 1 minute ago
        pausedDuration: 240000, // 4 minutes of previous pauses
        pauseCount: 3,
      };

      const metrics = calculateStopMetrics(timer, mockNow);
      expect(metrics.pauseMs).toBe(300000); // 4 + 1 minutes
    });
  });
});