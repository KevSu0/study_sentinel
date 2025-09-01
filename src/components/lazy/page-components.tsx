'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load main page components
export const LazyTasksPage = dynamic(
  () => import('@/app/tasks/page').then(m => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    ),
  }
);

// LazyRoutinesPage removed - /app/routines/page does not exist

export const LazyCalendarPage = dynamic(
  () => import('@/app/calendar/page').then(m => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    ),
  }
);

export const LazyStatsPage = dynamic(
  () => import('@/app/stats/page').then(m => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    ),
  }
);

export const LazySettingsPage = dynamic(
  () => import('@/app/settings/page').then(m => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    ),
  }
);

export const LazyBadgesPage = dynamic(
  () => import('@/app/badges/page').then(m => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    ),
  }
);

export const LazyProfilePage = dynamic(
  () => import('@/app/profile/page').then(m => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    ),
  }
);

// LazyTaskForm removed - /components/tasks/task-form does not exist
// LazyRoutineForm removed - /components/routines/routine-form does not exist

// Lazy load complex UI components
export const LazyCalendarView = dynamic(
  () => import('@/components/calendar/calendar-view').then(m => ({ default: m.CalendarView })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full" />,
  }
);

// LazyStatsCharts removed - /components/stats/stats-charts does not exist