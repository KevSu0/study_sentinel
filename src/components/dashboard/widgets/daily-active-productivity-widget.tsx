'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Target } from 'lucide-react';

interface DailyActiveProductivityWidgetProps {
  productivity: number;
  isLoaded: boolean;
}

export function DailyActiveProductivityWidget({ productivity, isLoaded }: DailyActiveProductivityWidgetProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            <span>Active Productivity</span>
        </CardTitle>
        <CardDescription>Productive time vs. your scheduled study window.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoaded ? (
          <>
            <div className="text-4xl font-bold text-accent mb-2">{productivity.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
                Percentage of your ideal study time that was spent productively.
            </p>
          </>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
