// src/metrics/session.metrics.ts

import { ActiveTimer } from '../domain/timer.state';
import { MIN_SESSION_MS, MAX_SESSION_MS, FOCUS_PRECISION } from '../domain/time.constants';

export interface SessionMetrics {
  totalMs: number;
  pauseMs: number;
  productiveMs: number;
  focusPct: number;
  pauseCount: number;
  isShortSession: boolean;
}

/**
 * Calculate session metrics from active timer state
 */
export function calculateSessionMetrics(timer: ActiveTimer, now: number): SessionMetrics {
  let totalMs = 0;
  let pauseMs = timer.pausedDuration;
  let productiveMs = 0;

  // Calculate total duration based on timer type
  if (timer.timerType === 'COUNTDOWN' && timer.endTime) {
    // For countdown: total is from first start to end time
    totalMs = timer.endTime - timer.startTime;

    // If currently paused, add the open pause duration
    if (timer.state === 'PAUSED' && timer.pauseStartTime) {
      pauseMs += now - timer.pauseStartTime;
    }
  } else if (timer.timerType === 'INFINITY') {
    // For infinity: sum running elapsed + paused duration
    if (timer.state === 'PAUSED') {
      // No running time when paused
      totalMs = pauseMs;
    } else {
      const runningElapsed = now - timer.startTime;
      totalMs = runningElapsed + pauseMs;
    }
  }

  // Apply session bounds
  totalMs = Math.min(Math.max(0, totalMs), MAX_SESSION_MS);

  // Ensure pause doesn't exceed total
  pauseMs = Math.min(pauseMs, totalMs);

  // Calculate productive time
  productiveMs = Math.max(0, totalMs - pauseMs);

  // Calculate focus percentage
  let focusPct = 0;
  if (totalMs > 0) {
    focusPct = (productiveMs / totalMs) * 100;
    focusPct = Math.round(focusPct * 10) / 10; // Round to 1 decimal
  }
  focusPct = Math.min(100, Math.max(0, focusPct)); // Clamp to [0,100]

  // Check if it's a short session
  const isShortSession = totalMs < MIN_SESSION_MS && totalMs > 0;

  return {
    totalMs,
    pauseMs,
    productiveMs,
    focusPct,
    pauseCount: timer.pauseCount,
    isShortSession,
  };
}

/**
 * Calculate metrics from manual time entry
 */
export function calculateManualEntryMetrics(durationMs: number, productivePct: number): SessionMetrics {
  // Apply bounds
  const totalMs = Math.min(Math.max(0, durationMs), MAX_SESSION_MS);
  const clampedProductivePct = Math.min(100, Math.max(0, productivePct));

  let productiveMs = 0;
  let focusPct = 0;

  if (totalMs > 0) {
    productiveMs = Math.round((totalMs * clampedProductivePct) / 100);
    focusPct = clampedProductivePct;
    focusPct = Math.round(focusPct * 10) / 10; // Round to 1 decimal
  }

  const pauseMs = totalMs - productiveMs;

  return {
    totalMs,
    pauseMs,
    productiveMs,
    focusPct,
    pauseCount: 0,
    isShortSession: totalMs < MIN_SESSION_MS && totalMs > 0,
  };
}

/**
 * Validate session metrics invariants
 */
export function validateSessionMetrics(metrics: SessionMetrics): boolean {
  // Check non-negative
  if (metrics.totalMs < 0 || metrics.pauseMs < 0 || metrics.productiveMs < 0) {
    return false;
  }

  // Check pause doesn't exceed total
  if (metrics.pauseMs > metrics.totalMs) {
    return false;
  }

  // Check productive + pause equals total (allow 1ms rounding)
  if (Math.abs((metrics.productiveMs + metrics.pauseMs) - metrics.totalMs) > 1) {
    return false;
  }

  // Check focus percentage bounds
  if (metrics.focusPct < 0 || metrics.focusPct > 100) {
    return false;
  }

  // Check focus calculation matches
  if (metrics.totalMs > 0) {
    const calculatedFocus = Math.round((metrics.productiveMs / metrics.totalMs) * 1000) / 10;
    if (Math.abs(calculatedFocus - metrics.focusPct) > 0.1) {
      return false;
    }
  }

  return true;
}