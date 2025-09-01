import { useCallback, useMemo } from 'react';
import { Badge, LogEvent, StudyTask, Routine } from '@/lib/types';
import { BadgeAwardingCriteria } from './badge-state-types';
import { checkBadge } from '@/lib/badges';
import { getBadgeAwardingCriteria, shouldAwardBadge } from '@/utils/badge-utils';

/**
 * Badge checking and awarding logic hook
 * Handles the complex logic for determining when badges should be awarded
 */
export function useBadgeChecker() {
  /**
   * Get badge awarding criteria from current data
   */
  const getBadgeCriteria = useCallback((logs: LogEvent[], tasks: StudyTask[], routines: Routine[]): BadgeAwardingCriteria => {
    const tasksMap = new Map(tasks.map(t => [t.id, t]));
    const routinesMap = new Map(routines.map(r => [r.id, r]));
    
    const criteria = getBadgeAwardingCriteria(logs, tasksMap, routinesMap);
    
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todaysLogs = logs.filter(log => {
      const logDate = new Date(parseInt(log.timestamp));
      return logDate >= todayStart;
    });
    
    return {
      ...criteria,
      todaysLogs,
    };
  }, []);

  /**
   * Check if a specific badge should be awarded
   */
  const checkBadgeEligibility = useCallback((badge: Badge, tasks: StudyTask[], logs: LogEvent[]): boolean => {
    if (!badge.isEnabled) return false;
    
    return checkBadge(badge, { tasks, logs });
  }, []);

  /**
   * Check if a badge should be awarded using the utility function
   */
  const shouldBadgeBeAwarded = useCallback((badge: Badge, criteria: BadgeAwardingCriteria): boolean => {
    return shouldAwardBadge(badge, criteria);
  }, []);

  /**
   * Get all badges that should be newly awarded
   */
  const getNewlyEarnedBadges = useCallback((
    allBadges: Badge[],
    earnedBadges: Map<string, number>,
    tasks: StudyTask[],
    logs: LogEvent[],
    routines: Routine[]
  ): Badge[] => {
    const criteria = getBadgeCriteria(logs, tasks, routines);
    const newlyEarned: Badge[] = [];
    
    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadges.has(badge.id)) continue;
      
      // Check if badge should be awarded
      const shouldAward = badge.conditions 
        ? checkBadgeEligibility(badge, tasks, logs)
        : shouldBadgeBeAwarded(badge, criteria);
      
      if (shouldAward) {
        newlyEarned.push(badge);
      }
    }
    
    return newlyEarned;
  }, [getBadgeCriteria, checkBadgeEligibility, shouldBadgeBeAwarded]);

  /**
   * Get badges earned today
   */
  const getTodaysEarnedBadges = useCallback((
    allBadges: Badge[],
    earnedBadges: Map<string, number>
  ): Badge[] => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    
    const todaysBadgeIds = Array.from(earnedBadges.entries())
      .filter(([_, timestamp]) => timestamp >= todayStart && timestamp < todayEnd)
      .map(([badgeId]) => badgeId);
    
    return allBadges.filter(badge => todaysBadgeIds.includes(badge.id));
  }, []);

  /**
   * Get user's badge statistics
   */
  const getBadgeStatistics = useCallback((
    allBadges: Badge[],
    earnedBadges: Map<string, number>,
    tasks: StudyTask[],
    logs: LogEvent[]
  ) => {
    const totalBadges = allBadges.length;
    const earnedCount = earnedBadges.size;
    const completionRate = totalBadges > 0 ? (earnedCount / totalBadges) * 100 : 0;
    
    const customBadges = allBadges.filter(b => b.isCustom);
    const systemBadges = allBadges.filter(b => !b.isCustom);
    
    const earnedCustom = customBadges.filter(b => earnedBadges.has(b.id)).length;
    const earnedSystem = systemBadges.filter(b => earnedBadges.has(b.id)).length;
    
    const todaysBadges = getTodaysEarnedBadges(allBadges, earnedBadges);
    
    return {
      total: totalBadges,
      earned: earnedCount,
      completionRate,
      custom: {
        total: customBadges.length,
        earned: earnedCustom,
      },
      system: {
        total: systemBadges.length,
        earned: earnedSystem,
      },
      today: todaysBadges.length,
      recentlyEarned: todaysBadges,
    };
  }, [getTodaysEarnedBadges]);

  /**
   * Get progress towards unearned badges
   */
  const getBadgeProgress = useCallback((
    badge: Badge,
    tasks: StudyTask[],
    logs: LogEvent[],
    routines: Routine[]
  ) => {
    if (!badge.conditions || badge.conditions.length === 0) {
      return { progress: 0, total: 1, percentage: 0 };
    }
    
    const criteria = getBadgeCriteria(logs, tasks, routines);
    let completedConditions = 0;
    const totalConditions = badge.conditions.length;
    
    for (const condition of badge.conditions) {
      let conditionMet = false;
      
      switch (condition.type) {
        case 'TASKS_COMPLETED':
          conditionMet = criteria.completedTasks >= (condition.target || 0);
          break;
        case 'ROUTINES_COMPLETED':
          conditionMet = criteria.completedRoutines >= (condition.target || 0);
          break;
        case 'TOTAL_STUDY_TIME':
          conditionMet = criteria.totalStudyTime >= (condition.target || 0);
          break;
        case 'DAY_STREAK':
          conditionMet = criteria.consecutiveDays >= (condition.target || 0);
          break;
        default:
          // For complex conditions, use the full badge checker
          conditionMet = checkBadgeEligibility(badge, tasks, logs);
      }
      
      if (conditionMet) {
        completedConditions++;
      }
    }
    
    return {
      progress: completedConditions,
      total: totalConditions,
      percentage: totalConditions > 0 ? (completedConditions / totalConditions) * 100 : 0,
    };
  }, [getBadgeCriteria, checkBadgeEligibility]);

  /**
   * Check if any milestone badges should be awarded
   */
  const checkMilestoneBadges = useCallback((
    allBadges: Badge[],
    earnedBadges: Map<string, number>,
    tasks: StudyTask[],
    logs: LogEvent[],
    routines: Routine[]
  ): Badge[] => {
    const milestoneBadges = allBadges.filter(badge => 
      badge.category === 'overall' && !earnedBadges.has(badge.id)
    );
    
    return getNewlyEarnedBadges(milestoneBadges, earnedBadges, tasks, logs, routines);
  }, [getNewlyEarnedBadges]);

  return {
    getBadgeCriteria,
    checkBadgeEligibility,
    shouldBadgeBeAwarded,
    getNewlyEarnedBadges,
    getTodaysEarnedBadges,
    getBadgeStatistics,
    getBadgeProgress,
    checkMilestoneBadges,
  };
}

/**
 * Hook for badge validation utilities
 */
export function useBadgeValidation() {
  /**
   * Validate badge data before creation/update
   */
  const validateBadge = useCallback((badge: Partial<Badge>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!badge.name || badge.name.trim().length === 0) {
      errors.push('Badge name is required');
    }
    
    if (!badge.description || badge.description.trim().length === 0) {
      errors.push('Badge description is required');
    }
    
    if (!badge.conditions || badge.conditions.length === 0) {
      errors.push('At least one condition is required');
    }
    
    if (badge.conditions) {
      for (const condition of badge.conditions) {
        if (!condition.type) {
          errors.push('Condition type is required');
        }
        
        if (condition.target !== undefined && condition.target < 0) {
          errors.push('Condition target must be non-negative');
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  return {
    validateBadge,
  };
}