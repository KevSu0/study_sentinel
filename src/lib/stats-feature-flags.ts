/**
 * Stats Hardening v1.0.0 Feature Flags
 *
 * Controls gradual rollout of hardened stats features
 */

export interface StatsFeatureFlags {
  // Web Worker for offloading computations
  'stats.worker.v1': boolean;

  // Incremental badge evaluation
  'badges.incremental.v1': boolean;

  // Daily rollups with event sourcing
  'stats.rollup.v2': boolean;

  // Accessibility improvements
  'stats.accessibility.v1': boolean;

  // Observability system
  'stats.observability.v1': boolean;
}

// Default flags (all enabled for development)
const defaultFlags: StatsFeatureFlags = {
  'stats.worker.v1': true,
  'badges.incremental.v1': true,
  'stats.rollup.v2': true,
  'stats.accessibility.v1': true,
  'stats.observability.v1': true
};

// Get flags from environment or localStorage
export function getStatsFeatureFlags(): StatsFeatureFlags {
  if (typeof window === 'undefined') {
    // Server-side - use environment defaults
    return {
      ...defaultFlags,
      'stats.worker.v1': process.env.STATS_WORKER_V1 === 'true',
      'badges.incremental.v1': process.env.BADGES_INCREMENTAL_V1 === 'true',
      'stats.rollup.v2': process.env.STATS_ROLLUP_V2 === 'true',
      'stats.accessibility.v1': process.env.STATS_ACCESSIBILITY_V1 === 'true',
      'stats.observability.v1': process.env.STATS_OBSERVABILITY_V1 === 'true'
    };
  }

  // Client-side - check localStorage for overrides
  try {
    const stored = localStorage.getItem('stats-feature-flags');
    if (stored) {
      return { ...defaultFlags, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore localStorage errors
  }

  return defaultFlags;
}

// Check if user is in canary cohort (100% for development)
export function isInStatsCanaryCohort(): boolean {
  // Development environment - always return true
  return true;
}

// Get flags for current user
export function getUserStatsFeatureFlags(): StatsFeatureFlags {
  // Development environment - all features enabled for everyone
  return defaultFlags;
}

// For testing - override flags
export function setStatsFeatureFlags(flags: Partial<StatsFeatureFlags>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getStatsFeatureFlags();
    localStorage.setItem('stats-feature-flags', JSON.stringify({ ...current, ...flags }));

    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('stats-flags-changed', { detail: flags }));
  } catch {
    // Ignore errors
  }
}

// Debug utility to check current status
export function getStatsFeatureDebugInfo() {
  return {
    flags: getUserStatsFeatureFlags(),
    isCanary: isInStatsCanaryCohort(),
    timestamp: Date.now()
  };
}