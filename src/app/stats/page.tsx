
'use client';
import React, {useMemo, lazy, Suspense, useState} from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
  Star,
} from 'lucide-react';
import {useGlobalState} from '@/hooks/use-global-state';
import {format, subDays, startOfDay, parseISO} from 'date-fns';
import {Skeleton} from '@/components/ui/skeleton';
import {BadgeCard} from '@/components/badges/badge-card';
import type {Badge, BadgeCategory, TaskPriority} from '@/lib/types';

const StudyActivityChart = lazy(
  () => import('@/components/stats/weekly-chart'),
  {loading: () => <Skeleton className="w-full h-[380px] rounded-lg" />}
);
const PriorityChart = lazy(
  () => import('@/components/stats/priority-chart'),
  {loading: () => <Skeleton className="w-full h-[380px] rounded-lg" />}
);

const badgeCategories: BadgeCategory[] = [
  'daily',
  'weekly',
  'monthly',
  'overall',
];

export default function StatsPage() {
  const {state} = useGlobalState();
  const {tasks, allCompletedWork, allBadges, earnedBadges, isLoaded} = state;
  const [timeRange, setTimeRange] = useState('daily');

  const filteredTasks = useMemo(() => {
    const nonArchivedTasks = tasks.filter(t => t.status !== 'archived');
    const now = startOfDay(new Date());

    if (timeRange === 'daily') {
      const todayStr = format(now, 'yyyy-MM-dd');
      return nonArchivedTasks.filter(t => t.date === todayStr);
    }
    if (timeRange === 'overall') return nonArchivedTasks;

    const daysToSubtract = timeRange === 'weekly' ? 7 : 30;
    const pastDate = subDays(now, daysToSubtract);

    return nonArchivedTasks.filter(t => parseISO(t.date) >= pastDate);
  }, [tasks, timeRange]);

  const filteredCompletedTasks = useMemo(
    () => filteredTasks.filter(t => t.status === 'completed'),
    [filteredTasks]
  );

  const filteredWork = useMemo(() => {
    const now = startOfDay(new Date());

    if (timeRange === 'daily') {
      const todayStr = format(now, 'yyyy-MM-dd');
      return allCompletedWork.filter(w => w.date === todayStr);
    }
    if (timeRange === 'overall') return allCompletedWork;

    const daysToSubtract = timeRange === 'weekly' ? 7 : 30;
    const pastDate = subDays(now, daysToSubtract);

    return allCompletedWork.filter(w => parseISO(w.date) >= pastDate);
  }, [allCompletedWork, timeRange]);

  const timeRangeStats = useMemo(() => {
    const totalMinutes = filteredWork.reduce(
      (sum, work) => sum + work.duration,
      0
    );
    const totalHours = (totalMinutes / 3600).toFixed(1); // duration is in seconds
    const totalPoints = filteredWork.reduce(
      (sum, work) => sum + work.points,
      0
    );

    const completionRate =
      filteredTasks.length > 0
        ? (filteredCompletedTasks.length / filteredTasks.length) * 100
        : 0;

    const avgSessionDuration =
      filteredWork.length > 0
        ? (totalMinutes / 60 / filteredWork.length).toFixed(0)
        : '0';

    return {
      totalHours,
      totalPoints,
      completedCount: filteredWork.length,
      completionRate,
      avgSessionDuration,
    };
  }, [filteredWork, filteredTasks, filteredCompletedTasks]);

  const studyStreak = useMemo(() => {
    const completedDates = new Set(allCompletedWork.map(w => w.date));
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
  }, [allCompletedWork]);

  const badgeStats = useMemo(() => {
    const earnedCount = earnedBadges.size;
    const totalCount = allBadges.length;
    return {earnedCount, totalCount};
  }, [earnedBadges, allBadges]);

  const categorizedBadges = useMemo(() => {
    const categories: Record<BadgeCategory, Badge[]> = {
      daily: [],
      weekly: [],
      monthly: [],
      overall: [],
    };
    for (const badge of allBadges) {
      if (!badge.isEnabled) continue;
      const category = badge.isCustom ? 'overall' : badge.category;
      categories[category].push(badge);
    }
    return categories;
  }, [allBadges]);

  const barChartData = useMemo(() => {
    const now = new Date();

    if (timeRange === 'daily') {
      return filteredWork.map(work => ({
        name:
          work.title.length > 20
            ? `${work.title.substring(0, 18)}...`
            : work.title,
        hours: parseFloat((work.duration / 3600).toFixed(2)),
      }));
    }

    if (timeRange === 'overall') {
      const monthlyData = allCompletedWork.reduce(
        (acc, work) => {
          const monthKey = format(parseISO(work.date), 'yyyy-MM');
          acc[monthKey] = (acc[monthKey] || 0) + work.duration;
          return acc;
        },
        {} as Record<string, number>
      );

      return Object.keys(monthlyData)
        .sort()
        .map(monthKey => ({
          name: format(parseISO(`${monthKey}-01`), 'MMM yy'),
          hours: parseFloat((monthlyData[monthKey] / 3600).toFixed(2)),
        }));
    }

    const dataPoints = timeRange === 'weekly' ? 7 : 30;
    const data: {name: string; hours: number}[] = [];
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const formattedDate = format(date, 'yyyy-MM-dd');
      const dayName =
        timeRange === 'weekly' ? format(date, 'eee') : format(date, 'd');

      const durationOnDay = allCompletedWork
        .filter(work => work.date === formattedDate)
        .reduce((sum, work) => sum + work.duration, 0);

      data.push({
        name: dayName,
        hours: parseFloat((durationOnDay / 3600).toFixed(2)),
      });
    }
    return data;
  }, [allCompletedWork, filteredWork, timeRange]);

  const chartDetails = useMemo(() => {
    if (timeRange === 'daily') {
      return {
        title: "Today's Study Breakdown",
        description: 'Hours spent on each completed session today.',
      };
    }
    if (timeRange === 'weekly') {
      return {
        title: 'Study Activity',
        description: 'Hours studied in the last 7 days.',
      };
    }
    if (timeRange === 'monthly') {
      return {
        title: 'Study Activity',
        description: 'Hours studied in the last 30 days.',
      };
    }
    return {
      title: 'Overall Study Activity',
      description: 'Total hours studied per month.',
    };
  }, [timeRange]);

  const priorityData = useMemo(() => {
    const counts = {high: 0, medium: 0, low: 0};
    for (const work of filteredWork) {
      if (work.type === 'task' && work.priority) {
        counts[work.priority]++;
      }
    }
    return [
      {priority: 'high' as const, count: counts.high},
      {priority: 'medium' as const, count: counts.medium},
      {priority: 'low' as const, count: counts.low},
    ];
  }, [filteredWork]);

  const getTitleCase = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const statCards = useMemo(
    () => [
      {
        title: `Points Earned (${getTitleCase(timeRange)})`,
        value: timeRangeStats.totalPoints,
        unit: 'pts',
        Icon: Star,
      },
      {
        title: `Time (${getTitleCase(timeRange)})`,
        value: timeRangeStats.totalHours,
        unit: 'hours',
        Icon: Clock,
      },
      {
        title: `Sessions Completed (${getTitleCase(timeRange)})`,
        value: timeRangeStats.completedCount,
        Icon: CheckCircle,
      },
      {
        title: `Task Completion Rate (${getTitleCase(timeRange)})`,
        value: timeRangeStats.completionRate.toFixed(0),
        unit: '%',
        Icon: Target,
      },
      {title: 'Badges Earned', value: badgeStats.earnedCount, Icon: Award},
      {title: 'Current Streak', value: studyStreak, unit: 'days', Icon: Flame},
      {
        title: `Avg. Session (${getTitleCase(timeRange)})`,
        value: timeRangeStats.avgSessionDuration,
        unit: 'min',
        Icon: Activity,
      },
    ],
    [timeRange, timeRangeStats, badgeStats, studyStreak]
  );

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold text-primary">
          Your Progress & Stats
        </h1>
        <p className="text-muted-foreground">
          Track your achievements and study habits.
        </p>
      </header>
      <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-6">
        <Tabs
          defaultValue="daily"
          value={timeRange}
          onValueChange={setTimeRange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="daily">Today</TabsTrigger>
            <TabsTrigger value="weekly">Last 7 Days</TabsTrigger>
            <TabsTrigger value="monthly">Last 30 Days</TabsTrigger>
            <TabsTrigger value="overall">Overall</TabsTrigger>
          </TabsList>
          <TabsContent value={timeRange} className="mt-6 space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <Suspense>
                  <StudyActivityChart
                    data={barChartData}
                    title={chartDetails.title}
                    description={chartDetails.description}
                    timeRange={timeRange}
                  />
                </Suspense>
              </div>
              <div className="lg:col-span-2">
                <Suspense>
                  <PriorityChart data={priorityData} />
                </Suspense>
              </div>
            </section>

            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Badge Collection</CardTitle>
                  <CardDescription>
                    You've earned {badgeStats.earnedCount} out of{' '}
                    {badgeStats.totalCount} possible badges. Keep it up!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="daily" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4">
                      {badgeCategories.map(category => (
                        <TabsTrigger
                          key={category}
                          value={category}
                          className="capitalize"
                        >
                          {category}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {badgeCategories.map(category => (
                      <TabsContent key={category} value={category}>
                        {!isLoaded ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {[...Array(5)].map((_, i) => (
                              <Skeleton key={i} className="h-40 w-full" />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {categorizedBadges[category].map(badge => (
                              <BadgeCard
                                key={badge.id}
                                badge={badge}
                                isEarned={earnedBadges.has(badge.id)}
                              />
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
