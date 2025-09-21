'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useGlobalState } from '@/hooks/use-global-state';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { calculateTimeWeightedFocusPercentage } from '@/lib/metrics';

interface TodaysFocusWidgetProps {
  className?: string;
}

function TodaysFocusWidgetContent({ className }: TodaysFocusWidgetProps) {
  const { state } = useGlobalState();
  const { todaysCompletedWork, allCompletedWork } = state;

  const todayFocus = useMemo(() => {
    return calculateTimeWeightedFocusPercentage(todaysCompletedWork);
  }, [todaysCompletedWork]);

  const lastWeekFocus = useMemo(() => {
    const lastWeekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i - 1);
      return date.toISOString().split('T')[0];
    });

    const lastWeekWork = allCompletedWork.filter(work =>
      lastWeekDates.includes(work.date)
    );

    return calculateTimeWeightedFocusPercentage(lastWeekWork);
  }, [allCompletedWork]);

  const getFocusColor = (focus: number) => {
    if (focus >= 80) return 'text-green-600';
    if (focus >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFocusVariant = (focus: number) => {
    if (focus >= 80) return 'default';
    if (focus >= 60) return 'secondary';
    return 'destructive';
  };

  const getDeltaIcon = (delta: number) => {
    if (delta > 1) return <TrendingUp className="h-4 w-4" />;
    if (delta < -1) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getDeltaColor = (delta: number) => {
    if (delta > 1) return 'text-green-600';
    if (delta < -1) return 'text-red-600';
    return 'text-gray-600';
  };

  const delta = todayFocus - lastWeekFocus;
  const deltaAbs = Math.abs(delta);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Today&apos;s Focus</CardTitle>
        <div className="flex items-center space-x-1">
          {lastWeekFocus > 0 && (
            <Badge variant="outline" className={getDeltaColor(delta)}>
              {getDeltaIcon(delta)}
              <span className="ml-1">{delta > 0 ? '+' : ''}{delta.toFixed(1)}pp</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <div className="text-3xl font-bold">
            <span className={getFocusColor(todayFocus)}>
              {todayFocus.toFixed(1)}%
            </span>
          </div>
          <Badge variant={getFocusVariant(todayFocus)}>
            {todayFocus >= 80 ? 'Excellent' : todayFocus >= 60 ? 'Good' : 'Needs Work'}
          </Badge>
        </div>

        {todaysCompletedWork.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sessions:</span>
              <span>{todaysCompletedWork.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Productive time:</span>
              <span>
                {Math.round(todaysCompletedWork.reduce((sum, w) => sum + w.productiveDuration, 0) / 60000)}m
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pause time:</span>
              <span>
                {Math.round(todaysCompletedWork.reduce((sum, w) => sum + w.pauseDuration, 0) / 60000)}m
              </span>
            </div>
          </div>
        )}

        {todaysCompletedWork.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Track a session to see focus metrics
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function TodaysFocusWidget({ className }: TodaysFocusWidgetProps) {
  const { isEnabled } = useFeatureFlags();

  // Check if the feature is enabled
  if (!isEnabled('productive_time_metrics')) {
    return null;
  }

  return <TodaysFocusWidgetContent className={className} />;
}