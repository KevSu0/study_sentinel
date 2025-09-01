'use client';

import React, { memo, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  Clock, 
  Target, 
  TrendingUp, 
  Calendar,
  Award,
  Zap,
  BarChart3
} from 'lucide-react';
import { useTodaysStatsSelector } from '@/hooks/use-stats-optimized';
import { useTasksSelector } from '@/hooks/use-global-state-optimized';
import { formatDuration } from '@/lib/utils';

// Memoized stat item component
interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'success' | 'warning' | 'destructive';
  onClick?: () => void;
}

const StatItem = memo<StatItemProps>(({ 
  icon, 
  label, 
  value, 
  subValue, 
  trend, 
  color = 'default',
  onClick 
}) => {
  const trendIcon = useMemo(() => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend === 'down') return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
    return null;
  }, [trend]);

  const colorClasses = useMemo(() => {
    switch (color) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'destructive': return 'text-red-600 dark:text-red-400';
      default: return 'text-foreground';
    }
  }, [color]);

  return (
    <div 
      className={`flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {label}
          </p>
          {trendIcon}
        </div>
        <div className="flex items-baseline space-x-2">
          <p className={`text-lg font-semibold ${colorClasses}`}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-muted-foreground">
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

StatItem.displayName = 'StatItem';

// Memoized progress ring component
interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

const ProgressRing = memo<ProgressRingProps>(({ 
  progress, 
  size = 120, 
  strokeWidth = 8, 
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
  children 
}) => {
  const { circumference, strokeDasharray, strokeDashoffset } = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    return { circumference, strokeDasharray, strokeDashoffset };
  }, [progress, size, strokeWidth]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
});

ProgressRing.displayName = 'ProgressRing';

// Main optimized component
interface OptimizedStatsOverviewWidgetProps {
  className?: string;
  showDetailedView?: boolean;
  onViewDetails?: () => void;
}

const OptimizedStatsOverviewWidget = memo<OptimizedStatsOverviewWidgetProps>(({ 
  className = '',
  showDetailedView = false,
  onViewDetails
}) => {
  // Use optimized selectors
  const todaysStats = useTodaysStatsSelector();
  const { todaysTasks, completedTasks } = useTasksSelector();

  // Memoized calculations
  const statsData = useMemo(() => {
    const completionRate = todaysStats.totalTasks > 0 
      ? Math.round((todaysStats.completedTasks / todaysStats.totalTasks) * 100)
      : 0;
    
    const focusScore = Math.round(todaysStats.focusScore);
    const productivity = Math.round(todaysStats.productivity);
    
    const studyTimeFormatted = formatDuration(todaysStats.totalStudyTime);
    const breakTimeFormatted = formatDuration(todaysStats.totalBreakTime);
    
    return {
      completionRate,
      focusScore,
      productivity,
      studyTimeFormatted,
      breakTimeFormatted,
    };
  }, [todaysStats]);

  // Memoized stat items
  const statItems = useMemo(() => [
    {
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      label: 'Tasks Completed',
      value: `${todaysStats.completedTasks}/${todaysStats.totalTasks}`,
      subValue: `${statsData.completionRate}%`,
      trend: todaysStats.completedTasks > 0 ? 'up' as const : 'neutral' as const,
      color: 'success' as const,
    },
    {
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      label: 'Study Time',
      value: statsData.studyTimeFormatted,
      subValue: `Break: ${statsData.breakTimeFormatted}`,
      trend: todaysStats.totalStudyTime > 0 ? 'up' as const : 'neutral' as const,
      color: 'default' as const,
    },
    {
      icon: <Target className="h-5 w-5 text-purple-500" />,
      label: 'Routines',
      value: `${todaysStats.completedRoutines}/${todaysStats.totalRoutines}`,
      subValue: todaysStats.totalRoutines > 0 ? `${Math.round((todaysStats.completedRoutines / todaysStats.totalRoutines) * 100)}%` : '0%',
      trend: todaysStats.completedRoutines > 0 ? 'up' as const : 'neutral' as const,
      color: 'default' as const,
    },
    {
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      label: 'Focus Score',
      value: `${statsData.focusScore}%`,
      subValue: 'Today',
      trend: statsData.focusScore >= 70 ? 'up' as const : statsData.focusScore >= 40 ? 'neutral' as const : 'down' as const,
      color: statsData.focusScore >= 70 ? 'success' as const : statsData.focusScore >= 40 ? 'warning' as const : 'destructive' as const,
    },
  ], [todaysStats, statsData]);

  // Memoized handlers
  const handleViewDetails = useCallback(() => {
    onViewDetails?.();
  }, [onViewDetails]);

  const handleStatItemClick = useCallback((index: number) => {
    // Handle individual stat item clicks
    console.log(`Clicked stat item ${index}`);
  }, []);

  if (!todaysStats) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Today's Overview
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            Today
          </Badge>
          {onViewDetails && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleViewDetails}
              className="text-xs"
            >
              View Details
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {showDetailedView && (
          <div className="flex justify-center mb-6">
            <ProgressRing 
              progress={statsData.completionRate} 
              size={100}
              color="#10b981"
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statsData.completionRate}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Complete
                </div>
              </div>
            </ProgressRing>
          </div>
        )}
        
        <div className="grid gap-3">
          {statItems.map((item, index) => (
            <StatItem
              key={`${item.label}-${index}`}
              {...item}
              onClick={() => handleStatItemClick(index)}
            />
          ))}
        </div>
        
        {!showDetailedView && todaysStats.totalTasks > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Daily Progress</span>
              <span className="font-medium">{statsData.completionRate}%</span>
            </div>
            <Progress 
              value={statsData.completionRate} 
              className="h-2"
            />
          </div>
        )}
        
        {todaysStats.totalTasks === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No tasks scheduled for today</p>
            <p className="text-xs mt-1">Add some tasks to get started!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

OptimizedStatsOverviewWidget.displayName = 'OptimizedStatsOverviewWidget';

export default OptimizedStatsOverviewWidget;