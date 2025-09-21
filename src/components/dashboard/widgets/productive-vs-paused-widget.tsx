'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Clock, Pause } from 'lucide-react';
import { useGlobalState } from '@/hooks/use-global-state';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { formatDuration } from '@/lib/metrics';

interface ProductiveVsPausedWidgetProps {
  className?: string;
}

function ProductiveVsPausedWidgetContent({ className }: ProductiveVsPausedWidgetProps) {
  const { state } = useGlobalState();
  const { todaysCompletedWork, yesterdaysCompletedWork } = state;

  const todayStats = useMemo(() => {
    if (todaysCompletedWork.length === 0) {
      return {
        productiveMs: 0,
        pausedMs: 0,
        totalMs: 0,
        productivePercentage: 0,
      };
    }

    const productiveMs = todaysCompletedWork.reduce((sum, w) => sum + w.productiveDuration, 0);
    const pausedMs = todaysCompletedWork.reduce((sum, w) => sum + w.pauseDuration, 0);
    const totalMs = productiveMs + pausedMs;

    return {
      productiveMs,
      pausedMs,
      totalMs,
      productivePercentage: totalMs > 0 ? (productiveMs / totalMs) * 100 : 0,
    };
  }, [todaysCompletedWork]);

  const yesterdayStats = useMemo(() => {
    if (yesterdaysCompletedWork.length === 0) {
      return {
        productiveMs: 0,
        totalMs: 0,
      };
    }

    const productiveMs = yesterdaysCompletedWork.reduce((sum, w) => sum + w.productiveDuration, 0);
    const totalMs = yesterdaysCompletedWork.reduce((sum, w) => sum + w.totalDuration, 0);

    return {
      productiveMs,
      totalMs,
    };
  }, [yesterdaysCompletedWork]);

  const productiveDelta = todayStats.productiveMs - yesterdayStats.productiveMs;
  const productiveDeltaPercentage = yesterdayStats.productiveMs > 0
    ? (productiveDelta / yesterdayStats.productiveMs) * 100
    : 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Productive vs Paused</CardTitle>
        <div className="flex items-center space-x-1">
          {yesterdaysCompletedWork.length > 0 && (
            <Badge variant={productiveDelta >= 0 ? 'default' : 'destructive'}>
              {productiveDelta >= 0 ? '+' : ''}
              {Math.round(productiveDeltaPercentage)}% vs yesterday
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress bar visualization */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time Split</span>
              <span>{Math.round(todayStats.productivePercentage)}% productive</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${todayStats.productivePercentage}%` }}
              />
            </div>
          </div>

          {/* Time breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Productive</span>
              </div>
              <div className="text-2xl font-bold">
                {formatDuration(todayStats.productiveMs)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Pause className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Paused</span>
              </div>
              <div className="text-2xl font-bold">
                {formatDuration(todayStats.pausedMs)}
              </div>
            </div>
          </div>

          {/* Additional stats */}
          {todaysCompletedWork.length > 0 && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total sessions:</span>
                <span>{todaysCompletedWork.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg pause count:</span>
                <span>
                  {(todaysCompletedWork.reduce((sum, w) => sum + w.pauseCount, 0) / todaysCompletedWork.length).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total time:</span>
                <span>{formatDuration(todayStats.totalMs)}</span>
              </div>
            </div>
          )}

          {todaysCompletedWork.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No sessions tracked today
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductiveVsPausedWidget({ className }: ProductiveVsPausedWidgetProps) {
  const { isEnabled } = useFeatureFlags();

  // Check if the feature is enabled
  if (!isEnabled('productive_time_metrics')) {
    return null;
  }

  return <ProductiveVsPausedWidgetContent className={className} />;
}