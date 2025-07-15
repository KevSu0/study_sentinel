
'use client';
import React from 'react';
import type { ActivityFeedItem } from '@/hooks/use-global-state';
import { CompletedTaskCard } from '@/components/dashboard/activity/completed-task-card';
import { CompletedRoutineCard } from '@/components/dashboard/activity/completed-routine-card';
import { StoppedTaskCard } from '@/components/dashboard/activity/stopped-task-card';
import { CheckCircle2 } from 'lucide-react';
import { EmptyState } from '@/components/tasks/empty-state';

export const CompletedTodayWidget = ({
  todaysActivity,
  onEditTask,
}: {
  todaysActivity: ActivityFeedItem[];
  onEditTask: (task: any) => void;
}) => {
  if (!todaysActivity || todaysActivity.length === 0) {
    return (
        <section className='pt-8'>
            <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8 bg-card/50 rounded-lg shadow-sm border border-dashed">
                <CheckCircle2 className="h-16 w-16 text-primary/80 mb-4" />
                <h2 className="text-xl font-bold">No Activity Yet Today</h2>
                <p className="text-muted-foreground mt-2 max-w-md">
                    Complete or work on tasks and routines to see your activity here.
                </p>
            </div>
        </section>
    );
  }

  const renderActivityItem = (item: ActivityFeedItem) => {
    switch (item.type) {
      case 'TASK_COMPLETE':
        return <CompletedTaskCard key={`task-${item.data.id}`} task={item.data} />;
      case 'ROUTINE_COMPLETE':
        return <CompletedRoutineCard key={`routine-${item.data.id}`} log={item.data} />;
      case 'TASK_STOPPED':
        return <StoppedTaskCard key={`stopped-${item.data.id}`} log={item.data} />;
      default:
        return null;
    }
  };

  return (
    <section>
      <h2 className="text-xl font-semibold text-primary mb-3">
        Today's Activity
      </h2>
      <div className="space-y-4">
        {todaysActivity.map(item => renderActivityItem(item))}
      </div>
    </section>
  );
};

    