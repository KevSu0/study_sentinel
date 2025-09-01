'use client';

import React, { memo, useMemo, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { useTodaysStatsSelector, useWeeklyStatsSelector } from '@/hooks/use-stats-optimized';
import { formatDuration } from '@/lib/utils';

// Memoized color palette
const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
} as const;

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
  CHART_COLORS.indigo,
  CHART_COLORS.teal,
  CHART_COLORS.danger,
];

// Memoized custom tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: any;
  }>;
  label?: string;
}

const CustomTooltip = memo<CustomTooltipProps>(({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0];
  
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[150px]">
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: data.color }}
        />
        <span className="font-medium text-sm">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div>Time: {formatDuration(data.value)}</div>
        <div>Percentage: {((data.value / data.payload.total) * 100).toFixed(1)}%</div>
        {data.payload.sessions && (
          <div>Sessions: {data.payload.sessions}</div>
        )}
      </div>
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

// Memoized legend component
interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
    payload: any;
  }>;
}

const CustomLegend = memo<CustomLegendProps>(({ payload }) => {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-1 text-xs">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
});

CustomLegend.displayName = 'CustomLegend';

// Memoized chart view selector
interface ChartViewSelectorProps {
  currentView: 'pie' | 'bar';
  onViewChange: (view: 'pie' | 'bar') => void;
}

const ChartViewSelector = memo<ChartViewSelectorProps>(({ currentView, onViewChange }) => {
  const handlePieClick = useCallback(() => onViewChange('pie'), [onViewChange]);
  const handleBarClick = useCallback(() => onViewChange('bar'), [onViewChange]);

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <Button
        variant={currentView === 'pie' ? 'default' : 'ghost'}
        size="sm"
        onClick={handlePieClick}
        className="h-7 px-2"
      >
        <PieChartIcon className="h-3 w-3" />
      </Button>
      <Button
        variant={currentView === 'bar' ? 'default' : 'ghost'}
        size="sm"
        onClick={handleBarClick}
        className="h-7 px-2"
      >
        <BarChart3 className="h-3 w-3" />
      </Button>
    </div>
  );
});

ChartViewSelector.displayName = 'ChartViewSelector';

// Main optimized component
interface OptimizedProductivityPieChartProps {
  className?: string;
  showWeeklyData?: boolean;
  height?: number;
}

const OptimizedProductivityPieChart = memo<OptimizedProductivityPieChartProps>(({ 
  className = '',
  showWeeklyData = false,
  height = 300
}) => {
  const [chartView, setChartView] = useState<'pie' | 'bar'>('pie');
  
  // Use optimized selectors
  const todaysStats = useTodaysStatsSelector();
  const weeklyStats = useWeeklyStatsSelector();
  
  // Memoized chart data preparation
  const chartData = useMemo(() => {
    const stats = showWeeklyData ? weeklyStats : todaysStats;
    
    if (!stats) return [];
    
    const data = [];
    let total = 0;
    
    if (showWeeklyData) {
      // Weekly data processing
      const weeklyData = weeklyStats.dailyBreakdown;
      const categories = new Map<string, { time: number; sessions: number }>();
      
      weeklyData.forEach(day => {
        const studyTime = day.studyTime;
        const category = day.completedTasks > 0 ? 'Productive Time' : 'Study Time';
        
        if (!categories.has(category)) {
          categories.set(category, { time: 0, sessions: 0 });
        }
        
        const cat = categories.get(category)!;
        cat.time += studyTime;
        cat.sessions += day.completedTasks;
        total += studyTime;
      });
      
      categories.forEach((value, key) => {
        if (value.time > 0) {
          data.push({
            name: key,
            value: value.time,
            sessions: value.sessions,
            total,
          });
        }
      });
    } else {
      // Today's data processing
      if (todaysStats.totalStudyTime > 0) {
        data.push({
          name: 'Study Time',
          value: todaysStats.totalStudyTime,
          sessions: todaysStats.completedTasks + todaysStats.completedRoutines,
          total: todaysStats.totalStudyTime + todaysStats.totalBreakTime,
        });
        total += todaysStats.totalStudyTime;
      }
      
      if (todaysStats.totalBreakTime > 0) {
        data.push({
          name: 'Break Time',
          value: todaysStats.totalBreakTime,
          sessions: 0,
          total: todaysStats.totalStudyTime + todaysStats.totalBreakTime,
        });
        total += todaysStats.totalBreakTime;
      }
      
      // Add productivity categories
      if (todaysStats.completedTasks > 0) {
        const productiveTime = Math.floor(todaysStats.totalStudyTime * (todaysStats.productivity / 100));
        if (productiveTime > 0 && productiveTime < todaysStats.totalStudyTime) {
          data.push({
            name: 'Productive Time',
            value: productiveTime,
            sessions: todaysStats.completedTasks,
            total,
          });
        }
      }
    }
    
    return data.length > 0 ? data : [];
  }, [todaysStats, weeklyStats, showWeeklyData]);
  
  // Memoized summary stats
  const summaryStats = useMemo(() => {
    const stats = showWeeklyData ? weeklyStats : todaysStats;
    if (!stats) return null;
    
    if (showWeeklyData) {
      return {
        totalTime: weeklyStats.totalStudyTime,
        productivity: weeklyStats.averageProductivity,
        completedTasks: weeklyStats.completedTasks,
        totalTasks: weeklyStats.totalTasks,
        streak: weeklyStats.streakDays,
      };
    } else {
      return {
        totalTime: todaysStats.totalStudyTime,
        productivity: todaysStats.productivity,
        completedTasks: todaysStats.completedTasks,
        totalTasks: todaysStats.totalTasks,
        focusScore: todaysStats.focusScore,
      };
    }
  }, [todaysStats, weeklyStats, showWeeklyData]);
  
  // Memoized handlers
  const handleViewChange = useCallback((view: 'pie' | 'bar') => {
    setChartView(view);
  }, []);
  
  // Loading state
  if (!summaryStats) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full rounded-lg" />
            <div className="flex justify-center gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Empty state
  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            {showWeeklyData ? 'Weekly' : 'Today\'s'} Productivity
          </CardTitle>
          <ChartViewSelector currentView={chartView} onViewChange={handleViewChange} />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <Clock className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No productivity data available</p>
            <p className="text-xs mt-1">
              {showWeeklyData ? 'Complete some tasks this week' : 'Start studying to see your productivity!'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          {showWeeklyData ? 'Weekly' : 'Today\'s'} Productivity
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {Math.round(summaryStats.productivity)}% Productive
          </Badge>
          <ChartViewSelector currentView={chartView} onViewChange={handleViewChange} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'pie' ? (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={PIE_COLORS[index % PIE_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => formatDuration(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill={CHART_COLORS.primary}
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={PIE_COLORS[index % PIE_COLORS.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Time</span>
            </div>
            <div className="font-semibold">{formatDuration(summaryStats.totalTime)}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tasks</span>
            </div>
            <div className="font-semibold">
              {summaryStats.completedTasks}/{summaryStats.totalTasks}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Productivity</span>
            </div>
            <div className="font-semibold">{Math.round(summaryStats.productivity)}%</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {showWeeklyData ? 'Streak' : 'Focus'}
              </span>
            </div>
            <div className="font-semibold">
              {showWeeklyData 
                ? `${summaryStats.streak} days` 
                : `${Math.round(summaryStats.focusScore || 0)}%`
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedProductivityPieChart.displayName = 'OptimizedProductivityPieChart';

export default OptimizedProductivityPieChart;