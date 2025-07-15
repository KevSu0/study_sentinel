'use client';
import React from 'react';
import type { ActivityFeedItem } from '@/hooks/use-global-state';
import { CheckCircle2 } from 'lucide-react';
import { ActivityItem } from '@/components/dashboard/activity/activity-item';

export const CompletedTodayWidget = ({
  todaysActivity,
}: {
  todaysActivity: ActivityFeedItem[];
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

  return (
    <section>
      <h2 className="text-xl font-semibold text-primary mb-3">
        Today's Activity
      </h2>
      <div className="space-y-3">
        {todaysActivity.map((item, index) => (
            <ActivityItem key={`${item.type}-${'id' in item.data ? item.data.id : index}`} item={item} />
        ))}
      </div>
    </section>
  );
};
