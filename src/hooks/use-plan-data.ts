'use client';

import { useMemo } from 'react';
import { useGlobalState } from '@/hooks/use-global-state';
import { format } from 'date-fns';
import type { StudyTask, Routine } from '@/lib/types';

type PlanItem =
  | { type: 'task'; data: StudyTask }
  | { type: 'routine'; data: Routine };

export function usePlanData(selectedDate: Date) {
  const { state } = useGlobalState();
  const { isLoaded, tasks, routines, todaysActivity } = state;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const { upcomingItems, overdueTasks, completedForDay } = useMemo(() => {
    if (!isLoaded) {
      return { upcomingItems: [], overdueTasks: [], completedForDay: [] };
    }

    const selectedDayRoutines = routines.filter((r) => r.days.includes(selectedDate.getDay()));
    
    const completedActivityForDay = todaysActivity
        .filter(activity => activity && activity.timestamp && activity.timestamp.startsWith(selectedDateStr));

    const completedRoutineIds = new Set(
        completedActivityForDay
            .filter(a => {
                // More comprehensive filtering to ensure data integrity
                if (!a || !a.data || a.type !== 'ROUTINE_COMPLETE') {
                    return false;
                }
                
                // Check if routine completion is undone
                if (a.data.isUndone) {
                    return false;
                }
                
                // Check for routineId in multiple possible locations
                const hasRoutineId = (a.data.routine && a.data.routine.id) ||
                                   (a.data.log && a.data.log.payload && a.data.log.payload.routineId) ||
                                   (a.data.payload && a.data.payload.routineId) ||
                                   a.data.routineId;
                
                return !!hasRoutineId;
            })
            .map(a => {
                // Safe extraction of routineId with comprehensive null checking
                if (!a || !a.data) {
                    console.warn('Invalid activity data:', a);
                    return null;
                }
                
                // Try multiple possible locations for routineId
                let routineId = null;
                if (a.data.routine && a.data.routine.id) {
                    routineId = a.data.routine.id;
                } else if (a.data.log && a.data.log.payload && a.data.log.payload.routineId) {
                    routineId = a.data.log.payload.routineId;
                } else if (a.data.payload && a.data.payload.routineId) {
                    routineId = a.data.payload.routineId;
                } else if (a.data.routineId) {
                    routineId = a.data.routineId;
                }
                
                if (!routineId) {
                    console.warn('Missing routineId for activity:', a);
                    return null;
                }
                return routineId;
            })
            .filter(Boolean)
    );
    const completedTaskIds = new Set(completedActivityForDay
        .filter(a => {
            // Comprehensive filtering for task completion data
            if (!a || !a.data || a.type !== 'TASK_COMPLETE') {
                return false;
            }
            
            // Check if task completion is undone
            if (a.data.isUndone) {
                return false;
            }
            
            // Check for task ID in multiple possible locations
            const hasTaskId = (a.data.task && a.data.task.id) ||
                            (a.data.log && a.data.log.payload && a.data.log.payload.taskId) ||
                            (a.data.payload && a.data.payload.taskId) ||
                            a.data.taskId;
            
            return !!hasTaskId;
        })
        .map(a => {
            // Safe extraction of taskId with comprehensive null checking
            if (!a || !a.data) {
                console.warn('Invalid task activity data:', a);
                return null;
            }
            
            // Try multiple possible locations for taskId
            let taskId = null;
            if (a.data.task && a.data.task.id) {
                taskId = a.data.task.id;
            } else if (a.data.log && a.data.log.payload && a.data.log.payload.taskId) {
                taskId = a.data.log.payload.taskId;
            } else if (a.data.payload && a.data.payload.taskId) {
                taskId = a.data.payload.taskId;
            } else if (a.data.taskId) {
                taskId = a.data.taskId;
            }
            
            if (!taskId) {
                console.warn('Missing taskId for activity:', a);
                return null;
            }
            return taskId;
        })
        .filter(Boolean)
    );

    const upcomingRoutines: PlanItem[] = selectedDayRoutines
      .filter((r) => !completedRoutineIds.has(r.id))
      .map((r) => ({ type: 'routine', data: r }));

    const selectedDayTasks = tasks.filter((task) => task.date === selectedDateStr);
    const upcomingTasks: PlanItem[] = selectedDayTasks
      .filter((t) => t.status !== 'completed' && t.status !== 'archived' && !completedTaskIds.has(t.id))
      .map((t) => ({ type: 'task', data: t }));

    const allUpcoming = [...upcomingRoutines, ...upcomingTasks].sort((a, b) => {
      const timeA = a.type === 'task' ? a.data.time : a.data.startTime;
      const timeB = b.type === 'task' ? b.data.time : b.data.startTime;
      return (timeA || '').localeCompare(timeB || '');
    });
    
    const overdue = tasks.filter(
      (task) => task.date < todayStr && task.status !== 'completed' && task.status !== 'archived'
    );

    return {
      upcomingItems: allUpcoming,
      overdueTasks: overdue,
      completedForDay: completedActivityForDay,
    };
  }, [isLoaded, routines, tasks, selectedDate, selectedDateStr, todayStr, todaysActivity]);

  return { upcomingItems, overdueTasks, completedForDay, isLoaded };
}