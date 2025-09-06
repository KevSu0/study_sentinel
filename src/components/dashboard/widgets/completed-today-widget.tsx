
'use client';
import React from 'react';
import { CompletedPlanListItem } from '@/components/plans/completed-plan-list-item';
import { TaskViewMode } from '@/hooks/use-view-mode';
import { cn } from '@/lib/utils';
import type { CompletedWork, CompletedActivity } from '@/lib/types';
import { transformToCompletedItem, CompletedItem } from '@/lib/transformers';
import {CheckCircle2} from 'lucide-react';
import {ActivityItem} from '@/components/dashboard/activity/activity-item';

export const CompletedTodayWidget = ({
  todaysCompletedActivities,
  onUndoComplete,
  onDeleteComplete,
  viewMode = 'card',
}: {
  todaysCompletedActivities: (CompletedWork | CompletedActivity)[];
  onUndoComplete?: (item: CompletedWork | CompletedActivity) => void;
  onDeleteComplete?: (item: CompletedWork | CompletedActivity) => void;
  viewMode?: TaskViewMode;
}) => {
  const hasItems = todaysCompletedActivities && todaysCompletedActivities.length > 0;
  const transformedItems = todaysCompletedActivities.map(transformToCompletedItem);

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
          {transformedItems.map((item) => {
            const handleUndo = onUndoComplete ? () => onUndoComplete(item.originalItem) : undefined;
            const handleDelete = onDeleteComplete ? () => onDeleteComplete(item.originalItem) : undefined;

            if (viewMode === 'list') {
              return (
                <CompletedPlanListItem
                  key={item.id}
                  item={item}
                  onUndo={handleUndo}
                  onDelete={handleDelete}
                  isUndone={item.isUndone}
                />
              );
            }
            
            return (
              <ActivityItem
                key={item.id}
                item={item}
                onUndo={handleUndo}
                onDelete={handleDelete}
                isUndone={item.isUndone}
              />
            );
          })}
        </div>
    </section>
  );
};

    