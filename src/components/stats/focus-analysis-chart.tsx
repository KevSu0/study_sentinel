'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGlobalState } from '@/hooks/use-global-state';
import { calculateTimeWeightedFocusPercentage } from '@/lib/metrics';

interface FocusAnalysisChartProps {
  timeRange: 'daily' | 'weekly' | 'monthly' | 'overall';
  selectedDate?: Date;
}

export function FocusAnalysisChart({ timeRange, selectedDate }: FocusAnalysisChartProps) {
  const { state } = useGlobalState();
  const { allCompletedWork } = state;

  const chartData = useMemo(() => {
    const now = new Date();
    let data: any[] = [];
    let totalProductive = 0;
    let totalDuration = 0;

    if (timeRange === 'daily') {
      // Hourly breakdown for selected date
      const dateStr = selectedDate?.toISOString().split('T')[0] || now.toISOString().split('T')[0];
      const dayWork = allCompletedWork.filter(w => w.date === dateStr);

      // Create hourly buckets
      for (let hour = 0; hour < 24; hour++) {
        const hourWork = dayWork.filter(w => {
          const sessionHour = new Date(w.timestamp).getHours();
          return sessionHour === hour;
        });

        const hourProductive = hourWork.reduce((sum, w) => sum + w.productiveDuration, 0);
        const hourTotal = hourWork.reduce((sum, w) => sum + w.totalDuration, 0);
        const hourFocus = hourTotal > 0 ? (hourProductive / hourTotal) * 100 : 0;

        totalProductive += hourProductive;
        totalDuration += hourTotal;

        data.push({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          focus: Math.round(hourFocus * 10) / 10,
          sessions: hourWork.length,
          productive: Math.round(hourProductive / 60000),
          total: Math.round(hourTotal / 60000),
        });
      }
    } else if (timeRange === 'weekly') {
      // Daily breakdown for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayWork = allCompletedWork.filter(w => w.date === dateStr);

        const dayProductive = dayWork.reduce((sum, w) => sum + w.productiveDuration, 0);
        const dayTotal = dayWork.reduce((sum, w) => sum + w.totalDuration, 0);
        const dayFocus = calculateTimeWeightedFocusPercentage(dayWork);

        totalProductive += dayProductive;
        totalDuration += dayTotal;

        data.push({
          day: date.toLocaleDateString('en', { weekday: 'short' }),
          focus: dayFocus,
          sessions: dayWork.length,
          productive: Math.round(dayProductive / 60000),
          total: Math.round(dayTotal / 60000),
          fullDate: dateStr,
        });
      }
    } else if (timeRange === 'monthly') {
      // Weekly breakdown for last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekWork = allCompletedWork.filter(w => {
          const workDate = new Date(w.date);
          return workDate >= weekStart && workDate <= weekEnd;
        });

        const weekProductive = weekWork.reduce((sum, w) => sum + w.productiveDuration, 0);
        const weekTotal = weekWork.reduce((sum, w) => sum + w.totalDuration, 0);
        const weekFocus = calculateTimeWeightedFocusPercentage(weekWork);

        totalProductive += weekProductive;
        totalDuration += weekTotal;

        data.push({
          week: `Week ${4 - i}`,
          focus: weekFocus,
          sessions: weekWork.length,
          productive: Math.round(weekProductive / 60000),
          total: Math.round(weekTotal / 60000),
        });
      }
    } else {
      // Monthly breakdown for all time
      const monthlyData: { [key: string]: any } = {};

      allCompletedWork.forEach(w => {
        const month = new Date(w.date).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = {
            month,
            productive: 0,
            total: 0,
            sessions: 0,
            workItems: [],
          };
        }
        monthlyData[month].productive += w.productiveDuration;
        monthlyData[month].total += w.totalDuration;
        monthlyData[month].sessions += 1;
        monthlyData[month].workItems.push(w);
      });

      data = Object.values(monthlyData).map((month: any) => {
        const focus = calculateTimeWeightedFocusPercentage(month.workItems);
        return {
          month: new Date(month.month + '-01').toLocaleDateString('en', { month: 'short' }),
          focus,
          sessions: month.sessions,
          productive: Math.round(month.productive / 60000),
          total: Math.round(month.total / 60000),
        };
      });

      totalProductive = data.reduce((sum, d) => sum + (d.productive * 60000), 0);
      totalDuration = data.reduce((sum, d) => sum + (d.total * 60000), 0);
    }

    const overallFocus = totalDuration > 0 ? (totalProductive / totalDuration) * 100 : 0;

    return {
      data,
      overallFocus: Math.round(overallFocus * 10) / 10,
    };
  }, [allCompletedWork, timeRange, selectedDate]);

  const getFocusColor = (focus: number) => {
    if (focus >= 80) return '#22c55e';
    if (focus >= 60) return '#eab308';
    return '#ef4444';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Focus: </span>
              <span style={{ color: getFocusColor(data.focus) }}>
                {data.focus.toFixed(1)}%
              </span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Productive: </span>
              {data.productive}m
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Total: </span>
              {data.total}m
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Sessions: </span>
              {data.sessions}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Focus Analysis</span>
          <div className="text-sm text-muted-foreground">
            Overall: <span style={{ color: getFocusColor(chartData.overallFocus) }}>
              {chartData.overallFocus.toFixed(1)}%
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={timeRange === 'daily' ? 'hour' : timeRange === 'weekly' ? 'day' : timeRange === 'monthly' ? 'week' : 'month'}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" />
              <ReferenceLine y={60} stroke="#eab308" strokeDasharray="3 3" />
              <Bar
                dataKey="focus"
                fill="#8884d8"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center space-x-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Excellent (≥80%)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Good (≥60%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}