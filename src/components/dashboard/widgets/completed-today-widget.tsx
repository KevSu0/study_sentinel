
'use client';
import React from 'react';
import { CompletedPlanListItem } from '@/components/plans/completed-plan-list-item';
import { TaskViewMode } from '@/hooks/use-view-mode';
import { cn } from '@/lib/utils';
import type {ActivityFeedItem} from '@/hooks/use-global-state.tsx';
import {CheckCircle2} from 'lucide-react';
import {ActivityItem} from '@/components/dashboard/activity/activity-item';
import type { LogEvent, StudyTask } from '@/lib/types';
import { parseISO } from 'date-fns';

type CompletedPlanItem =
  | { type: 'completed_task'; data: StudyTask; completed_at: string; timestamp: number; logId: string; }
  | { type: 'completed_routine'; data: LogEvent; completed_at: string; timestamp: number };

const transformToPlanItem = (item: ActivityFeedItem): CompletedPlanItem | null => {
  if (item.type === 'TASK_COMPLETE') {
    const task = item.data.task;
    return {
        type: 'completed_task',
        data: task,
        completed_at: item.timestamp,
        timestamp: parseISO(item.timestamp).getTime(),
        logId: item.data.log?.id || task.id
    };
  } else if (item.type === 'ROUTINE_COMPLETE') {
    const log = item.data as LogEvent;
    return {
        type: 'completed_routine',
        data: log,
        completed_at: item.timestamp,
        timestamp: parseISO(item.timestamp).getTime(),
    };
  }
  return null;
}


export const CompletedTodayWidget = ({
  todaysActivity,
  onUndoComplete,
  onHardUndoComplete,
  viewMode = 'card',
}: {
  todaysActivity: ActivityFeedItem[];
  onUndoComplete?: (item: CompletedPlanItem) => void;
  onHardUndoComplete?: (item: CompletedPlanItem) => void;
  viewMode?: TaskViewMode;
}) => {
  const hasItems = todaysActivity && todaysActivity.length > 0;

  if (!hasItems) {
    return (
      <section className="pt-8">
        <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8 bg-card/50 rounded-lg shadow-sm border border-dashed">
          <CheckCircle2 className="h-16 w-16 text-primary/80 mb-4" />
          <h2 className="text-xl font-bold">No Activity Yet Today</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            Your completed tasks and routines will appear here. Let's get to
            work!
          </p>
        </div>
      </section>
    );
  }

  const handleUndo = (item: ActivityFeedItem) => {
    if (!onUndoComplete) return;
    const planItem = transformToPlanItem(item);
    if(planItem) onUndoComplete(planItem);
  }

  const handleHardUndo = (item: ActivityFeedItem) => {
    if (!onHardUndoComplete) return;
    const planItem = transformToPlanItem(item);
    if(planItem) onHardUndoComplete(planItem);
  }
  
  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
        <h2 className="text-xl font-semibold text-primary">
          Today's Activity
        </h2>
      </div>
      <div className={cn("space-y-3", viewMode === 'list' && "space-y-1")}>
          {todaysActivity.map((activityItem, index) => {
            const itemId = (activityItem.data.log?.id || activityItem.data.task?.id || activityItem.data?.id || index);
            const isUndone = (activityItem.type === 'TASK_COMPLETE' && activityItem.data.task?.status !== 'completed') || (activityItem.type === 'ROUTINE_COMPLETE' && !!activityItem.data.isUndone);
            
            if (viewMode === 'list') {
              return (
                <CompletedPlanListItem
                  key={`${activityItem.type}-${itemId}`}
                  item={activityItem}
                  onUndo={() => handleUndo(activityItem)}
                  onHardUndo={() => handleHardUndo(activityItem)}
                  isUndone={isUndone}
                />
              );
            }
            
            return (
              <ActivityItem
                key={`${activityItem.type}-${itemId}`}
                item={activityItem}
                onUndo={() => handleUndo(activityItem)}
                onHardUndo={() => handleHardUndo(activityItem)}
                isUndone={isUndone}
              />
            );
          })}
        </div>
    </section>
  );
};
