import React, { createContext, useContext, useCallback, useEffect, ReactNode } from 'react';
import { Badge } from '@/lib/types';
import { LogEvent, StudyTask, Routine } from '@/lib/types';
import { BadgeContextType, BadgeState, BadgeActions } from './badge-state-types';
import { useBadgeState } from './use-badge-state';
import { useBadgeChecker, useBadgeValidation } from './use-badge-checker';

/**
 * Badge Context
 */
const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

/**
 * Badge Provider Props
 */
interface BadgeProviderProps {
  children: ReactNode;
}

/**
 * Badge Provider Component
 * Manages badge state and provides badge-related functionality
 */
export function BadgeProvider({ children }: BadgeProviderProps) {
  const { state, actions: baseActions } = useBadgeState();
  const badgeChecker = useBadgeChecker();
  const badgeValidation = useBadgeValidation();

  /**
   * Enhanced check and award badges function
   */
  const checkAndAwardBadges = useCallback((tasks: StudyTask[], logs: LogEvent[], routines: Routine[]) => {
    const newlyEarned = badgeChecker.getNewlyEarnedBadges(
      state.allBadges,
      state.earnedBadges,
      tasks,
      logs,
      routines
    );

    // Award newly earned badges
    newlyEarned.forEach(badge => {
      const updatedEarned = new Map(state.earnedBadges);
      updatedEarned.set(badge.id, Date.now());
      
      // Update localStorage
      localStorage.setItem(
        'earnedBadges', 
        JSON.stringify(Array.from(updatedEarned.entries()))
      );
    });

    if (newlyEarned.length > 0) {
      console.log(`🏆 Awarded ${newlyEarned.length} new badges:`, newlyEarned.map(b => b.name));
    }
  }, [state.allBadges, state.earnedBadges, badgeChecker]);

  /**
   * Enhanced add badge with validation
   */
  const addBadge = useCallback(async (badgeData: Omit<Badge, 'id'>) => {
    const validation = badgeValidation.validateBadge(badgeData);
    
    if (!validation.isValid) {
      throw new Error(`Badge validation failed: ${validation.errors.join(', ')}`);
    }
    
    await baseActions.addBadge(badgeData);
  }, [baseActions, badgeValidation]);

  /**
   * Enhanced update badge with validation
   */
  const updateBadge = useCallback((updatedBadge: Badge) => {
    const validation = badgeValidation.validateBadge(updatedBadge);
    
    if (!validation.isValid) {
      throw new Error(`Badge validation failed: ${validation.errors.join(', ')}`);
    }
    
    baseActions.updateBadge(updatedBadge);
  }, [baseActions, badgeValidation]);

  // Enhanced actions with validation and checking
  const enhancedActions: BadgeActions = {
    ...baseActions,
    addBadge,
    updateBadge,
    checkAndAwardBadges,
  };

  const contextValue: BadgeContextType = {
    state,
    actions: enhancedActions,
  };

  return (
    <BadgeContext.Provider value={contextValue}>
      {children}
    </BadgeContext.Provider>
  );
}

/**
 * Hook to use badge context
 */
export function useBadges(): BadgeContextType {
  const context = useContext(BadgeContext);
  if (context === undefined) {
    throw new Error('useBadges must be used within a BadgeProvider');
  }
  return context;
}

/**
 * Hook to access badge state only
 */
export function useBadgeData(): BadgeState {
  const { state } = useBadges();
  return state;
}

/**
 * Hook to access badge actions only
 */
export function useBadgeActions(): BadgeActions {
  const { actions } = useBadges();
  return actions;
}

/**
 * Hook to access badge checking functionality
 */
export function useBadgeChecking() {
  const { state } = useBadges();
  const badgeChecker = useBadgeChecker();
  
  return {
    ...badgeChecker,
    allBadges: state.allBadges,
    earnedBadges: state.earnedBadges,
  };
}

/**
 * Hook to get badge statistics
 */
export function useBadgeStats() {
  const { state } = useBadges();
  const badgeChecker = useBadgeChecker();
  
  return badgeChecker.getBadgeStatistics(
    state.allBadges,
    state.earnedBadges,
    [], // tasks - will be provided by parent context
    []  // logs - will be provided by parent context
  );
}

/**
 * Hook to check if a badge is earned
 */
export function useIsBadgeEarned() {
  const { state } = useBadges();
  
  return useCallback((badgeId: string): boolean => {
    return state.earnedBadges.has(badgeId);
  }, [state.earnedBadges]);
}

/**
 * Hook to get earned badges
 */
export function useEarnedBadges(): Badge[] {
  const { state } = useBadges();
  
  const earnedBadgeIds = Array.from(state.earnedBadges.keys());
  return state.allBadges.filter(badge => earnedBadgeIds.includes(badge.id));
}

/**
 * Hook to get unearned badges
 */
export function useUnearnedBadges(): Badge[] {
  const { state } = useBadges();
  
  const earnedBadgeIds = Array.from(state.earnedBadges.keys());
  return state.allBadges.filter(badge => !earnedBadgeIds.includes(badge.id));
}

/**
 * Hook to get today's earned badges
 */
export function useTodaysBadges(): Badge[] {
  const { state } = useBadges();
  const badgeChecker = useBadgeChecker();

  return badgeChecker.getTodaysEarnedBadges(state.allBadges, state.earnedBadges);
}