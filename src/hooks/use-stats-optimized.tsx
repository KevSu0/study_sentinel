'use client';

import { useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, startOfDay, endOfDay, subDays, addDays, isToday, parseISO } from 'date-fns';
import { getSessionDate, getStudyDateForTimestamp } from '@/lib/utils';
import { taskRepository, logRepository } from '@/lib/repositories';
import type { StudyTask, LogEvent } from '@/lib/types';

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

// Memoized calculation functions
const calculateTodaysStats = (tasks: StudyTask[], logs: LogEvent[]) => {
  const today = format(getSessionDate(), 'yyyy-MM-dd');
  const todaysTasks = tasks.filter(task => task.date === today && task.status !== 'archived');
  const completedTasks = todaysTasks.filter(task => task.status === 'completed');
  
  const todaysLogs = logs.filter(log => {
    const logDate = format(parseISO(log.timestamp), 'yyyy-MM-dd');
    return logDate === today;
  });
  
  const studyLogs = todaysLogs.filter(log => log.type === 'TASK_COMPLETE' || log.type === 'ROUTINE_SESSION_COMPLETE');
  const totalStudyTime = studyLogs.reduce((total, log) => {
    if (log.payload?.duration) {
      return total + log.payload.duration;
    }
    return total;
  }, 0);
  
  // Break logs are not currently tracked in LogEventType
  // const breakLogs = todaysLogs.filter(log => log.type === 'break_complete');
  const totalBreakTime = 0; // Placeholder until break tracking is implemented
  
  const routineLogs = todaysLogs.filter(log => log.type === 'ROUTINE_SESSION_COMPLETE');
  const totalRoutines = new Set(routineLogs.map(log => log.payload?.routineId)).size;
  const completedRoutines = routineLogs.length;
  
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

const calculateWeeklyStats = (tasks: StudyTask[], logs: LogEvent[]) => {
  const today = getSessionDate();
  const weekStart = subDays(today, 6); // Last 7 days including today
  
  const weeklyTasks = tasks.filter(task => {
    if (!task.date) return false;
    const taskDate = parseISO(task.date);
    return taskDate >= weekStart && taskDate <= today && task.status !== 'archived';
  });
  
  const weeklyLogs = logs.filter(log => {
    const logDate = parseISO(log.timestamp);
    return logDate >= weekStart && logDate <= today;
  });
  
  const studyLogs = weeklyLogs.filter(log => log.type === 'TASK_COMPLETE' || log.type === 'ROUTINE_SESSION_COMPLETE');
  const totalStudyTime = studyLogs.reduce((total, log) => {
    return total + (log.payload?.duration || 0);
  }, 0);
  
  const completedTasks = weeklyTasks.filter(task => task.status === 'completed');
  
  // Daily breakdown
  const dailyBreakdown = [];
  for (let i = 0; i < 7; i++) {
    const date = subDays(today, 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayTasks = weeklyTasks.filter(task => task.date === dateStr);
    const dayCompletedTasks = dayTasks.filter(task => task.status === 'completed');
    const dayLogs = weeklyLogs.filter(log => {
      const logDate = format(parseISO(log.timestamp), 'yyyy-MM-dd');
      return logDate === dateStr;
    });
    
    const dayStudyTime = dayLogs
      .filter(log => log.type === 'TASK_COMPLETE' || log.type === 'ROUTINE_SESSION_COMPLETE')
      .reduce((total, log) => total + (log.payload?.duration || 0), 0);
    
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
  
  // Calculate streak
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

const calculateMonthlyStats = (tasks: StudyTask[], logs: LogEvent[]) => {
  const today = getSessionDate();
  const monthStart = subDays(today, 29); // Last 30 days
  
  const monthlyTasks = tasks.filter(task => {
    if (!task.date) return false;
    const taskDate = parseISO(task.date);
    return taskDate >= monthStart && taskDate <= today && task.status !== 'archived';
  });
  
  const monthlyLogs = logs.filter(log => {
    const logDate = parseISO(log.timestamp);
    return logDate >= monthStart && logDate <= today;
  });
  
  const studyLogs = monthlyLogs.filter(log => log.type === 'TASK_COMPLETE' || log.type === 'ROUTINE_SESSION_COMPLETE');
  const totalStudyTime = studyLogs.reduce((total, log) => {
    return total + (log.payload?.duration || 0);
  }, 0);
  
  const completedTasks = monthlyTasks.filter(task => task.status === 'completed');
  const averageProductivity = monthlyTasks.length > 0 ? (completedTasks.length / monthlyTasks.length) * 100 : 0;
  
  // Find best and worst days
  const dailyStats = new Map<string, { studyTime: number; productivity: number }>();
  
  for (let i = 0; i < 30; i++) {
    const date = subDays(today, 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayTasks = monthlyTasks.filter(task => task.date === dateStr);
    const dayCompletedTasks = dayTasks.filter(task => task.status === 'completed');
    const dayLogs = monthlyLogs.filter(log => {
      const logDate = format(parseISO(log.timestamp), 'yyyy-MM-dd');
      return logDate === dateStr;
    });
    
    const dayStudyTime = dayLogs
      .filter(log => log.type === 'TASK_COMPLETE' || log.type === 'ROUTINE_SESSION_COMPLETE')
      .reduce((total, log) => total + (log.payload?.duration || 0), 0);
    
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

const calculateProductivityTrends = (logs: LogEvent[]) => {
  const today = getSessionDate();
  const weekStart = subDays(today, 6);
  
  const weeklyLogs = logs.filter(log => {
    const logDate = parseISO(log.timestamp);
    return logDate >= weekStart && logDate <= today;
  });
  
  // Hourly breakdown
  const hourlyStats = new Map<number, { studyTime: number; sessions: number }>();
  
  for (let hour = 0; hour < 24; hour++) {
    hourlyStats.set(hour, { studyTime: 0, sessions: 0 });
  }
  
  weeklyLogs
    .filter(log => log.type === 'TASK_COMPLETE' || log.type === 'ROUTINE_SESSION_COMPLETE')
    .forEach(log => {
      const hour = parseISO(log.timestamp).getHours();
      const stats = hourlyStats.get(hour)!;
      stats.studyTime += log.payload?.duration || 0;
      stats.sessions += 1;
    });
  
  const hourlyBreakdown = Array.from(hourlyStats.entries()).map(([hour, stats]) => ({
    hour,
    studyTime: stats.studyTime,
    productivity: stats.sessions > 0 ? stats.studyTime / stats.sessions : 0,
  }));
  
  // Find peak hours (top 3 hours with most study time)
  const peakHours = hourlyBreakdown
    .sort((a, b) => b.studyTime - a.studyTime)
    .slice(0, 3)
    .map(item => item.hour);
  
  // Calculate weekly trend
  const firstHalf = weeklyLogs.filter(log => {
    const logDate = parseISO(log.timestamp);
    return logDate >= weekStart && logDate <= addDays(weekStart, 2);
  });
  
  const secondHalf = weeklyLogs.filter(log => {
    const logDate = parseISO(log.timestamp);
    return logDate >= addDays(weekStart, 4) && logDate <= today;
  });
  
  const firstHalfTime = firstHalf
    .filter(log => log.type === 'TASK_COMPLETE' || log.type === 'ROUTINE_SESSION_COMPLETE')
    .reduce((total, log) => total + (log.payload?.duration || 0), 0);
  
  const secondHalfTime = secondHalf
    .filter(log => log.type === 'TASK_COMPLETE' || log.type === 'ROUTINE_SESSION_COMPLETE')
    .reduce((total, log) => total + (log.payload?.duration || 0), 0);
  
  let weeklyTrend: 'improving' | 'declining' | 'stable' = 'stable';
  const difference = secondHalfTime - firstHalfTime;
  const threshold = Math.max(firstHalfTime * 0.1, 300); // 10% or 5 minutes
  
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
  // Use live queries for reactive data
  const tasks = useLiveQuery(() => taskRepository.getAll()) || [];
  const logs = useLiveQuery(() => logRepository.getAll()) || [];
  
  // Memoized calculations
  const todaysStats = useMemo(() => {
    return calculateTodaysStats(tasks, logs);
  }, [tasks, logs]);
  
  const weeklyStats = useMemo(() => {
    return calculateWeeklyStats(tasks, logs);
  }, [tasks, logs]);
  
  const monthlyStats = useMemo(() => {
    return calculateMonthlyStats(tasks, logs);
  }, [tasks, logs]);
  
  const productivityTrends = useMemo(() => {
    return calculateProductivityTrends(logs);
  }, [logs]);
  
  return useMemo(() => ({
    todaysStats,
    weeklyStats,
    monthlyStats,
    productivityTrends,
  }), [todaysStats, weeklyStats, monthlyStats, productivityTrends]);
}

// Selector hooks for specific stats to prevent unnecessary re-renders
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
      // Force refresh by invalidating queries
      taskRepository.getAll();
      logRepository.getAll();
    }, []),
    
    getStatsForDate: useCallback((date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      // Implementation for getting stats for specific date
      return {
        totalTasks: 0,
        completedTasks: 0,
        studyTime: 0,
        productivity: 0,
      };
    }, []),
    
    getStatsForDateRange: useCallback((startDate: Date, endDate: Date) => {
      // Implementation for getting stats for date range
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