'use client';

import { useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, startOfDay, endOfDay, subDays, addDays, isToday, parseISO } from 'date-fns';
import { getSessionDate } from '@/lib/utils';
import { taskRepository } from '@/lib/repositories';
import { db } from '@/lib/db';
import type { StudyTask, ActivityAttempt, ActivityEvent } from '@/lib/types';

// Memoized selectors for better performance
interface OptimizedStatsData {
  // Today's stats
  todaysStats: {
    totalTasks: number;
    completedTasks: number;
    totalStudyTime: number;
    totalBreakTime: number;
    totalRoutines: number;
    completedRoutines: number;
    productivity: number;
    focusScore: number;
  };
  
  // Weekly stats
  weeklyStats: {
    totalStudyTime: number;
    totalTasks: number;
    completedTasks: number;
    averageProductivity: number;
    streakDays: number;
    dailyBreakdown: Array<{
      date: string;
      studyTime: number;
      tasks: number;
      completedTasks: number;
      productivity: number;
    }>;
  };
  
  // Monthly stats
  monthlyStats: {
    totalStudyTime: number;
    totalTasks: number;
    completedTasks: number;
    averageProductivity: number;
    bestDay: {
      date: string;
      studyTime: number;
      productivity: number;
    };
    worstDay: {
      date: string;
      studyTime: number;
      productivity: number;
    };
  };
  
  // Productivity trends
  productivityTrends: {
    hourlyBreakdown: Array<{
      hour: number;
      studyTime: number;
      productivity: number;
    }>;
    weeklyTrend: 'improving' | 'declining' | 'stable';
    peakHours: number[];
  };
}

const getDurationFromEvent = (event: ActivityEvent | undefined): number => {
    return event?.payload?.duration || 0;
}

// Memoized calculation functions
const calculateTodaysStats = (tasks: StudyTask[], attempts: ActivityAttempt[], events: ActivityEvent[]) => {
  const today = format(getSessionDate(), 'yyyy-MM-dd');
  const todaysTasks = tasks.filter(task => task.date === today && task.status !== 'archived');
  const completedTasks = todaysTasks.filter(task => task.status === 'completed');
  
  const todaysAttempts = attempts.filter(attempt => {
    const attemptDate = format(new Date(attempt.createdAt), 'yyyy-MM-dd');
    return attemptDate === today && attempt.status === 'COMPLETED';
  });

  const eventMap = new Map(events.map(e => [e.id, e]));
  const todaysEvents = todaysAttempts.flatMap(a => events.filter(e => e.attemptId === a.id));

  const completeEvents = todaysEvents.filter(e => e.type === 'COMPLETE');
  
  const totalStudyTime = completeEvents.reduce((total, event) => total + getDurationFromEvent(event), 0);
  
  const totalBreakTime = 0; // Placeholder
  
  const routineAttempts = todaysAttempts.filter(attempt => !attempt.templateId.startsWith('task-'));
  const totalRoutines = new Set(routineAttempts.map(attempt => attempt.templateId)).size;
  const completedRoutines = routineAttempts.length;
  
  const productivity = todaysTasks.length > 0 ? (completedTasks.length / todaysTasks.length) * 100 : 0;
  const focusScore = totalStudyTime > 0 ? Math.min(100, (totalStudyTime / (totalStudyTime + totalBreakTime)) * 100) : 0;
  
  return {
    totalTasks: todaysTasks.length,
    completedTasks: completedTasks.length,
    totalStudyTime,
    totalBreakTime,
    totalRoutines,
    completedRoutines,
    productivity,
    focusScore,
  };
};

