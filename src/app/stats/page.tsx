'use client';
import React, {useMemo, lazy, Suspense, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Target,
  CheckCircle,
  Clock,
  Flame,
  Award,
  Activity,
} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks';
import {useBadges} from '@/hooks/useBadges';
import {format, subDays, startOfDay} from 'date-fns';
import {Skeleton} from '@/components/ui/skeleton';
import {Progress} from '@/components/ui/progress';

const WeeklyChart = lazy(() => import('@/components/stats/weekly-chart'));
const PriorityChart = lazy(
  () => import('@/components/stats/priority-chart')
);

export default function StatsPage() {
  const {tasks, isLoaded: tasksLoaded} = useTasks();
  const {allBadges, earnedBadges, isLoaded: badgesLoaded} = useBadges();
  const [timeRange, setTimeRange] = useState('weekly');

  const completedTasks = useMemo(
    () => tasks.filter(t => t.status === 'completed'),
    [tasks]
  );

  const isLoaded = tasksLoaded && badgesLoaded;

  const filteredTasks = useMemo(() => {
    if (timeRange === 'overall') return tasks;

    const now = startOfDay(new Date());
    const daysToSubtract = timeRange === 'weekly' ? 7 : 30;
    const pastDate = subDays(now, daysToSubtract);

    return tasks.filter(t => new Date(t.date) >= pastDate);
  }, [tasks, timeRange]);

  const filteredCompletedTasks = useMemo(
    () => filteredTasks.filter(t => t.status === 'completed'),
    [filteredTasks]
  );

  const timeRangeStats = useMemo(() => {
    const totalMinutes = filteredCompletedTasks.reduce(
      (sum, task) => sum + task.duration,
      0
    );
    const totalHours = (totalMinutes / 60).toFixed(1);

    const completionRate =
      filteredTasks.length > 0
        ? (filteredCompletedTasks.length / filteredTasks.length) * 100
        : 0;
    const avgSessionDuration =
      filteredCompletedTasks.length > 0
        ? (totalMinutes / filteredCompletedTasks.length).toFixed(0)
        : '0';

    return {
      totalHours,
      completedCount: filteredCompletedTasks.length,
      completionRate,
      avgSessionDuration,
    };
  }, [filteredCompletedTasks, filteredTasks]);

  const studyStreak = useMemo(() => {
    const completedDates = new Set(completedTasks.map(t => t.date));
    if (completedDates.size === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    const todayStr = format(currentDate, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(currentDate, 1), 'yyyy-MM-dd');

    if (!completedDates.has(todayStr) && !completedDates.has(yesterdayStr)) {
      return 0;
    }
    if (!completedDates.has(todayStr)) {
      currentDate = subDays(currentDate, 1);
    }

    while (completedDates.has(format(currentDate, 'yyyy-MM-dd'))) {
      streak++;
      currentDate = subDays(currentDate, 1);
    }
    return streak;
  }, [completedTasks]);

  const badgeStats = useMemo(() => {
    const earnedCount = earnedBadges.size;
    const totalCount = allBadges.length;
    const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;
    return {earnedCount, totalCount, progress};
  }, [earnedBadges, allBadges]);

  const barChartData = useMemo(() => {
    const dataPoints = timeRange === 'weekly' ? 7 : 30;
    const data: {name: string; hours: number}[] = [];
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const formattedDate = format(date, 'yyyy-MM-dd');
      const dayName = format(date, timeRange === 'weekly' ? 'eee' : 'd');

      const durationOnDay = completedTasks
        .filter(task => task.date === formattedDate)
        .reduce((sum, task) => sum + task.duration, 0);

      data.push({
        name: dayName,
        hours: parseFloat((durationOnDay / 60).toFixed(2)),
      });
    }
    return data;
  }, [completedTasks, timeRange]);

  const priorityData = useMemo(() => {
    const counts = {high: 0, medium: 0, low: 0};
    for (const task of filteredCompletedTasks) {
      counts[task.priority]++;
    }
    return [
      {priority: 'high', count: counts.high},
      {priority: 'medium', count: counts.medium},
      {priority: 'low', count: counts.low},
    ];
  }, [filteredCompletedTasks]);

  const statCards = [
    {
      title: 'Total Study Time',
      value: timeRangeStats.totalHours,
      unit: 'hours',
      Icon: Clock,
    },
    {
      title: 'Completed Tasks',
      value: timeRangeStats.completedCount,
      Icon: CheckCircle,
    },
    {
      title: 'Completion Rate',
      value: timeRangeStats.completionRate.toFixed(0),
      unit: '%',
      Icon: Target,
    },
    {title: 'Badges Earned', value: badgeStats.earnedCount, Icon: Award},
    {title: 'Current Streak', value: studyStreak, unit: 'days', Icon: Flame},
    {
      title: 'Avg. Session',
      value: timeRangeStats.avgSessionDuration,
      unit: 'min',
      Icon: Activity,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold text-primary">
          Your Progress & Stats
        </h1>
        <p className="text-muted-foreground">
          Track your achievements and study habits.
        </p>
      </header>
      <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-6">
        <Tabs
          defaultValue="weekly"
          value={timeRange}
          onValueChange={setTimeRange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly">Last 7 Days</TabsTrigger>
            <TabsTrigger value="monthly">Last 30 Days</TabsTrigger>
            <TabsTrigger value="overall">Overall</TabsTrigger>
          </TabsList>
          <TabsContent value={timeRange} className="mt-6 space-y-6">
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {statCards.map(stat => (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {isLoaded ? (
                      <div className="text-2xl font-bold">
                        {stat.value}
                        {stat.unit && (
                          <span className="text-lg font-normal ml-1">
                            {stat.unit}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Skeleton className="h-8 w-3/4" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                {isLoaded ? (
                  <Suspense
                    fallback={<Skeleton className="w-full h-[380px] rounded-lg" />}
                  >
                    <WeeklyChart data={barChartData} />
                  </Suspense>
                ) : (
                  <Skeleton className="w-full h-[380px] rounded-lg" />
                )}
              </div>
              <div className="lg:col-span-2">
                 {isLoaded ? (
                  <Suspense
                    fallback={<Skeleton className="w-full h-[380px] rounded-lg" />}
                  >
                    <PriorityChart data={priorityData} />
                  </Suspense>
                ) : (
                  <Skeleton className="w-full h-[380px] rounded-lg" />
                )}
              </div>
            </section>
            
            <section>
                <Card>
                    <CardHeader>
                        <CardTitle>Badge Collection</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            You've earned {badgeStats.earnedCount} out of {badgeStats.totalCount} possible badges. Keep it up!
                        </p>
                    </CardHeader>
                    <CardContent>
                        {isLoaded ? (
                           <Progress value={badgeStats.progress} className="h-4" />
                        ) : (
                           <Skeleton className="h-4 w-full" />
                        )}
                    </CardContent>
                </Card>
            </section>
            
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
