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
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGlobalState } from '@/hooks/use-global-state';
import { formatDuration } from '@/lib/metrics';

interface ProductivityPausedChartProps {
  timeRange: 'daily' | 'weekly' | 'monthly' | 'overall';
  selectedDate?: Date;
}

export function ProductivityPausedChart({ timeRange, selectedDate }: ProductivityPausedChartProps) {
  const { state } = useGlobalState();
  const { allCompletedWork } = state;

  const chartData = useMemo(() => {
    let data: any[] = [];
    const now = new Date();

    if (timeRange === 'daily') {
      // Hourly breakdown for selected date
      const dateStr = selectedDate?.toISOString().split('T')[0] || now.toISOString().split('T')[0];
      const dayWork = allCompletedWork.filter(w => w.date === dateStr);

      for (let hour = 0; hour < 24; hour++) {
        const hourWork = dayWork.filter(w => {
          const sessionHour = new Date(w.timestamp).getHours();
          return sessionHour === hour;
        });

        const productive = hourWork.reduce((sum, w) => sum + w.productiveDuration, 0);
        const paused = hourWork.reduce((sum, w) => sum + w.pauseDuration, 0);

        data.push({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          productive: Math.round(productive / 60000),
          paused: Math.round(paused / 60000),
          total: Math.round((productive + paused) / 60000),
        });
      }
    } else if (timeRange === 'weekly') {
      // Daily breakdown for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayWork = allCompletedWork.filter(w => w.date === dateStr);

        const productive = dayWork.reduce((sum, w) => sum + w.productiveDuration, 0);
        const paused = dayWork.reduce((sum, w) => sum + w.pauseDuration, 0);

        data.push({
          day: date.toLocaleDateString('en', { weekday: 'short' }),
          productive: Math.round(productive / 60000),
          paused: Math.round(paused / 60000),
          total: Math.round((productive + paused) / 60000),
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

        const productive = weekWork.reduce((sum, w) => sum + w.productiveDuration, 0);
        const paused = weekWork.reduce((sum, w) => sum + w.pauseDuration, 0);

        data.push({
          week: `Week ${4 - i}`,
          productive: Math.round(productive / 60000),
          paused: Math.round(paused / 60000),
          total: Math.round((productive + paused) / 60000),
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
            paused: 0,
          };
        }
        monthlyData[month].productive += w.productiveDuration;
        monthlyData[month].paused += w.pauseDuration;
      });

      data = Object.values(monthlyData).map((month: any) => ({
        month: new Date(month.month + '-01').toLocaleDateString('en', { month: 'short' }),
        productive: Math.round(month.productive / 60000),
        paused: Math.round(month.paused / 60000),
        total: Math.round((month.productive + month.paused) / 60000),
      }));
    }

    return data;
  }, [allCompletedWork, timeRange, selectedDate]);

  const totals = useMemo(() => {
    const totalProductive = chartData.reduce((sum, d) => sum + d.productive, 0);
    const totalPaused = chartData.reduce((sum, d) => sum + d.paused, 0);
    const totalTime = totalProductive + totalPaused;

    return {
      totalProductive,
      totalPaused,
      totalTime,
      productivePercentage: totalTime > 0 ? (totalProductive / totalTime) * 100 : 0,
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Productive: </span>
              {payload[0].value}m
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Paused: </span>
              {payload[1].value}m
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Total: </span>
              {payload[0].value + payload[1].value}m
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
          <span>Productive vs Paused Time</span>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {totals.productivePercentage.toFixed(1)}% productive
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} stackOffset="expand">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={timeRange === 'daily' ? 'hour' : timeRange === 'weekly' ? 'day' : timeRange === 'monthly' ? 'week' : 'month'}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="productive"
                stackId="1"
                fill="#22c55e"
                name="Productive"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="paused"
                stackId="1"
                fill="#ef4444"
                name="Paused"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              {formatDuration(totals.totalProductive * 60000)}
            </div>
            <div className="text-xs text-muted-foreground">Total productive</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">
              {formatDuration(totals.totalPaused * 60000)}
            </div>
            <div className="text-xs text-muted-foreground">Total paused</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {formatDuration(totals.totalTime * 60000)}
            </div>
            <div className="text-xs text-muted-foreground">Total time</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}