const calculateWeeklyStats = (tasks: StudyTask[], attempts: ActivityAttempt[], events: ActivityEvent[]) => {
  const today = getSessionDate();
  const weekStart = subDays(today, 6);
  
  const weeklyTasks = tasks.filter(task => {
    if (!task.date) return false;
    const taskDate = parseISO(task.date);
    return taskDate >= weekStart && taskDate <= today && task.status !== 'archived';
  });
  
  const weeklyAttempts = attempts.filter(attempt => {
    const attemptDate = new Date(attempt.createdAt);
    return attemptDate >= weekStart && attemptDate <= today && attempt.status === 'COMPLETED';
  });

  const weeklyAttemptIds = new Set(weeklyAttempts.map(a => a.id));
  const weeklyEvents = events.filter(e => weeklyAttemptIds.has(e.attemptId));
  const completeEvents = weeklyEvents.filter(e => e.type === 'COMPLETE');
  
  const totalStudyTime = completeEvents.reduce((total, event) => total + getDurationFromEvent(event), 0);
  
  const completedTasks = weeklyTasks.filter(task => task.status === 'completed');
  
  const dailyBreakdown = [];
  for (let i = 0; i < 7; i++) {
    const date = subDays(today, 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayTasks = weeklyTasks.filter(task => task.date === dateStr);
    const dayCompletedTasks = dayTasks.filter(task => task.status === 'completed');
    const dayAttempts = weeklyAttempts.filter(attempt => format(new Date(attempt.createdAt), 'yyyy-MM-dd') === dateStr);
    const dayAttemptIds = new Set(dayAttempts.map(a => a.id));
    const dayCompleteEvents = events.filter(e => dayAttemptIds.has(e.attemptId) && e.type === 'COMPLETE');

    const dayStudyTime = dayCompleteEvents.reduce((total, event) => total + getDurationFromEvent(event), 0);
    
    const productivity = dayTasks.length > 0 ? (dayCompletedTasks.length / dayTasks.length) * 100 : 0;
    
    dailyBreakdown.push({
      date: dateStr,
      studyTime: dayStudyTime,
      tasks: dayTasks.length,
      completedTasks: dayCompletedTasks.length,
      productivity,
    });
  }
  
  const averageProductivity = dailyBreakdown.reduce((sum, day) => sum + day.productivity, 0) / 7;
  
  let streakDays = 0;
  for (let i = dailyBreakdown.length - 1; i >= 0; i--) {
    if (dailyBreakdown[i].completedTasks > 0) {
      streakDays++;
    } else {
      break;
    }
  }
  
  return {
    totalStudyTime,
    totalTasks: weeklyTasks.length,
    completedTasks: completedTasks.length,
    averageProductivity,
    streakDays,
    dailyBreakdown,
  };
};

const calculateMonthlyStats = (tasks: StudyTask[], attempts: ActivityAttempt[], events: ActivityEvent[]) => {
  const today = getSessionDate();
  const monthStart = subDays(today, 29);
  
  const monthlyTasks = tasks.filter(task => {
    if (!task.date) return false;
    const taskDate = parseISO(task.date);
    return taskDate >= monthStart && taskDate <= today && task.status !== 'archived';
  });
  
  const monthlyAttempts = attempts.filter(attempt => {
    const attemptDate = new Date(attempt.createdAt);
    return attemptDate >= monthStart && attemptDate <= today && attempt.status === 'COMPLETED';
  });

  const monthlyAttemptIds = new Set(monthlyAttempts.map(a => a.id));
  const monthlyEvents = events.filter(e => monthlyAttemptIds.has(e.attemptId));
  const completeEvents = monthlyEvents.filter(e => e.type === 'COMPLETE');

  const totalStudyTime = completeEvents.reduce((total, event) => total + getDurationFromEvent(event), 0);
  
  const completedTasks = monthlyTasks.filter(task => task.status === 'completed');
  const averageProductivity = monthlyTasks.length > 0 ? (completedTasks.length / monthlyTasks.length) * 100 : 0;
  
  const dailyStats = new Map<string, { studyTime: number; productivity: number }>();
  
  for (let i = 0; i < 30; i++) {
    const date = subDays(today, 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayTasks = monthlyTasks.filter(task => task.date === dateStr);
    const dayCompletedTasks = dayTasks.filter(task => task.status === 'completed');
    const dayAttempts = monthlyAttempts.filter(attempt => format(new Date(attempt.createdAt), 'yyyy-MM-dd') === dateStr);
    const dayAttemptIds = new Set(dayAttempts.map(a => a.id));
    const dayCompleteEvents = events.filter(e => dayAttemptIds.has(e.attemptId) && e.type === 'COMPLETE');

    const dayStudyTime = dayCompleteEvents.reduce((total, event) => total + getDurationFromEvent(event), 0);
    
    const productivity = dayTasks.length > 0 ? (dayCompletedTasks.length / dayTasks.length) * 100 : 0;
    
    dailyStats.set(dateStr, { studyTime: dayStudyTime, productivity });
  }
  
  let bestDay = { date: '', studyTime: 0, productivity: 0 };
  let worstDay = { date: '', studyTime: Infinity, productivity: 100 };
  
  dailyStats.forEach((stats, date) => {
    if (stats.studyTime > bestDay.studyTime) {
      bestDay = { date, ...stats };
    }
    if (stats.studyTime < worstDay.studyTime && stats.studyTime > 0) {
      worstDay = { date, ...stats };
    }
  });
  
  if (worstDay.studyTime === Infinity) {
    worstDay = { date: '', studyTime: 0, productivity: 0 };
  }
  
  return {
    totalStudyTime,
    totalTasks: monthlyTasks.length,
    completedTasks: completedTasks.length,
    averageProductivity,
    bestDay,
    worstDay,
  };
};

const calculateProductivityTrends = (attempts: ActivityAttempt[], events: ActivityEvent[]) => {
  const today = getSessionDate();
  const weekStart = subDays(today, 6);
  
  const weeklyAttempts = attempts.filter(attempt => {
    const attemptDate = new Date(attempt.createdAt);
    return attemptDate >= weekStart && attemptDate <= today && attempt.status === 'COMPLETED';
  });

  const weeklyAttemptIds = new Set(weeklyAttempts.map(a => a.id));
  const weeklyEvents = events.filter(e => weeklyAttemptIds.has(e.attemptId));
  
  const hourlyStats = new Map<number, { studyTime: number; sessions: number }>();
  
  for (let hour = 0; hour < 24; hour++) {
    hourlyStats.set(hour, { studyTime: 0, sessions: 0 });
  }
  
  weeklyEvents.filter(e => e.type === 'COMPLETE').forEach(event => {
      const hour = new Date(event.occurredAt).getHours();
      const stats = hourlyStats.get(hour)!;
      stats.studyTime += getDurationFromEvent(event);
      stats.sessions += 1;
  });
  
  const hourlyBreakdown = Array.from(hourlyStats.entries()).map(([hour, stats]) => ({
    hour,
    studyTime: stats.studyTime,
    productivity: stats.sessions > 0 ? stats.studyTime / stats.sessions : 0,
  }));
  
  const peakHours = hourlyBreakdown
    .sort((a, b) => b.studyTime - a.studyTime)
    .slice(0, 3)
    .map(item => item.hour);
  
  const firstHalfEvents = weeklyEvents.filter(e => {
    const eventDate = new Date(e.occurredAt);
    return eventDate >= weekStart && eventDate <= addDays(weekStart, 2) && e.type === 'COMPLETE';
  });
  
  const secondHalfEvents = weeklyEvents.filter(e => {
    const eventDate = new Date(e.occurredAt);
    return eventDate >= addDays(weekStart, 4) && eventDate <= today && e.type === 'COMPLETE';
  });
  
  const firstHalfTime = firstHalfEvents.reduce((total, event) => total + getDurationFromEvent(event), 0);
  const secondHalfTime = secondHalfEvents.reduce((total, event) => total + getDurationFromEvent(event), 0);
  
  let weeklyTrend: 'improving' | 'declining' | 'stable' = 'stable';
  const difference = secondHalfTime - firstHalfTime;
  const threshold = Math.max(firstHalfTime * 0.1, 300);
  
  if (difference > threshold) {
    weeklyTrend = 'improving';
  } else if (difference < -threshold) {
    weeklyTrend = 'declining';
  }
  
  return {
    hourlyBreakdown,
    weeklyTrend,
    peakHours,
  };
};

// Main optimized hook
export function useOptimizedStats(): OptimizedStatsData {
  const tasks = useLiveQuery(() => taskRepository.getAll()) || [];
  const attempts = useLiveQuery(() => db.activityAttempts.toArray()) || [];
  const events = useLiveQuery(() => db.activityEvents.toArray()) || [];
  
  const todaysStats = useMemo(() => {
    return calculateTodaysStats(tasks, attempts, events);
  }, [tasks, attempts, events]);
  
  const weeklyStats = useMemo(() => {
    return calculateWeeklyStats(tasks, attempts, events);
  }, [tasks, attempts, events]);
  
  const monthlyStats = useMemo(() => {
    return calculateMonthlyStats(tasks, attempts, events);
  }, [tasks, attempts, events]);
  
  const productivityTrends = useMemo(() => {
    return calculateProductivityTrends(attempts, events);
  }, [attempts, events]);
  
  return useMemo(() => ({
    todaysStats,
    weeklyStats,
    monthlyStats,
    productivityTrends,
  }), [todaysStats, weeklyStats, monthlyStats, productivityTrends]);
}

// Selector hooks for specific stats
export function useTodaysStatsSelector() {
  const { todaysStats } = useOptimizedStats();
  return todaysStats;
}

export function useWeeklyStatsSelector() {
  const { weeklyStats } = useOptimizedStats();
  return weeklyStats;
}

export function useMonthlyStatsSelector() {
  const { monthlyStats } = useOptimizedStats();
  return monthlyStats;
}

export function useProductivityTrendsSelector() {
  const { productivityTrends } = useOptimizedStats();
  return productivityTrends;
}

// Memoized utility hooks
export function useStatsActions() {
  return useMemo(() => ({
    refreshStats: useCallback(() => {
      // This is now handled by dexie-react-hooks, but we can keep it for manual refresh if needed
    }, []),
    
    getStatsForDate: useCallback((date: Date) => {
      // This would require a more complex, non-reactive query.
      // Placeholder implementation.
      return {
        totalTasks: 0,
        completedTasks: 0,
        studyTime: 0,
        productivity: 0,
      };
    }, []),
    
    getStatsForDateRange: useCallback((startDate: Date, endDate: Date) => {
      // This would require a more complex, non-reactive query.
      // Placeholder implementation.
      return {
        totalTasks: 0,
        completedTasks: 0,
        totalStudyTime: 0,
        averageProductivity: 0,
        dailyBreakdown: [],
      };
    }, []),
  }), []);
}