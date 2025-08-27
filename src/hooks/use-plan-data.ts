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
    
    const completedActivityForDay = todaysActivity.filter(
        (activity) => activity.timestamp.startsWith(selectedDateStr)
    );

    const completedRoutineIds = new Set(completedActivityForDay
        .filter(a => a.type === 'ROUTINE_COMPLETE' && !a.data.isUndone)
        .map(a => a.data.payload.routineId)
    );
    const completedTaskIds = new Set(completedActivityForDay
        .filter(a => a.type === 'TASK_COMPLETE')
        .map(a => a.data.task.id)
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