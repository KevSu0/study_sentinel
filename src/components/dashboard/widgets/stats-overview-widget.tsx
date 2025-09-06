
'use client';
import React, {lazy, Suspense, useMemo} from 'react';
import dynamic from 'next/dynamic';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {Award as BadgeIcon, Star} from 'lucide-react';
import type {Badge} from '@/lib/types';
import { useGlobalState } from '@/hooks/use-global-state';
import { useStats } from '@/hooks/use-stats';
import { getSessionDate } from '@/lib/utils';

const ProductivityPieChart = dynamic(
  () => import('@/components/dashboard/productivity-pie-chart'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[260px] w-full" />,
  }
);

interface StatsOverviewWidgetProps {
  todaysBadges: Badge[];
}

export const StatsOverviewWidget = ({
  todaysBadges = [],
}: StatsOverviewWidgetProps) => {
  const { state } = useGlobalState();
  const { tasks, allCompletedWork, allBadges, earnedBadges, profile } =
    state;

  const { dailyPieChartData, timeRangeStats } = useStats({
    timeRange: 'daily',
    selectedDate: getSessionDate(),
  });

  const chartData = dailyPieChartData;
  const todaysPoints = timeRangeStats.totalPoints;
  const completedSessions = timeRangeStats.completedCount;
  const focusScore = timeRangeStats.focusScore;


  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="lg:col-span-1 min-h-[380px]">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <ProductivityPieChart data={chartData} focusScore={focusScore} />
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
