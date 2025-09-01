'use client';

import { useMemo, useCallback } from 'react';
import { format, parseISO, isToday, isTomorrow, isYesterday, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';
import { useGlobalState } from './use-global-state';
import type { StudyTask, Routine } from '@/lib/types';
import { getSessionDate } from '@/lib/utils';

// Performance optimized types
interface OptimizedPlanData {
  selectedDate: Date;
  tasks: {
    all: StudyTask[];
    filtered: StudyTask[];
    completed: StudyTask[];
    pending: StudyTask[];
    overdue: StudyTask[];
    scheduled: StudyTask[];
  };
  routines: {
    all: Routine[];
    active: Routine[];
    scheduled: Routine[];
  };
  stats: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalRoutines: number;
    activeRoutines: number;
    estimatedTime: number;
    actualTime: number;
  };
  dateInfo: {
    isToday: boolean;
    isTomorrow: boolean;
    isYesterday: boolean;
    isWeekend: boolean;
    dayOfWeek: string;
    formattedDate: string;
    relativeDate: string;
  };
}

// Memoized task filtering functions
const filterTasksByDate = (tasks: StudyTask[], selectedDate: Date): StudyTask[] => {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  return tasks.filter(task =>
    task.date === dateStr && task.status !== 'archived'
  );
};

const categorizeTasksByStatus = (tasks: StudyTask[]) => {
  const completed = tasks.filter(task => task.status === 'completed');
  const pending = tasks.filter(task => task.status === 'todo' || task.status === 'in_progress');
  const overdue = tasks.filter(task => {
    if (task.status === 'completed' || task.status === 'archived') return false;
    if (!task.date) return false;
    const taskDate = parseISO(task.date);
    return taskDate < getSessionDate();
  });
  const scheduled = tasks.filter(task => {
    if (!task.date) return false;
    const taskDate = parseISO(task.date);
    return taskDate >= getSessionDate();
  });
  
  return { completed, pending, overdue, scheduled };
};

const filterActiveRoutines = (routines: Routine[]): Routine[] => {
  return routines.filter(routine => routine.status === 'todo');
};

const calculateTaskStats = (tasks: StudyTask[], routines: Routine[]) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const activeRoutines = routines.filter(routine => routine.status === 'todo');
  const totalRoutines = routines.length;
  const activeRoutinesCount = activeRoutines.length;
  
  const estimatedTime = tasks.reduce((total, task) => {
    return total + (task.duration || 0);
  }, 0);
  
  const actualTime = tasks
    .filter(task => task.status === 'completed')
    .reduce((total, task) => {
      return total + (task.duration || 0);
    }, 0);
  
  return {
    totalTasks,
    completedTasks,
    completionRate,
    totalRoutines,
    activeRoutines: activeRoutinesCount,
    estimatedTime,
    actualTime,
  };
};

const getDateInfo = (selectedDate: Date) => {
  try {
    const today = getSessionDate();
    console.log('getDateInfo - selectedDate:', selectedDate);
    console.log('getDateInfo - today from getSessionDate:', today);
    
    const dayOfWeek = format(selectedDate, 'EEEE');
    console.log('getDateInfo - dayOfWeek:', dayOfWeek);
    
    const formattedDate = format(selectedDate, 'MMM dd, yyyy');
    console.log('getDateInfo - formattedDate:', formattedDate);
    
    let relativeDate = formattedDate;
    if (isToday(selectedDate)) {
      relativeDate = 'Today';
    } else if (isTomorrow(selectedDate)) {
      relativeDate = 'Tomorrow';
    } else if (isYesterday(selectedDate)) {
      relativeDate = 'Yesterday';
    }
    
    const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
    
    const result = {
      isToday: isToday(selectedDate),
      isTomorrow: isTomorrow(selectedDate),
      isYesterday: isYesterday(selectedDate),
      isWeekend,
      dayOfWeek,
      formattedDate,
      relativeDate,
    };
    
    console.log('getDateInfo - result:', result);
    return result;
  } catch (error) {
    console.error('getDateInfo error:', error);
    return {
      isToday: false,
      isTomorrow: false,
      isYesterday: false,
      isWeekend: false,
      dayOfWeek: '',
      formattedDate: '',
      relativeDate: '',
    };
  }
};

