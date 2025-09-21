// src/selectors/timer.view.ts

import { activeTimerStore } from '../data/ephemeral/activeTimer.store';
import { calculateRemainingTime, calculateProgress, isOvertime } from '../domain/timer.rules';
import { formatDurationMs as formatDuration } from '../lib/format-metrics';

export interface TimerDisplay {
  id: string | null;
  title: string;
  displayTime: string; // h:mm:ss format
  progress: number; // 0-100 for countdown
  isRunning: boolean;
  isPaused: boolean;
  isOvertime: boolean;
  pauseCount: number;
  timerType: 'COUNTDOWN' | 'INFINITY';
  state: string;
  priority?: number;
}

/**
 * Get timer display data
 */
export function getTimerDisplay(now: number = Date.now()): TimerDisplay {
  const timer = activeTimerStore.get();

  if (!timer) {
    return {
      id: null,
      title: '',
      displayTime: '0:00:00',
      progress: 0,
      isRunning: false,
      isPaused: false,
      isOvertime: false,
      pauseCount: 0,
      timerType: 'COUNTDOWN',
      state: 'IDLE',
    };
  }

  let displayTime = '0:00:00';
  let progress = 0;

  if (timer.timerType === 'COUNTDOWN') {
    const remaining = calculateRemainingTime(timer, now);
    displayTime = formatDuration(Math.abs(remaining));
    progress = calculateProgress(timer, now);
  } else {
    // Infinity timer - show elapsed time
    const elapsed = timer.state === 'PAUSED'
      ? timer.pausedDuration
      : (now - timer.startTime) + timer.pausedDuration;
    displayTime = formatDuration(elapsed);
  }

  return {
    id: timer.id,
    title: timer.title,
    displayTime,
    progress,
    isRunning: timer.state === 'RUNNING',
    isPaused: timer.state === 'PAUSED',
    isOvertime: isOvertime(timer, now),
    pauseCount: timer.pauseCount,
    timerType: timer.timerType,
    state: timer.state,
    priority: timer.priority,
  };
}

/**
 * Get timer status for UI indicators
 */
export function getTimerStatus(now: number = Date.now()): {
  isActive: boolean;
  state: string;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
} {
  const timer = activeTimerStore.get();

  if (!timer) {
    return {
      isActive: false,
      state: 'IDLE',
      canPause: false,
      canResume: false,
      canStop: false,
    };
  }

  return {
    isActive: true,
    state: timer.state,
    canPause: timer.state === 'RUNNING',
    canResume: timer.state === 'PAUSED',
    canStop: timer.state === 'RUNNING' || timer.state === 'PAUSED',
  };
}

/**
 * Memoization cache for timer display
 */
const timerDisplayCache = new Map<string, { data: TimerDisplay; timestamp: number }>();
const CACHE_TTL = 1000; // 1 second

/**
 * Get cached timer display
 */
export function getCachedTimerDisplay(now: number = Date.now()): TimerDisplay {
  const cacheKey = 'timer-display';
  const cached = timerDisplayCache.get(cacheKey);

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const data = getTimerDisplay(now);
  timerDisplayCache.set(cacheKey, { data, timestamp: now });

  return data;
}

/**
 * Clear timer display cache
 */
export function clearTimerDisplayCache(): void {
  timerDisplayCache.clear();
}