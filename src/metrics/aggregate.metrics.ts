// src/metrics/aggregate.metrics.ts

import { SessionMetrics } from './session.metrics';
import { DaySegment } from './day.split';

export interface RollupMetrics {
  totalMs: number;
  productiveMs: number;
  pauseMs: number;
  pauseCount: number;
  weightedFocusPct: number;
  avgPauseMs: number;
  sessionCount: number;
}

export interface PauseDistribution {
  '0-30s': number;
  '30s-2m': number;
  '2m-5m': number;
  '>5m': number;
}

/**
 * Calculate rollup metrics from an array of session metrics
 */
export function calculateRollupMetrics(sessions: SessionMetrics[]): RollupMetrics {
  const totalMs = sessions.reduce((sum, session) => sum + session.totalMs, 0);
  const productiveMs = sessions.reduce((sum, session) => sum + session.productiveMs, 0);
  const pauseMs = sessions.reduce((sum, session) => sum + session.pauseMs, 0);
  const pauseCount = sessions.reduce((sum, session) => sum + session.pauseCount, 0);
  const sessionCount = sessions.length;

  // Calculate weighted focus percentage
  let weightedFocusPct = 0;
  if (totalMs > 0) {
    weightedFocusPct = (productiveMs / totalMs) * 100;
    weightedFocusPct = Math.round(weightedFocusPct * 10) / 10; // Round to 1 decimal
    weightedFocusPct = Math.min(100, Math.max(0, weightedFocusPct)); // Clamp
  }

  // Calculate average pause duration
  const avgPauseMs = pauseCount > 0 ? Math.round(pauseMs / pauseCount) : 0;

  return {
    totalMs,
    productiveMs,
    pauseMs,
    pauseCount,
    weightedFocusPct,
    avgPauseMs,
    sessionCount,
  };
}

/**
 * Calculate rollup from day segments (for daily totals)
 */
export function calculateRollupFromSegments(segments: DaySegment[]): RollupMetrics {
  const totalMs = segments.reduce((sum, seg) => sum + seg.totalMs, 0);
  const productiveMs = segments.reduce((sum, seg) => sum + (seg.totalMs - seg.pauseMs), 0);
  const pauseMs = segments.reduce((sum, seg) => sum + seg.pauseMs, 0);

  let weightedFocusPct = 0;
  if (totalMs > 0) {
    weightedFocusPct = (productiveMs / totalMs) * 100;
    weightedFocusPct = Math.round(weightedFocusPct * 10) / 10;
    weightedFocusPct = Math.min(100, Math.max(0, weightedFocusPct));
  }

  return {
    totalMs,
    productiveMs,
    pauseMs,
    pauseCount: 0, // Not tracked at segment level
    weightedFocusPct,
    avgPauseMs: 0, // Not tracked at segment level
    sessionCount: segments.length,
  };
}

/**
 * Categorize pause durations
 */
export function categorizePauses(sessions: SessionMetrics[]): PauseDistribution {
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

/**
 * Validate rollup metrics
 */
export function validateRollupMetrics(metrics: RollupMetrics): boolean {
  // Check non-negative
  if (metrics.totalMs < 0 || metrics.productiveMs < 0 || metrics.pauseMs < 0) {
    return false;
  }

  // Check pause doesn't exceed total
  if (metrics.pauseMs > metrics.totalMs) {
    return false;
  }

  // Check productive + pause equals total
  if (Math.abs((metrics.productiveMs + metrics.pauseMs) - metrics.totalMs) > 1) {
    return false;
  }

  // Check focus percentage bounds
  if (metrics.weightedFocusPct < 0 || metrics.weightedFocusPct > 100) {
    return false;
  }

  // Check pause count consistency
  if (metrics.pauseCount < 0) {
    return false;
  }

  return true;
}

/**
 * Merge multiple rollups
 */
export function mergeRollups(rollups: RollupMetrics[]): RollupMetrics {
  if (rollups.length === 0) {
    return {
      totalMs: 0,
      productiveMs: 0,
      pauseMs: 0,
      pauseCount: 0,
      weightedFocusPct: 0,
      avgPauseMs: 0,
      sessionCount: 0,
    };
  }

  const totalMs = rollups.reduce((sum, r) => sum + r.totalMs, 0);
  const productiveMs = rollups.reduce((sum, r) => sum + r.productiveMs, 0);
  const pauseMs = rollups.reduce((sum, r) => sum + r.pauseMs, 0);
  const pauseCount = rollups.reduce((sum, r) => sum + r.pauseCount, 0);
  const sessionCount = rollups.reduce((sum, r) => sum + r.sessionCount, 0);

  let weightedFocusPct = 0;
  if (totalMs > 0) {
    weightedFocusPct = (productiveMs / totalMs) * 100;
    weightedFocusPct = Math.round(weightedFocusPct * 10) / 10;
    weightedFocusPct = Math.min(100, Math.max(0, weightedFocusPct));
  }

  const avgPauseMs = pauseCount > 0 ? Math.round(pauseMs / pauseCount) : 0;

  return {
    totalMs,
    productiveMs,
    pauseMs,
    pauseCount,
    weightedFocusPct,
    avgPauseMs,
    sessionCount,
  };
}