// Main optimized hook
export function useOptimizedPlanData(selectedDate: Date): OptimizedPlanData {
  const { state } = useGlobalState();
  const { tasks: allTasks, routines: allRoutines } = state;
  
  // Memoized task filtering
  const filteredTasks = useMemo(() => {
    return filterTasksByDate(allTasks, selectedDate);
  }, [allTasks, selectedDate]);
  
  // Memoized task categorization
  const taskCategories = useMemo(() => {
    return categorizeTasksByStatus(filteredTasks);
  }, [filteredTasks]);
  
  // Memoized routine filtering
  const activeRoutines = useMemo(() => {
    return filterActiveRoutines(allRoutines);
  }, [allRoutines]);
  
  // Memoized stats calculation
  const stats = useMemo(() => {
    return calculateTaskStats(filteredTasks, activeRoutines);
  }, [filteredTasks, activeRoutines]);
  
  // Memoized date info
  const dateInfo = useMemo(() => {
    return getDateInfo(selectedDate);
  }, [selectedDate]);
  
  // Return memoized result
  return useMemo(() => ({
    selectedDate,
    tasks: {
      all: allTasks,
      filtered: filteredTasks,
      completed: taskCategories.completed,
      pending: taskCategories.pending,
      overdue: taskCategories.overdue,
      scheduled: taskCategories.scheduled,
    },
    routines: {
      all: allRoutines,
      active: activeRoutines,
      scheduled: activeRoutines, // For now, active routines are considered scheduled
    },
    stats,
    dateInfo,
  }), [selectedDate, allTasks, filteredTasks, taskCategories, allRoutines, activeRoutines, stats, dateInfo]);
}

// Selector hooks for specific data to prevent unnecessary re-renders
export function useTasksForDateSelector(selectedDate: Date) {
  const planData = useOptimizedPlanData(selectedDate);
  return useMemo(() => planData.tasks, [planData.tasks]);
}

export function useRoutinesForDateSelector(selectedDate: Date) {
  const planData = useOptimizedPlanData(selectedDate);
  return useMemo(() => planData.routines, [planData.routines]);
}

export function useStatsForDateSelector(selectedDate: Date) {
  const planData = useOptimizedPlanData(selectedDate);
  return useMemo(() => planData.stats, [planData.stats]);
}

export function useDateInfoSelector(selectedDate: Date) {
  const planData = useOptimizedPlanData(selectedDate);
  return useMemo(() => planData.dateInfo, [planData.dateInfo]);
}

// Weekly plan data hook
export function useWeeklyPlanData(selectedDate: Date) {
  const { state } = useGlobalState();
  const { tasks: allTasks, routines: allRoutines } = state;
  
  return useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }); // Sunday
    
    const weeklyData = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(weekStart, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      const dayTasks = allTasks.filter(task => 
        task.date === dateStr && task.status !== 'archived'
      );
      
      const completedTasks = dayTasks.filter(task => task.status === 'completed');
      const pendingTasks = dayTasks.filter(task => 
        task.status === 'todo' || task.status === 'in_progress'
      );
      
      const estimatedTime = dayTasks.reduce((total, task) =>
        total + (task.duration || 0), 0
      );
      
      weeklyData.push({
        date: currentDate,
        dateStr,
        dayName: format(currentDate, 'EEE'),
        isToday: isToday(currentDate),
        tasks: dayTasks,
        completedTasks,
        pendingTasks,
        totalTasks: dayTasks.length,
        completionRate: dayTasks.length > 0 ? (completedTasks.length / dayTasks.length) * 100 : 0,
        estimatedTime,
      });
    }
    
    const weeklyStats = {
      totalTasks: weeklyData.reduce((sum, day) => sum + day.totalTasks, 0),
      completedTasks: weeklyData.reduce((sum, day) => sum + day.completedTasks.length, 0),
      totalEstimatedTime: weeklyData.reduce((sum, day) => sum + day.estimatedTime, 0),
      averageCompletionRate: weeklyData.reduce((sum, day) => sum + day.completionRate, 0) / 7,
      mostProductiveDay: weeklyData.reduce((max, day) => 
        day.completionRate > max.completionRate ? day : max, weeklyData[0]
      ),
      leastProductiveDay: weeklyData.reduce((min, day) => 
        day.completionRate < min.completionRate ? day : min, weeklyData[0]
      ),
    };
    
    return {
      weekStart,
      weekEnd,
      weeklyData,
      weeklyStats,
    };
  }, [selectedDate, allTasks, allRoutines]);
}

