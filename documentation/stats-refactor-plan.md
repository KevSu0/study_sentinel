# Stats Page Refactoring and Optimization Plan

This document outlines the step-by-step process for refactoring the `StatsPage` to improve modularity, performance, and maintainability.

---

### 1. Create `useStats` Hook

**Action:** Create a new custom hook named `useStats` to encapsulate all statistical calculations and data filtering logic, which is currently inside the `StatsPage` component.

**Location:**
*   **New File:** `src/hooks/use-stats.tsx`

**Expected Change:**

*   **Before:** The file does not exist.
*   **After:** Create the new file with the following content:

```tsx
import {useMemo} from 'react';
import {format, subDays, startOfDay, parseISO} from 'date-fns';
import type {
  StudyTask,
  CompletedWork,
  Badge,
  TaskPriority,
  BadgeCategory,
} from '@/lib/types';

interface UseStatsProps {
  tasks: StudyTask[];
  allCompletedWork: CompletedWork[];
  allBadges: Badge[];
  earnedBadges: Map<string, string>;
  timeRange: string;
}

export function useStats({
  tasks,
  allCompletedWork,
  allBadges,
  earnedBadges,
  timeRange,
}: UseStatsProps) {
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
    const totalSeconds = filteredWork.reduce(
      (sum, work) => sum + work.duration,
      0
    );
    const totalHours = (totalSeconds / 3600).toFixed(1); 
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
        ? (totalSeconds / 60 / filteredWork.length).toFixed(0)
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

  return {
    timeRangeStats,
    studyStreak,
    badgeStats,
    categorizedBadges,
    barChartData,
    chartDetails,
    priorityData,
  };
}
```

---

### 2. Create `StatCard` Component

**Action:** Create a new reusable `StatCard` component for displaying an individual statistic.

**Location:**
*   **New File:** `src/components/stats/stat-card.tsx`

**Expected Change:**

*   **Before:** The file does not exist.
*   **After:** Create the new file with the following content:

```tsx
import React from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import type {LucideIcon} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  Icon: LucideIcon;
  isLoaded: boolean;
}

export function StatCard({
  title,
  value,
  unit,
  Icon,
  isLoaded,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoaded ? (
          <div className="text-2xl font-bold">
            {value}
            {unit && (
              <span className="text-lg font-normal ml-1">{unit}</span>
            )}
          </div>
        ) : (
          <Skeleton className="h-8 w-3/4" />
        )}
      </CardContent>
    </Card>
  );
}
```

---

### 3. Create `StatCardGrid` Component

**Action:** Create a new component to render the grid of `StatCard` components.

**Location:**
*   **New File:** `src/components/stats/stat-card-grid.tsx`

**Expected Change:**

*   **Before:** The file does not exist.
*   **After:** Create the new file with the following content:

```tsx
import React from 'react';
import {
  Target,
  CheckCircle,
  Clock,
  Flame,
  Award,
  Activity,
  Star,
} from 'lucide-react';
import {StatCard} from './stat-card';

const getTitleCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

interface StatCardGridProps {
  timeRange: string;
  timeRangeStats: any;
  badgeStats: any;
  studyStreak: number;
  isLoaded: boolean;
}

export function StatCardGrid({
  timeRange,
  timeRangeStats,
  badgeStats,
  studyStreak,
  isLoaded,
}: StatCardGridProps) {
  const statCards = [
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
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {statCards.map(stat => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          unit={stat.unit}
          Icon={stat.Icon}
          isLoaded={isLoaded}
        />
      ))}
    </section>
  );
}
```

---

### 4. Create `BadgeCollection` Component

**Action:** Create a new component to display the user's badge collection.

**Location:**
*   **New File:** `src/components/stats/badge-collection.tsx`

**Expected Change:**

*   **Before:** The file does not exist.
*   **After:** Create the new file with the following content:

