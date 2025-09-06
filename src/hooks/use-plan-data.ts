'use client';

import { useEffect, useMemo, useState } from 'react';
import { useGlobalState } from '@/hooks/use-global-state';
import { format, isToday } from 'date-fns';
import type { StudyTask, Routine, CompletedWork, CompletedActivity, HydratedActivityAttempt } from '@/lib/types';
import { activityRepository } from '@/lib/repositories/activity-repository';

type PlanItem =
  | { type: 'task'; data: StudyTask }
  | { type: 'routine'; data: Routine };

export function usePlanData(selectedDate: Date) {
  const { state } = useGlobalState();
  const { isLoaded, tasks, routines, allCompletedWork, todaysCompletedActivities } = state;
  const [completedActivitiesForSelectedDay, setCompletedActivitiesForSelectedDay] = useState<CompletedActivity[] | CompletedWork[]>([]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch hydrated attempts for non-today dates so we show real historical activity
  useEffect(() => {
    if (!isLoaded) return;
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    if (isToday(selectedDate)) {
      setCompletedActivitiesForSelectedDay(todaysCompletedActivities || []);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const attempts = await activityRepository.getHydratedAttemptsByDate(selectedDateStr);
        const items: CompletedActivity[] = attempts
          .filter(a => a.status === 'COMPLETED')
          .map(a => {
            const completeEvent = a.events.find(e => e.type === 'COMPLETE');
            return completeEvent && a.template
              ? ({ attempt: a, completeEvent, template: a.template } as CompletedActivity)
              : null;
          })
          .filter((x): x is CompletedActivity => !!x);
        if (mounted) setCompletedActivitiesForSelectedDay(items);
      } catch (e) {
        if (mounted) setCompletedActivitiesForSelectedDay([]);
      }
    })();
    return () => { mounted = false; };
  }, [isLoaded, selectedDate, todaysCompletedActivities]);

  const { upcomingItems, overdueTasks, completedForDay } = useMemo(() => {
    if (!isLoaded) {
      return { upcomingItems: [], overdueTasks: [], completedForDay: [] };
    }

    // Prefer hydrated attempts for the selected day (populated by the effect above).
    // If empty and it's not today, fall back to legacy CompletedWork until backfill is available.
    const completedActivitiesForSource = completedActivitiesForSelectedDay.length > 0
      ? completedActivitiesForSelectedDay
      : (isToday(selectedDate) ? (todaysCompletedActivities ?? [])
         : ((allCompletedWork ?? []).map((work, index) => ({ ...work, id: `${work.timestamp}-${index}` })) as any[]));

    const selectedDayRoutines = routines.filter((r) => r.days.includes(selectedDate.getDay()));
    
    const completedActivityForDay = completedActivitiesForSource.filter((activity: any) => {
      // Hydrated attempts (CompletedActivity) carry a completeEvent; legacy work items carry timestamp.
      if (activity?.completeEvent?.occurredAt) {
        const d = new Date(activity.completeEvent.occurredAt);
        return format(d, 'yyyy-MM-dd') === selectedDateStr;
      }
      if (typeof activity?.timestamp === 'string') {
        try {
          return new Date(activity.timestamp).toISOString().startsWith(selectedDateStr);
        } catch {
          return false;
        }
      }
      return false;
    })
    // Sort by recency: most recent complete first
    .sort((a: any, b: any) => {
      const ta = a?.completeEvent?.occurredAt ?? (a?.timestamp ? new Date(a.timestamp).getTime() : 0);
      const tb = b?.completeEvent?.occurredAt ?? (b?.timestamp ? new Date(b.timestamp).getTime() : 0);
      return tb - ta;
    });

    // Build sets of completed template IDs to exclude from upcoming
    const completedRoutineIds = new Set(
      completedActivityForDay
        .filter((a: any) => {
          if ('attempt' in a) {
            // CompletedActivity
            return !('timerType' in (a as any).template);
          }
          return a.type === 'routine' && !a.isUndone;
        })
        .map((a: any) => ('attempt' in a ? a.template?.id : a.routineId))
        .filter(Boolean)
    );
    const completedTaskIds = new Set(
      completedActivityForDay
        .filter((a: any) => {
          if ('attempt' in a) {
            return 'timerType' in (a as any).template;
          }
          return a.type === 'task' && !a.isUndone;
        })
        .map((a: any) => ('attempt' in a ? a.template?.id : a.taskId))
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
  }, [isLoaded, routines, tasks, selectedDate, todayStr, allCompletedWork, todaysCompletedActivities, completedActivitiesForSelectedDay]);

  return { upcomingItems, overdueTasks, completedForDay, isLoaded };
}
