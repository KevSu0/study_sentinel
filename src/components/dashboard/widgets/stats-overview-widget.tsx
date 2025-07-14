'use client';
import React, {lazy, Suspense, useMemo} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {Award as BadgeIcon, Star} from 'lucide-react';
const ProductivityChart = lazy(
  () => import('@/components/dashboard/productivity-chart')
);
import type {Badge, LogEvent} from '@/lib/types';

interface StatsOverviewWidgetProps {
  todaysCompletedTasks: any[]; // Simplified for props
  todaysBadges: Badge[];
  todaysLogs: LogEvent[];
}

export const StatsOverviewWidget = ({
  todaysCompletedTasks = [],
  todaysBadges = [],
  todaysLogs = [],
}: StatsOverviewWidgetProps) => {
  const {pointsToday, productivityData} = useMemo(() => {
    const routineLogs = todaysLogs.filter(
      l => l.type === 'ROUTINE_SESSION_COMPLETE'
    );
    const routinePoints = routineLogs.reduce(
      (sum: number, log: any) => sum + (log.payload.points || 0),
      0
    );
    const taskPoints =
      todaysCompletedTasks.reduce(
        (sum: number, task: any) => sum + (task.points || 0),
        0
      );
    const totalPoints = routinePoints + taskPoints;

    const taskTime = todaysLogs
      .filter(l => l.type === 'TIMER_SESSION_COMPLETE')
      .reduce((sum: number, log: any) => sum + (log.payload.duration || 0), 0);
    const routineTime = routineLogs.reduce(
      (sum: number, log: any) => sum + (log.payload.duration || 0),
      0
    );

    const data = [
      {
        name: 'Tasks',
        value: parseFloat((taskTime / 3600).toFixed(2)),
        fill: 'hsl(var(--chart-1))',
      },
      {
        name: 'Routines',
        value: parseFloat((routineTime / 3600).toFixed(2)),
        fill: 'hsl(var(--chart-2))',
      },
    ].filter(d => d.value > 0);

    return {pointsToday: totalPoints, productivityData: data};
  }, [todaysLogs, todaysCompletedTasks]);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Points Earned Today
          </CardTitle>
          <Star className="h-4 w-4 text-yellow-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pointsToday}</div>
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
      <div className="sm:col-span-2 lg:col-span-1">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <ProductivityChart data={productivityData} />
        </Suspense>
      </div>
    </section>
  );
};
