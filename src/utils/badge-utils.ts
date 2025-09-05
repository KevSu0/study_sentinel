/**
 * Badge awarding and criteria utilities
 */

import { Badge, ActivityAttempt, ActivityEvent, StudyTask, Routine } from '@/lib/types';

/**
 * Get badge awarding criteria based on attempts and events
 */
export const getBadgeAwardingCriteria = (attempts: ActivityAttempt[], events: ActivityEvent[], tasks: Map<string, StudyTask>, routines: Map<string, Routine>) => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const completedAttempts = attempts.filter(a => a.status === 'COMPLETED');

  const todaysAttempts = completedAttempts.filter(attempt => {
    const attemptDate = new Date(attempt.createdAt);
    return attemptDate >= todayStart;
  });

  const todaysTaskAttempts = todaysAttempts.filter(a => a.templateId.startsWith('task-'));
  const todaysRoutineAttempts = todaysAttempts.filter(a => !a.templateId.startsWith('task-'));

  const eventMap = new Map(events.map(e => [e.id, e]));
  const todaysCompleteEvents = todaysAttempts
    .flatMap(a => events.filter(e => e.attemptId === a.id && e.type === 'COMPLETE'));

  const totalStudyTime = todaysCompleteEvents.reduce((total, event) => total + (event.payload.duration || 0), 0);

  return {
    completedTasks: todaysTaskAttempts.length,
    completedRoutines: todaysRoutineAttempts.length,
    totalStudyTime: Math.floor(totalStudyTime / 60), // in minutes
    consecutiveDays: calculateStreak(completedAttempts),
  };
};

/**
 * Calculate current streak from completed attempts
 */
export const calculateStreak = (completedAttempts: ActivityAttempt[]): number => {
  if (completedAttempts.length === 0) return 0;

  // Group attempts by date
  const attemptsByDate = new Map<string, ActivityAttempt[]>();
  completedAttempts.forEach(attempt => {
    const date = new Date(attempt.createdAt);
    const dateKey = date.toDateString();
    if (!attemptsByDate.has(dateKey)) {
      attemptsByDate.set(dateKey, []);
    }
    attemptsByDate.get(dateKey)!.push(attempt);
  });

  // Calculate streak
  const sortedDates = Array.from(attemptsByDate.keys()).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  let streak = 0;
  const today = new Date();

  // Check if there's an entry for today
  const todayKey = today.toDateString();
  if (!attemptsByDate.has(todayKey)) {
      // If no activity today, check if yesterday was the last activity day
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const yesterdayKey = yesterday.toDateString();
      if (sortedDates.length > 0 && new Date(sortedDates[0]).toDateString() === yesterdayKey) {
          // Streak ended yesterday
      } else {
          return 0; // Streak is broken
      }
  }


  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i]);
    const expectedDate = new Date();
    expectedDate.setDate(today.getDate() - i);

    if (currentDate.toDateString() === expectedDate.toDateString()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};


/**
 * Check if a badge should be awarded based on criteria
 */
export const shouldAwardBadge = (badge: Badge, criteria: ReturnType<typeof getBadgeAwardingCriteria>): boolean => {
  if (!badge.isEnabled || !badge.conditions || badge.conditions.length === 0) {
    return false;
  }

  // All conditions must be met for the badge to be awarded
  return badge.conditions.every(condition => {
    switch (condition.type) {
      case 'TASKS_COMPLETED':
        return criteria.completedTasks >= condition.target;
      case 'ROUTINES_COMPLETED':
        return criteria.completedRoutines >= condition.target;
      case 'TOTAL_STUDY_TIME':
        return criteria.totalStudyTime >= condition.target;
      case 'DAY_STREAK':
        return criteria.consecutiveDays >= condition.target;
      default:
        return false;
    }
  });
};