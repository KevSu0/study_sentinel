// src/selectors/rollup.range.ts

import { calculateRollupMetrics } from '../metrics/aggregate.metrics';
import { splitSessionByDay } from '../metrics/day.split';
import { getSessionsInRange } from './sessions.range';
import { RollupMetrics, PauseDistribution } from '../metrics/aggregate.metrics';
import { validateRollupResult, validateDaySplitSegments } from '../lib/invariants';

export interface RollupResult {
  metrics: RollupMetrics;
  dailyBreakdown: { [date: string]: RollupMetrics };
  pauseDistribution: PauseDistribution;
  hasData: boolean;
}

/**
 * Get rollup metrics for date range
 */
export function getRollupInRange(
  startDate: string,
  endDate: string,
  includeManual: boolean = true
): RollupResult {
  const sessions = getSessionsInRange(startDate, endDate, includeManual);

  if (sessions.length === 0) {
    return {
      metrics: {
        totalMs: 0,
        productiveMs: 0,
        pauseMs: 0,
        pauseCount: 0,
        weightedFocusPct: 0,
        avgPauseMs: 0,
        sessionCount: 0,
      },
      dailyBreakdown: {},
      pauseDistribution: {
        '0-30s': 0,
        '30s-2m': 0,
        '2m-5m': 0,
        '>5m': 0,
      },
      hasData: false,
    };
  }

  // Calculate overall metrics
  const sessionMetrics = sessions.map(session => ({
    totalMs: session.totalMs,
    productiveMs: session.productiveMs,
    pauseMs: session.pauseMs,
    pauseCount: session.pauseCount,
    focusPct: session.focusPct,
    isShortSession: session.isShortSession,
  }));

  const metrics = calculateRollupMetrics(sessionMetrics);

  // Calculate daily breakdown with day splitting
  const dailyBreakdown: { [date: string]: RollupMetrics } = {};

  for (const session of sessions) {
    // Split session across day boundaries
    const segments = splitSessionByDay(
      session.startTs,
      session.endTs,
      session.pauseMs
    );

    // Validate day split integrity in development
    validateDaySplitSegments(session.totalMs, session.pauseMs, segments);

    for (const segment of segments) {
      if (!dailyBreakdown[segment.date]) {
        dailyBreakdown[segment.date] = {
          totalMs: 0,
          productiveMs: 0,
          pauseMs: 0,
          pauseCount: 0,
          weightedFocusPct: 0,
          avgPauseMs: 0,
          sessionCount: 0,
        };
      }

      dailyBreakdown[segment.date].totalMs += segment.totalMs;
      dailyBreakdown[segment.date].pauseMs += segment.pauseMs;
      dailyBreakdown[segment.date].productiveMs += segment.totalMs - segment.pauseMs;
      dailyBreakdown[segment.date].sessionCount += 1;
    }
  }

  // Calculate weighted focus for each day
  for (const date in dailyBreakdown) {
    const day = dailyBreakdown[date];
    if (day.totalMs > 0) {
      day.weightedFocusPct = Math.round((day.productiveMs / day.totalMs) * 1000) / 10;
      day.weightedFocusPct = Math.min(100, Math.max(0, day.weightedFocusPct));
    }
    day.avgPauseMs = day.pauseCount > 0 ? Math.round(day.pauseMs / day.pauseCount) : 0;
  }

  // Calculate pause distribution
  const pauseDistribution = calculatePauseDistribution(sessions);

  const result = {
    metrics,
    dailyBreakdown,
    pauseDistribution,
    hasData: true,
  };

  // Validate in development
  validateRollupResult({
    totalMs: metrics.totalMs,
    productiveMs: metrics.productiveMs,
    pauseMs: metrics.pauseMs,
    focusPct: metrics.weightedFocusPct,
    sessionCount: metrics.sessionCount,
  });

  return result;
}

/**
 * Get rollup for a single date
 */
export function getRollupForDate(
  date: string,
  includeManual: boolean = true
): RollupMetrics {
  const result = getRollupInRange(date, date, includeManual);
  return result.metrics;
}

/**
 * Get rollup for today
 */
export function getRollupForToday(includeManual: boolean = true): RollupMetrics {
  const today = new Date();
  const dateKey = today.toISOString().split('T')[0];
  return getRollupForDate(dateKey, includeManual);
}

/**
 * Get rollup for this week
 */
export function getRollupForThisWeek(includeManual: boolean = true): RollupMetrics {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startDate = startOfWeek.toISOString().split('T')[0];
  const endDate = endOfWeek.toISOString().split('T')[0];

  const result = getRollupInRange(startDate, endDate, includeManual);
  return result.metrics;
}

/**
 * Calculate pause distribution from sessions
 */
function calculatePauseDistribution(sessions: any[]): PauseDistribution {
  const distribution: PauseDistribution = {
    '0-30s': 0,
    '30s-2m': 0,
    '2m-5m': 0,
    '>5m': 0,
  };

  for (const session of sessions) {
    if (session.pauseCount === 0) continue;

    const avgPause = session.pauseMs / session.pauseCount;

    if (avgPause <= 30000) { // 30 seconds
      distribution['0-30s'] += session.pauseCount;
    } else if (avgPause <= 120000) { // 2 minutes
      distribution['30s-2m'] += session.pauseCount;
    } else if (avgPause <= 300000) { // 5 minutes
      distribution['2m-5m'] += session.pauseCount;
    } else {
      distribution['>5m'] += session.pauseCount;
    }
  }

  return distribution;
}