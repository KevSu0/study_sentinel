// src/domain/timer.rules.ts

import { ActiveTimer, TimerState } from './timer.state';
import { MIN_SESSION_MS, MAX_SESSION_MS, MIN_PAUSE_MS } from './time.constants';

/**
 * Calculate remaining time for countdown timer
 */
export function calculateRemainingTime(timer: ActiveTimer, now: number): number {
  if (timer.timerType !== 'COUNTDOWN' || !timer.endTime) {
    return 0;
  }

  return timer.endTime - now;
}

/**
 * Calculate progress percentage for countdown timer
 */
export function calculateProgress(timer: ActiveTimer, now: number): number {
  if (timer.timerType !== 'COUNTDOWN' || !timer.duration || !timer.startTime) {
    return 0;
  }

  const planned = timer.duration * 60 * 1000; // Convert minutes to ms
  const remaining = calculateRemainingTime(timer, now);
  const progress = ((planned - remaining) / planned) * 100;

  return Math.min(100, Math.max(0, progress));
}

/**
 * Check if timer is in overtime (countdown only)
 */
export function isOvertime(timer: ActiveTimer, now: number): boolean {
  if (timer.timerType !== 'COUNTDOWN' || !timer.endTime) {
    return false;
  }

  return now > timer.endTime;
}

/**
 * Calculate elapsed time for infinity timer
 */
export function calculateElapsedInfinity(timer: ActiveTimer, now: number): number {
  if (timer.timerType !== 'INFINITY' || !timer.startTime) {
    return 0;
  }

  // If paused, no running time accumulates
  if (timer.state === 'PAUSED') {
    return 0;
  }

  // Calculate elapsed since last resume/start
  return now - timer.startTime;
}

/**
 * Validate timer transition
 */
export function validateTransition(
  from: typeof TimerState[keyof typeof TimerState],
  to: typeof TimerState[keyof typeof TimerState],
  timer?: ActiveTimer
): { valid: boolean; reason?: string } {
  // Basic state machine validation
  const validTransitions: Record<string, string[]> = {
    [TimerState.IDLE]: [TimerState.RUNNING],
    [TimerState.RUNNING]: [TimerState.PAUSED, TimerState.STOPPED],
    [TimerState.PAUSED]: [TimerState.RUNNING, TimerState.STOPPED],
    [TimerState.STOPPED]: [TimerState.IDLE],
  };

  const fromTransitions = validTransitions[from];
  if (!fromTransitions || !fromTransitions.includes(to)) {
    return { valid: false, reason: `Cannot transition from ${from} to ${to}` };
  }

  // Additional validations
  if (to === 'RUNNING' && timer?.state === 'PAUSED') {
    // Must have paused for at least MIN_PAUSE_MS
    if (timer.pauseStartTime && now() - timer.pauseStartTime < MIN_PAUSE_MS) {
      return {
        valid: false,
        reason: `Minimum pause duration of ${MIN_PAUSE_MS}ms not met`
      };
    }
  }

  return { valid: true };
}

// Helper to get current timestamp
function now(): number {
  return Date.now();
}

/**
 * Calculate session metrics when stopping
 */
export function calculateStopMetrics(timer: ActiveTimer, now: number): {
  totalMs: number;
  pauseMs: number;
  productiveMs: number;
} {
  let totalMs = 0;
  let pauseMs = timer.pausedDuration;
  let productiveMs = 0;

  if (timer.timerType === 'COUNTDOWN' && timer.endTime) {
    // For countdown: total is from first start to end
    totalMs = timer.endTime - timer.startTime;

    // If currently paused, add the open pause
    if (timer.state === 'PAUSED' && timer.pauseStartTime) {
      pauseMs += now - timer.pauseStartTime;
    }
  } else if (timer.timerType === 'INFINITY') {
    // For infinity: sum running time + paused duration
    const runningElapsed = timer.state === 'PAUSED' ? 0 : now - timer.startTime;
    totalMs = runningElapsed + timer.pausedDuration;
  }

  // Ensure pause doesn't exceed total
  pauseMs = Math.min(pauseMs, totalMs);

  // Productive time is what's left
  productiveMs = Math.max(0, totalMs - pauseMs);

  // Apply session bounds
  totalMs = Math.min(Math.max(0, totalMs), MAX_SESSION_MS);

  return { totalMs, pauseMs, productiveMs };
}