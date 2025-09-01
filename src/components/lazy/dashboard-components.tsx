'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load dashboard widgets with loading fallbacks
export const LazyStatsOverviewWidget = dynamic(
  () => import('@/components/dashboard/widgets/stats-overview-widget').then(m => ({ default: m.StatsOverviewWidget })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[380px] w-full" />,
  }
);

export const LazyTodaysRoutinesWidget = dynamic(
  () => import('@/components/dashboard/widgets/todays-routines-widget').then(m => ({ default: m.TodaysRoutinesWidget })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
);

export const LazyCompletedTodayWidget = dynamic(
  () => import('@/components/dashboard/widgets/completed-today-widget').then(m => ({ default: m.CompletedTodayWidget })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
);

export const LazyUnlockedBadgesWidget = dynamic(
  () => import('@/components/dashboard/widgets/unlocked-badges-widget').then(m => ({ default: m.UnlockedBadgesWidget })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
);

export const LazyDailyBriefingWidget = dynamic(
  () => import('@/components/dashboard/widgets/daily-briefing-widget').then(m => ({ default: m.DailyBriefingWidget })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-32 w-full" />,
  }
);

export const LazyAchievementCountdownWidget = dynamic(
  () => import('@/components/dashboard/widgets/achievement-countdown-widget').then(m => ({ default: m.AchievementCountdownWidget })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" />,
  }
);

export const LazyDailyActiveProductivityWidget = dynamic(
  () => import('@/components/dashboard/widgets/daily-active-productivity-widget').then(m => ({ default: m.DailyActiveProductivityWidget })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
);

export const LazyProductivityPieChart = dynamic(
  () => import('@/components/dashboard/productivity-pie-chart'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[380px] w-full" />,
  }
);

// Lazy load activity components
export const LazyActivityItem = dynamic(
  () => import('@/components/dashboard/activity/activity-item').then(m => ({ default: m.ActivityItem })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-16 w-full" />,
  }
);

// Lazy load dialog components
export const LazyCustomizeDialog = dynamic(
  () => import('@/components/dashboard/customize-dialog').then(m => ({ default: m.CustomizeDialog })),
  {
    ssr: false,
  }
);

export const LazyAddItemDialog = dynamic(
  () => import('@/components/dashboard/add-item-dialog').then(m => ({ default: m.AddItemDialog })),
  {
    ssr: false,
  }
);

export const LazyQuickStartSheet = dynamic(
  () => import('@/components/dashboard/quick-start-sheet').then(m => ({ default: m.QuickStartSheet })),
  {
    ssr: false,
  }
);

// Lazy load routine components
export const LazyRoutineLogDialog = dynamic(
  () => import('@/components/routines/routine-log-dialog').then(m => ({ default: m.RoutineLogDialog })),
  {
    ssr: false,
  }
);

export const LazyCompletedRoutineCard = dynamic(
  () => import('@/components/dashboard/completed-routine-card').then(m => ({ default: m.CardCompletedRoutineItem })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-24 w-full" />,
  }
);