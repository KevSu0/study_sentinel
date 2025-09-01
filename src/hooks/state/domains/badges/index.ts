// Badge Domain Types
export type {
  BadgeState,
  BadgeActions,
  BadgeContextType,
  BadgeAwardingCriteria,
} from './badge-state-types';

export {
  defaultBadgeState,
  BADGE_STORAGE_KEYS,
} from './badge-state-types';

// Badge State Management
export {
  useBadgeState,
  useBadgeStats as useBadgeStateStats,
} from './use-badge-state';

// Badge Checking and Validation
export {
  useBadgeChecker,
  useBadgeValidation,
} from './use-badge-checker';

// Badge Provider and Context
export {
  BadgeProvider,
  useBadges,
  useBadgeData,
  useBadgeActions,
  useBadgeChecking,
  useBadgeStats,
  useIsBadgeEarned,
  useEarnedBadges,
  useUnearnedBadges,
  useTodaysBadges,
} from './BadgeProvider';