```tsx
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Skeleton} from '@/components/ui/skeleton';
import {BadgeCard} from '@/components/badges/badge-card';
import type {Badge, BadgeCategory} from '@/lib/types';

const badgeCategories: BadgeCategory[] = ['daily', 'weekly', 'monthly', 'overall'];

interface BadgeCollectionProps {
  badgeStats: {earnedCount: number; totalCount: number};
  categorizedBadges: Record<BadgeCategory, Badge[]>;
  earnedBadges: Map<string, string>;
  isLoaded: boolean;
}

export function BadgeCollection({
  badgeStats,
  categorizedBadges,
  earnedBadges,
  isLoaded,
}: BadgeCollectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Badge Collection</CardTitle>
        <CardDescription>
          You've earned {badgeStats.earnedCount} out of {badgeStats.totalCount}{' '}
          possible badges. Keep it up!
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
  );
}
```

---

### 5. Refactor `StatsPage` Component

**Action:** Refactor the main `StatsPage` component to use the new `useStats` hook and the newly created presentational components. This will significantly simplify the component.

**Location:**
*   **File:** `src/app/stats/page.tsx`

**Expected Change:**

*   **Before (Full File):**
    *   The file at `src/app/stats/page.tsx` contains all the rendering logic, state calculations, and component definitions in one place.

*   **After (Full File):**
    *   The file will be much smaller, importing the new components and hook, and focusing only on layout and state management.

```tsx
'use client';
import React, {Suspense, useState} from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {useGlobalState} from '@/hooks/use-global-state';
import {useStats} from '@/hooks/use-stats';
import {Skeleton} from '@/components/ui/skeleton';

// New Component Imports
import {StatCardGrid} from '@/components/stats/stat-card-grid';
import {BadgeCollection} from '@/components/stats/badge-collection';

// Lazy Loaded Chart Imports
const StudyActivityChart = React.lazy(
  () => import('@/components/stats/weekly-chart')
);
const PriorityChart = React.lazy(
  () => import('@/components/stats/priority-chart')
);

export default function StatsPage() {
  const {state} = useGlobalState();
  const {tasks, allCompletedWork, allBadges, earnedBadges, isLoaded} = state;
  const [timeRange, setTimeRange] = useState('daily');

  const {
    timeRangeStats,
    studyStreak,
    badgeStats,
    categorizedBadges,
    barChartData,
    chartDetails,
    priorityData,
  } = useStats({
    tasks,
    allCompletedWork,
    allBadges,
    earnedBadges,
    timeRange,
  });

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
            <StatCardGrid
              timeRange={timeRange}
              timeRangeStats={timeRangeStats}
              badgeStats={badgeStats}
              studyStreak={studyStreak}
              isLoaded={isLoaded}
            />

            <section className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <Suspense fallback={<Skeleton className="w-full h-[380px] rounded-lg" />}>
                  <StudyActivityChart
                    data={barChartData}
                    title={chartDetails.title}
                    description={chartDetails.description}
                    timeRange={timeRange}
                  />
                </Suspense>
              </div>
              <div className="lg:col-span-2">
                <Suspense fallback={<Skeleton className="w-full h-[380px] rounded-lg" />}>
                  <PriorityChart data={priorityData} />
                </Suspense>
              </div>
            </section>

            <BadgeCollection
              badgeStats={badgeStats}
              categorizedBadges={categorizedBadges}
              earnedBadges={earnedBadges}
              isLoaded={isLoaded}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
```

---

### 6. Optimize Layout for Space Usage

**Action:** Modify the layout of the `StatCardGrid` to make better use of screen real estate, especially on larger screens.

**Location:**
*   **File:** `src/components/stats/stat-card-grid.tsx`
*   **Line:** `28`

**Expected Change:**

*   **Before:**
    ```tsx
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    ```

*   **After:** Add an `xl:grid-cols-4` class to allow for four columns on extra-large screens, making the layout more compact.

    ```tsx
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    ```

This change is already included in the new `StatCardGrid` component in step 3, so this step serves as a confirmation of that optimization.
