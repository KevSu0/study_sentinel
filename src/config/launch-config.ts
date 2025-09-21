// Timezone migration launch configuration
export const TIMEZONE_LAUNCH_CONFIG = {
  // Launch timing (all times in IST)
  dayZeroTimestamp: '2025-09-22T12:00:00+05:30', // Day-0: 2025-09-22 at 12:00 PM IST
  comparisonWindowDays: 30,

  // Rollout percentages - Immediate full rollout
  rolloutStages: {
    stage1: 1.0,  // 100% - Immediate full rollout
    stage2: 1.0,  // 100% - Immediate full rollout
    stage3: 1.0   // 100% - Immediate full rollout
  },

  // Default view settings
  defaultView: 'new' as 'new' | 'legacy',
  showLegacyToggle: true,

  // Kill switch
  killSwitch: {
    enabled: false,
    reason: null as string | null
  },

  // Monitoring thresholds
  thresholds: {
    hydrationMismatchRate: 0.05, // 5% increase allowed
    diffAnomalyRate: 0.001,      // 0.1% max diff rate
    supportTicketIncrease: 0.10, // 10% increase allowed
    persistentLegacyUsers: 0.02  // 2% max persistent legacy users
  }
} as const;

// Helper to check if user is in rollout cohort
export function isInRolloutCohort(userId: string, stage: number): boolean {
  if (TIMEZONE_LAUNCH_CONFIG.killSwitch.enabled) {
    return false;
  }

  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const percentage = (hash % 100) / 100;

  switch (stage) {
    case 1: return percentage < TIMEZONE_LAUNCH_CONFIG.rolloutStages.stage1;
    case 2: return percentage < TIMEZONE_LAUNCH_CONFIG.rolloutStages.stage2;
    case 3: return percentage < TIMEZONE_LAUNCH_CONFIG.rolloutStages.stage3;
    default: return false;
  }
}