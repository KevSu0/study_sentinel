import { type CompletedWork } from '@/lib/types';

export interface SessionMetrics {
  totalDuration: number; // Total session time in ms
  productiveDuration: number; // Total time minus pauses in ms
  pauseDuration: number; // Total pause time in ms
  pauseCount: number; // Number of pause events
  focusPercentage: number; // (productiveDuration / totalDuration) * 100
}

export interface DayAggregates {
  date: string;
  sumTotalMs: number;
  sumProductiveMs: number;
  sumPauseMs: number;
  sessionsCount: number;
  validSessionsCount: number;
  focusWeightedPercentage: number; // Time-weighted focus percentage
  pauseHistogram: {
    '0-30s': number;
    '30s-2m': number;
    '2m-5m': number;
    '5m+': number;
  };
  bestFocusHour: number; // Hour with highest median focus (0-23)
}

export const METRICS_VERSION = '1.1.0';
const MINIMUM_SESSION_DURATION = 60 * 1000; // 60 seconds in ms
const MINIMUM_PAUSE_DURATION = 5 * 1000; // 5 seconds in ms
const MAXIMUM_SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours in ms
const DAY_CUT_HOUR = 4; // 4 AM IST

/**
 * Calculate session metrics from timer state
 */
export function calculateSessionMetrics(timerState: {
  startTime?: number;
  endTime?: number;
  pausedDuration: number;
  pauseCount: number;
  isPaused: boolean;
  pauseStartTime?: number;
}): SessionMetrics {
  const now = Date.now();

  // Calculate total duration
  let totalDuration: number;

  if (timerState.endTime) {
    // Countdown timer
    totalDuration = timerState.endTime - (timerState.startTime || timerState.endTime - timerState.pausedDuration);
  } else if (timerState.startTime) {
    // Infinity timer
    totalDuration = timerState.isPaused
      ? timerState.pausedDuration
      : now - timerState.startTime + timerState.pausedDuration;
  } else {
    // Fallback
    totalDuration = timerState.pausedDuration;
  }

  // Add any open pause duration
  if (timerState.isPaused && timerState.pauseStartTime) {
    const openPauseDuration = now - timerState.pauseStartTime;
    totalDuration += openPauseDuration;
  }

  // Apply constraints
  totalDuration = Math.min(Math.max(totalDuration, 0), MAXIMUM_SESSION_DURATION);

  // Calculate pause duration (already accumulated)
  const pauseDuration = Math.min(timerState.pausedDuration, totalDuration);

  // Calculate productive duration
  const productiveDuration = Math.max(0, totalDuration - pauseDuration);

  // Calculate focus percentage
  const focusPercentage = totalDuration > 0
    ? Math.round((productiveDuration / totalDuration) * 1000) / 10 // Round to 1 decimal
    : 0;

  // Clamp to 0-100
  const clampedFocusPercentage = Math.max(0, Math.min(100, focusPercentage));

  return {
    totalDuration,
    productiveDuration,
    pauseDuration,
    pauseCount: timerState.pauseCount || 0,
    focusPercentage: clampedFocusPercentage,
  };
}

/**
 * Calculate time-weighted focus percentage from multiple sessions
 */
export function calculateTimeWeightedFocusPercentage(sessions: CompletedWork[]): number {
  if (sessions.length === 0) return 0;

  const validSessions = sessions.filter(s => s.totalDuration > 0 && s.focusPercentage >= 0);

  if (validSessions.length === 0) return 0;

  const totalProductiveMs = validSessions.reduce((sum, s) => sum + s.productiveDuration, 0);
  const totalMs = validSessions.reduce((sum, s) => sum + s.totalDuration, 0);

  if (totalMs === 0) return 0;

  return Math.round((totalProductiveMs / totalMs) * 1000) / 10;
}

/**
 * Trim outliers from sessions (top and bottom 1% by duration and pause ratio)
 */
