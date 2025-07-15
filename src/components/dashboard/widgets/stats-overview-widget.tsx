
'use client';
import React, {lazy, Suspense, useMemo} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {Award as BadgeIcon, Star, Timer, Book} from 'lucide-react';
const ProductivityChart = lazy(
  () => import('@/components/dashboard/productivity-chart')
);
import type {Badge, LogEvent} from '@/lib/types';

interface StatsOverviewWidgetProps {
  todaysCompletedTasks: any[]; // Simplified for props
  todaysBadges: Badge[];
  todaysLogs: LogEvent[];
}

const formatDuration = (totalMinutes: number) => {
    if (totalMinutes === 0) return '0m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    return `${minutes}m`;
};


export const StatsOverviewWidget = ({
  todaysCompletedTasks = [],
  todaysBadges = [],
  todaysLogs = [],
}: StatsOverviewWidgetProps) => {
  const {pointsToday, taskMinutes, routineMinutes} = useMemo(() => {
    const routineLogs = todaysLogs.filter(
      l => l.type === 'ROUTINE_SESSION_COMPLETE'
    );
    const taskLogs = todaysLogs.filter(
      l => l.type === 'TIMER_SESSION_COMPLETE'
    );
    
    const routinePoints = routineLogs.reduce(
      (sum: number, log: any) => sum + (log.payload.points || 0),
      0
    );
    const taskPoints =
      taskLogs.reduce(
        (sum: number, log: any) => sum + (log.payload.points || 0),
        0
      );
    const totalPoints = routinePoints + taskPoints;

    const taskTime = taskLogs
      .reduce((sum: number, log: any) => sum + (log.payload.duration || 0), 0);
      
    const routineTime = routineLogs.reduce(
      (sum: number, log: any) => sum + (log.payload.duration || 0),
      0
    );

    return {
        pointsToday: totalPoints, 
        taskMinutes: Math.round(taskTime / 60),
        routineMinutes: Math.round(routineTime / 60),
    };
  }, [todaysLogs, todaysCompletedTasks]);

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Time on Tasks
          </CardTitle>
          <Book className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatDuration(taskMinutes)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Time on Routines
          </CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatDuration(routineMinutes)}</div>
        </CardContent>
      </Card>
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
    </section>
  );
};
