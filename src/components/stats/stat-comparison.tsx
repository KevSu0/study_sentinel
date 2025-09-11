
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

import { format, set } from 'date-fns';

interface Stat {
  duration: number;
  points: number;
  start: number;
  end: number;
}

interface StatComparisonProps {
  stats: {
    today: Stat;
    yesterday: Stat;
    dailyAverage: Stat;
    last3DaysAverage: Stat;
    weeklyAverage: Stat;
    monthlyAverage: Stat;
  };
  selectedDate: Date;
}

const formatDuration = (seconds: number) => {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes === 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
};

const formatTime = (timestamp: number) => {
    if (timestamp === 0) return 'N/A';
    return format(new Date(timestamp), 'h:mm a');
}

const ComparisonCard = ({ title, value, comparison, unit }: { title: string; value: number; comparison: number; unit: 'duration' | 'points' | 'time' }) => {
  const diff = value - comparison;

  let isGood: boolean;
  if (title === 'Start Time') {
    isGood = diff <= 0; // Earlier or same is good
  } else if (title === 'End Time') {
    isGood = diff >= 0; // Ending at or after 12 PM is good
  } else {
    isGood = diff > 0; // More is good for duration/points
  }
  
  let diffText = '';
  const absDiff = Math.abs(diff);

  if (diff !== 0) {
    if (unit === 'duration') {
      diffText = `${isGood ? '+' : '−'}${formatDuration(absDiff)}`;
    } else if (unit === 'points') {
      diffText = `${isGood ? '+' : '−'}${Math.round(absDiff)}`;
    } else if (unit === 'time' && value > 0 && comparison > 0) {
      const diffSeconds = Math.round(absDiff / 1000);
      diffText = `${isGood ? '+' : '−'}${formatDuration(diffSeconds)}`;
    }
  }

  const diffColor = diff === 0 ? 'text-muted-foreground' : isGood ? 'text-green-500' : 'text-red-500';

  if (comparison === 0) {
    return (
        <div className="bg-muted/50 p-3 rounded-lg text-center h-full flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className={cn('text-lg font-semibold flex items-center justify-center text-muted-foreground')}>
                <span>No Data</span>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-muted/50 p-3 rounded-lg text-center h-full flex flex-col justify-center">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className={cn('text-lg font-semibold flex items-center justify-center', diffColor)}>
        {diff !== 0 && (isGood ? <TrendingUp className="h-5 w-5 mr-1" /> : <TrendingDown className="h-5 w-5 mr-1" />)}
        {diff === 0 && <Minus className="h-5 w-5 mr-1" />}
        <span>{diffText || 'No change'}</span>
      </div>
    </div>
  );
};

export const StatComparison = ({ stats, selectedDate }: StatComparisonProps) => {
  const comparisonPoints = [
    { title: 'Yesterday', data: stats.yesterday },
    { title: 'Daily Avg', data: stats.dailyAverage },
    { title: 'Weekly Avg', data: stats.weeklyAverage },
    { title: 'Monthly Avg', data: stats.monthlyAverage },
  ];

  const defaultStartTime = set(selectedDate, { hours: 5, minutes: 0, seconds: 0, milliseconds: 0 }).getTime();
  const defaultEndTime = set(selectedDate, { hours: 24, minutes: 0, seconds: 0, milliseconds: 0 }).getTime();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Performance Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <div className="flex items-center gap-4">
                <h3 className="text-base font-medium text-muted-foreground">Duration vs.</h3>
                <Badge variant="outline" className="text-base font-bold">{formatDuration(stats.today.duration)}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {comparisonPoints.map(cp => (
                    <ComparisonCard key={cp.title} title={cp.title} value={stats.today.duration} comparison={cp.data.duration} unit="duration" />
                ))}
            </div>
        </div>

        <div className="space-y-2">
            <div className="flex items-center gap-4">
                 <h3 className="text-base font-medium text-muted-foreground">Points vs.</h3>
                 <Badge variant="outline" className="text-base font-bold">{stats.today.points}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {comparisonPoints.map(cp => (
                    <ComparisonCard key={cp.title} title={cp.title} value={stats.today.points} comparison={cp.data.points} unit="points" />
                ))}
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