export function trimOutliers(sessions: CompletedWork[]): CompletedWork[] {
  if (sessions.length < 100) return sessions; // Don't trim small datasets

  const sortedByDuration = [...sessions].sort((a, b) => a.totalDuration - b.totalDuration);
  const trimCount = Math.max(1, Math.floor(sessions.length * 0.01));

  // Trim top and bottom 1% by duration
  const trimmedByDuration = sortedByDuration.slice(trimCount, -trimCount);

  // Calculate pause ratios
  const withPauseRatios = trimmedByDuration.map(s => ({
    ...s,
    pauseRatio: s.totalDuration > 0 ? s.pauseDuration / s.totalDuration : 0
  }));

  const sortedByPauseRatio = [...withPauseRatios].sort((a, b) => a.pauseRatio - b.pauseRatio);
  const trimmedByPauseRatio = sortedByPauseRatio.slice(trimCount, -trimCount);

  // Return original sessions without pause ratio property
  return trimmedByPauseRatio.map(({ pauseRatio, ...rest }) => rest);
}

/**
 * Split a session that crosses day boundaries
 */
export function splitSessionAcrossDays(
  session: CompletedWork,
  sessionStart: Date,
  sessionEnd: Date
): Array<{ date: string; totalMs: number; pauseMs: number }> {
  const splits: Array<{ date: string; totalMs: number; pauseMs: number }> = [];

  // Create day buckets from session start to end
  let currentDate = new Date(sessionStart);
  currentDate.setHours(DAY_CUT_HOUR, 0, 0, 0);

  if (currentDate > sessionStart) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (currentDate < sessionEnd) {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const segmentStart = new Date(Math.max(sessionStart.getTime(), currentDate.getTime()));
    const segmentEnd = new Date(Math.min(sessionEnd.getTime(), nextDay.getTime()));

    const segmentDuration = segmentEnd.getTime() - segmentStart.getTime();
    const totalDuration = session.totalDuration;

    // Calculate proportional split
    const proportion = segmentDuration / totalDuration;
    const segmentTotalMs = Math.round(totalDuration * proportion);
    const segmentPauseMs = Math.round(session.pauseDuration * proportion);

    splits.push({
      date: currentDate.toISOString().split('T')[0],
      totalMs: segmentTotalMs,
      pauseMs: segmentPauseMs,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return splits;
}

/**
 * Calculate pause histogram for sessions
 */
export function calculatePauseHistogram(sessions: CompletedWork[]) {
  const histogram = {
    '0-30s': 0,
    '30s-2m': 0,
    '2m-5m': 0,
    '5m+': 0,
  };

  sessions.forEach(session => {
    const avgPauseDuration = session.pauseCount > 0
      ? session.pauseDuration / session.pauseCount
      : 0;

    if (avgPauseDuration <= 30 * 1000) {
      histogram['0-30s']++;
    } else if (avgPauseDuration <= 2 * 60 * 1000) {
      histogram['30s-2m']++;
    } else if (avgPauseDuration <= 5 * 60 * 1000) {
      histogram['2m-5m']++;
    } else {
      histogram['5m+']++;
    }
  });

  return histogram;
}

/**
 * Find hour with best focus (median)
 */
export function findBestFocusHour(sessions: CompletedWork[]): number {
  const hourlyFocus: { [hour: number]: number[] } = {};

  sessions.forEach(session => {
    const hour = new Date(session.timestamp).getHours();
    if (!hourlyFocus[hour]) hourlyFocus[hour] = [];
    hourlyFocus[hour].push(session.focusPercentage);
  });

  let bestHour = 0;
  let bestMedian = 0;

  Object.entries(hourlyFocus).forEach(([hour, percentages]) => {
    const sorted = [...percentages].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    if (median > bestMedian) {
      bestMedian = median;
      bestHour = parseInt(hour);
    }
  });

  return bestHour;
}

/**
 * Convert CompletedWork to SessionMetrics
 */
export function completedWorkToSessionMetrics(work: CompletedWork): SessionMetrics {
  return {
    totalDuration: work.totalDuration,
    productiveDuration: work.productiveDuration,
    pauseDuration: work.pauseDuration,
    pauseCount: work.pauseCount,
    focusPercentage: work.focusPercentage,
  };
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number, showHours = false): string {
  if (ms < 0) return '00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (showHours && hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}