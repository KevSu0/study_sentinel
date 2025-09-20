
'use client';
import React, {lazy, Suspense, useMemo} from 'react';
import dynamic from 'next/dynamic';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {Award as BadgeIcon, Star} from 'lucide-react';
import type {Badge} from '@/lib/types';
import type { ActivityFeedItem } from '@/hooks/use-global-state';

const ProductivityPieChart = dynamic(
  () => import('@/components/dashboard/productivity-pie-chart'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[260px] w-full" />,
  }
);

interface StatsOverviewWidgetProps {
  todaysBadges: Badge[];
  todaysActivity: ActivityFeedItem[];
}

export const StatsOverviewWidget = ({
  todaysBadges = [],
  todaysActivity = [],
}: StatsOverviewWidgetProps) => {

  const { chartData, todaysPoints, completedSessions } = useMemo(() => {
    const data: { name: string; value: number; points: number; }[] = [];
    
    for (const item of todaysActivity) {
      if (item.type === 'TASK_COMPLETE' || item.type === 'ROUTINE_COMPLETE') {
        const isTask = item.type === 'TASK_COMPLETE';
        const payload = isTask ? item.data.log?.payload || item.data.task : item.data.payload;
        const title = isTask ? item.data.task.title : payload.title;
        const duration = payload.duration || (isTask ? (item.data.task.duration || 0) * 60 : 0);
        
        data.push({
          name: `${isTask ? 'Task' : 'Routine'}: ${title}`,
          value: duration,
          points: payload.points || 0
        });
      }
    }

    const points = data.reduce((sum, item) => sum + item.points, 0);
    const sessions = data.length;
    
    return { chartData: data, todaysPoints: points, completedSessions: sessions };
  }, [todaysActivity]);


  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="lg:col-span-1 min-h-[260px]">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          {chartData.length > 0 ? (
            <ProductivityPieChart data={chartData} />
          ) : (
            <Card className="h-full flex flex-col items-center justify-center">
              <CardHeader>
                <CardTitle>Today&apos;s Productivity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No time logged yet.
                </p>
              </CardContent>
            </Card>
          )}
        </Suspense>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Points Earned Today
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysPoints}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Badges Unlocked Today
            </CardTitle>
            <BadgeIcon className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysBadges.length}</div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Sessions Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedSessions}</div>
            <p className="text-xs text-muted-foreground">
              Total number of timed tasks and routines.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

