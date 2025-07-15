
'use client';
import React, {lazy, Suspense, useMemo} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {Award as BadgeIcon, Star} from 'lucide-react';
const ProductivityPieChart = lazy(
  () => import('@/components/dashboard/productivity-pie-chart')
);
import type {Badge, CompletedWork} from '@/lib/types';

interface StatsOverviewWidgetProps {
  todaysPoints: number;
  todaysBadges: Badge[];
  todaysCompletedWork: CompletedWork[];
}

export const StatsOverviewWidget = ({
  todaysPoints = 0,
  todaysBadges = [],
  todaysCompletedWork = [],
}: StatsOverviewWidgetProps) => {
  const chartData = useMemo(() => {
    return todaysCompletedWork.map((work, index) => ({
      name: `${work.type === 'task' ? 'Task' : 'Routine'}: ${work.title}`,
      value: work.duration, // duration is in seconds
    }));
  }, [todaysCompletedWork]);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="lg:col-span-1 h-[260px]">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <ProductivityPieChart data={chartData} />
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
            <div className="text-2xl font-bold">{chartData.length}</div>
            <p className="text-xs text-muted-foreground">
              Total number of timed tasks and routines.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
