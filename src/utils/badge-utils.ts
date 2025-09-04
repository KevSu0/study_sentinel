/**
 * Badge awarding and criteria utilities
 */

import { type Badge, type LogEvent, type StudyTask, type Routine } from '@/lib/types';

/**
 * Get badge awarding criteria based on logs and current state
 */
export const getBadgeAwardingCriteria = (logs: LogEvent[], tasks: Map<string, StudyTask>, routines: Map<string, Routine>) => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const todaysLogs = logs.filter(log => {
    const logDate = new Date(parseInt(log.timestamp));
    return logDate >= todayStart;
  });
  
  const completedTasks = todaysLogs.filter(log => log.type === 'TASK_COMPLETE').length;
  const completedRoutines = todaysLogs.filter(log => log.type === 'ROUTINE_SESSION_COMPLETE').length;
  const totalStudyTime = todaysLogs
    .filter(log => ['TASK_COMPLETE', 'ROUTINE_SESSION_COMPLETE'].includes(log.type))
    .reduce((total, log) => total + (log.payload.duration || 0), 0);
  
  return {
    completedTasks,
    completedRoutines,
    totalStudyTime: Math.floor(totalStudyTime / (1000 * 60)), // in minutes
    consecutiveDays: calculateStreak(logs),
  };
};

/**
 * Calculate current streak from logs
 */
export const calculateStreak = (logs: LogEvent[]): number => {
  const completionLogs = logs.filter(log => 
    ['TASK_COMPLETE', 'ROUTINE_SESSION_COMPLETE'].includes(log.type)
  );
  
  if (completionLogs.length === 0) return 0;
  
  // Group logs by date
  const logsByDate = new Map<string, LogEvent[]>();
  completionLogs.forEach(log => {
    const date = new Date(parseInt(log.timestamp));
    const dateKey = date.toDateString();
    if (!logsByDate.has(dateKey)) {
      logsByDate.set(dateKey, []);
    }
    logsByDate.get(dateKey)!.push(log);
  });
  
  // Calculate streak
  const sortedDates = Array.from(logsByDate.keys()).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );
  
  let streak = 0;
  const today = new Date().toDateString();
  
  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i]);
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    
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