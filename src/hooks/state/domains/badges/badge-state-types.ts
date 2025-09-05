import type { Badge, ActivityAttempt, ActivityEvent, StudyTask, Routine } from '@/lib/types';

export type BadgeState = {
  allBadges: Badge[];
  earnedBadges: Map<string, number>;
  isLoading?: boolean;
  error?: string | null;
};

export type BadgeAwardingCriteria = {
  completedTasks: number;
  completedRoutines: number;
  totalStudyTime: number; // minutes
  consecutiveDays: number;
  todaysAttempts: ActivityAttempt[];
};

export type BadgeActions = {
  addBadge: (b: Omit<Badge, 'id'>) => void | Promise<void>;
  updateBadge: (b: Badge) => void | Promise<void>;
  deleteBadge: (id: string) => void | Promise<void>;
  checkAndAwardBadges: (
    tasks: StudyTask[],
    attempts: ActivityAttempt[],
    events: ActivityEvent[],
    routines: Routine[]
  ) => void | Promise<void>;
  resetBadges: () => void;
};

export type BadgeContextType = {
  state: BadgeState;
  actions: BadgeActions;
};

export const defaultBadgeState: BadgeState = {
  allBadges: [],
  earnedBadges: new Map<string, number>(),
  isLoading: false,
  error: null,
};

export const BADGE_STORAGE_KEYS = {
  BADGES: 'badges',
  EARNED: 'earnedBadges',
};