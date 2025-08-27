'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap } from 'lucide-react';

interface DailyRealProductivityWidgetProps {
  productivity: number;
  isLoaded: boolean;
}

export function DailyRealProductivityWidget({ productivity, isLoaded }: DailyRealProductivityWidgetProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>Real Productivity</span>
        </CardTitle>
        <CardDescription>Productive time vs. total time since 4 AM.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoaded ? (
          <>
            <div className="text-4xl font-bold text-primary mb-2">{productivity.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
                Percentage of your day so far that was spent in focused work.
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
