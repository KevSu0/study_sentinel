
'use client';
import React from 'react';
import { CompletedPlanListItem } from '@/components/plans/completed-plan-list-item';
import { type TaskViewMode } from '@/hooks/use-view-mode';
import { cn } from '@/lib/utils';
import type {ActivityFeedItem} from '@/hooks/use-global-state.tsx';
import {CheckCircle2} from 'lucide-react';
import {ActivityItem} from '@/components/dashboard/activity/activity-item';

export const CompletedTodayWidget = ({
  todaysActivity,
  onUndoComplete,
  onDeleteComplete,
  viewMode = 'card',
}: {
  todaysActivity: ActivityFeedItem[];
  onUndoComplete?: (item: ActivityFeedItem) => void;
  onDeleteComplete?: (item: ActivityFeedItem) => void;
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
  
  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
        <h2 className="text-xl font-semibold text-primary">
          Today's Activity
        </h2>
      </div>
      <div className={cn("space-y-3", viewMode === 'list' && "space-y-1")}>
          {todaysActivity.map((activityItem) => {
            const itemId = (activityItem.data.log?.id || activityItem.data.task?.id || activityItem.data?.id || crypto.randomUUID());
            const isUndone = (activityItem.type === 'TASK_COMPLETE' && activityItem.data.task?.status !== 'completed') || (activityItem.type === 'ROUTINE_COMPLETE' && !!activityItem.data.isUndone);
            
            if (viewMode === 'list') {
              return (
                <CompletedPlanListItem
                  key={`${activityItem.type}-${itemId}`}
                  item={activityItem}
                  onUndo={onUndoComplete ? () => onUndoComplete(activityItem) : undefined}
                  onDelete={onDeleteComplete ? () => onDeleteComplete(activityItem) : undefined}
                  isUndone={isUndone}
                />
              );
            }
            
            return (
              <ActivityItem
                key={`${activityItem.type}-${itemId}`}
                item={activityItem}
                onUndo={onUndoComplete ? () => onUndoComplete(activityItem) : undefined}
                onDelete={onDeleteComplete ? () => onDeleteComplete(activityItem) : undefined}
                isUndone={isUndone}
              />
            );
          })}
        </div>
    </section>
  );
};

    