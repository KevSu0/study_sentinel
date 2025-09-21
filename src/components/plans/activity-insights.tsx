'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useActivityBaselines } from '@/hooks/use-activity-baselines';
import { useFocusForecast } from '@/hooks/use-focus-forecast';
import { formatDuration } from '@/lib/metrics';

interface ActivityInsightsProps {
  activityId: string;
  activityTitle: string;
  activityType: 'task' | 'routine';
  className?: string;
}

export function ActivityInsights({
  activityId,
  activityTitle,
  activityType,
  className,
}: ActivityInsightsProps) {
  const { baselines, isLoading: baselinesLoading } = useActivityBaselines();
  const { forecast, isLoading: forecastLoading } = useFocusForecast(activityId);

  const baseline = baselines.get(activityId);
  const isLoading = baselinesLoading || forecastLoading;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskVariant = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'outline';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4" />;
      case 'declining': return <TrendingDown className="h-4 w-4" />;
      case 'stable': return <Minus className="h-4 w-4" />;
      default: return null;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Activity Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!baseline && !forecast) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Activity Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete a few sessions to see insights and recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Activity Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Baseline Metrics */}
        {baseline && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Historical Performance</span>
              <div className="flex items-center space-x-1">
                {getTrendIcon(baseline.trend)}
                <span className={`text-xs ${getTrendColor(baseline.trend)}`}>
                  {baseline.trend.charAt(0).toUpperCase() + baseline.trend.slice(1)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Median Focus</div>
                <div className="text-lg font-bold">
                  {baseline.medianFocusPercentage.toFixed(1)}%
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Productive Time</div>
                <div className="text-lg font-bold">
                  {baseline.medianProductiveMinutes}m
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Based on {baseline.sessionCount} sessions
            </div>
          </div>
        )}

        {/* Forecast */}
        {forecast && (
          <>
            {baseline && <div className="border-t pt-4" />}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Focus Forecast</span>
                <Badge variant={getRiskVariant(forecast.riskLevel)} className={getRiskColor(forecast.riskLevel)}>
                  {forecast.riskLevel === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {forecast.riskLevel === 'medium' && <Clock className="w-3 h-3 mr-1" />}
                  {forecast.riskLevel === 'low' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {forecast.riskLevel.charAt(0).toUpperCase() + forecast.riskLevel.slice(1)} Risk
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Predicted Focus</span>
                  <span className="font-bold">{forecast.predictedFocus.toFixed(1)}%</span>
                </div>
                <Progress value={forecast.predictedFocus} className="h-2" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recommended Length</span>
                <div className="flex items-center space-x-1">
                  <Target className="h-3 w-3" />
                  <span className="text-sm font-medium">{forecast.recommendedSessionLength} min</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Confidence: {forecast.confidence} ({forecast.confidence === 'high' ? 'Lots of data' : forecast.confidence === 'medium' ? 'Some data' : 'Limited data'})
              </div>
            </div>
          </>
        )}

        {/* Recommendations */}
        {(baseline || forecast) && (
          <>
            <div className="border-t pt-4" />
            <div className="space-y-2">
              <div className="text-sm font-medium">Recommendations</div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {forecast && (
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    Aim for {forecast.recommendedSessionLength} minute sessions for optimal focus
                  </li>
                )}
                {baseline && baseline.trend === 'declining' && (
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    Consider shorter sessions or more breaks to maintain focus
                  </li>
                )}
                {forecast && forecast.riskLevel === 'high' && (
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    High risk of low focus - try a different time of day or environment
                  </li>
                )}
                {baseline && baseline.medianFocusPercentage >= 80 && (
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    Great historical performance! Keep up the good habits
                  </li>
                )}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}