import { Pause, Timer, Target, TrendingUp } from 'lucide-react';

/**
 * Format duration from milliseconds to human readable format
 */
export function formatDurationMs(ms: number): string {
  if (ms < 1000) return '0s';
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Format focus percentage with appropriate styling
 */
export function formatFocusPercentage(percentage: number): string {
  return `${Math.round(percentage * 10) / 10}%`;
}

/**
 * Get focus percentage color class based on value
 */
export function getFocusPercentageColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Extract metrics from activity log data
 */
export function extractMetricsFromLog(log: any): {
  totalDuration: number;
  productiveDuration: number;
  pauseDuration: number;
  pauseCount: number;
  focusPercentage: number;
} | null {
  if (!log?.payload) return null;
  
  const payload = log.payload;
  
  // Check if metrics are available in the log
  if (typeof payload.totalDuration === 'number' &&
      typeof payload.productiveDuration === 'number' &&
      typeof payload.pauseDuration === 'number' &&
      typeof payload.pauseCount === 'number' &&
      typeof payload.focusPercentage === 'number') {
    return {
      totalDuration: payload.totalDuration,
      productiveDuration: payload.productiveDuration,
      pauseDuration: payload.pauseDuration,
      pauseCount: payload.pauseCount,
      focusPercentage: payload.focusPercentage
    };
  }
  
  // Fallback: calculate basic metrics from duration if available
  if (typeof payload.duration === 'number') {
    const durationMs = payload.duration * 1000; // Convert seconds to ms
    return {
      totalDuration: durationMs,
      productiveDuration: durationMs, // Assume no pauses for legacy data
      pauseDuration: 0,
      pauseCount: 0,
      focusPercentage: 100
    };
  }
  
  return null;
}

/**
 * Metric display configuration
 */
export const METRIC_ICONS = {
  total: Timer,
  productive: Target,
  pause: Pause,
  focus: TrendingUp
} as const;

/**
 * Format pause count display
 */
export function formatPauseCount(count: number): string {
  if (count === 0) return 'No pauses';
  if (count === 1) return '1 pause';
  return `${count} pauses`;
}