// Monthly plan data hook
export function useMonthlyPlanData(selectedDate: Date) {
  const { state } = useGlobalState();
  const { tasks: allTasks } = state;
  
  return useMemo(() => {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    const monthlyTasks = allTasks.filter(task => {
      if (!task.date) return false;
    const taskDate = parseISO(task.date);
      return taskDate >= monthStart && taskDate <= monthEnd && task.status !== 'archived';
    });
    
    const completedTasks = monthlyTasks.filter(task => task.status === 'completed');
    const pendingTasks = monthlyTasks.filter(task => 
      task.status === 'todo' || task.status === 'in_progress'
    );
    
    const dailyBreakdown = new Map<string, {
      tasks: StudyTask[];
      completed: StudyTask[];
      pending: StudyTask[];
      estimatedTime: number;
    }>();
    
    // Group tasks by day
    monthlyTasks.forEach(task => {
      const dateStr = task.date!;
      if (!dailyBreakdown.has(dateStr)) {
        dailyBreakdown.set(dateStr, {
          tasks: [],
          completed: [],
          pending: [],
          estimatedTime: 0,
        });
      }
      
      const dayData = dailyBreakdown.get(dateStr)!;
      dayData.tasks.push(task);
      dayData.estimatedTime += task.duration || 0;
      
      if (task.status === 'completed') {
        dayData.completed.push(task);
      } else if (task.status === 'todo' || task.status === 'in_progress') {
        dayData.pending.push(task);
      }
    });
    
    const monthlyStats = {
      totalTasks: monthlyTasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      completionRate: monthlyTasks.length > 0 ? (completedTasks.length / monthlyTasks.length) * 100 : 0,
      totalEstimatedTime: monthlyTasks.reduce((sum, task) => sum + (task.duration || 0), 0),
      averageDailyTasks: monthlyTasks.length / monthEnd.getDate(),
      mostProductiveDay: Array.from(dailyBreakdown.entries()).reduce(
        (max, [date, data]) => {
          const completionRate = data.tasks.length > 0 ? (data.completed.length / data.tasks.length) * 100 : 0;
          return completionRate > max.completionRate ? { date, completionRate, tasks: data.tasks.length } : max;
        },
        { date: '', completionRate: 0, tasks: 0 }
      ),
    };
    
    return {
      monthStart,
      monthEnd,
      monthlyTasks,
      completedTasks,
      pendingTasks,
      dailyBreakdown,
      monthlyStats,
    };
  }, [selectedDate, allTasks]);
}

// Utility hooks for plan data actions
export function usePlanDataActions() {
  const { updateTask, addTask, archiveTask } = useGlobalState();
  
  return useMemo(() => ({
    moveTaskToDate: useCallback((taskId: string, newDate: Date) => {
      const dateStr = format(newDate, 'yyyy-MM-dd');
      // Implementation would need to get the task first, then update it
      console.log(`Moving task ${taskId} to ${dateStr}`);
    }, []),
    
    duplicateTaskToDate: useCallback((task: StudyTask, newDate: Date) => {
      const dateStr = format(newDate, 'yyyy-MM-dd');
      const duplicatedTask = {
        ...task,
        date: dateStr,
        status: 'todo' as const,
        actualDuration: undefined,
      };
      addTask(duplicatedTask);
    }, [addTask]),
    
    bulkUpdateTasks: useCallback((taskIds: string[], updates: Partial<StudyTask>) => {
      taskIds.forEach(taskId => {
        // Implementation would need to get each task first, then update it
        console.log(`Updating task ${taskId} with`, updates);
      });
    }, []),
    
    getTasksInDateRange: useCallback((startDate: Date, endDate: Date) => {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      // Implementation would filter tasks by date range
      return [];
    }, []),
  }), [addTask]);
}