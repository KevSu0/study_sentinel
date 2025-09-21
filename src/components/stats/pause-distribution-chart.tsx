'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGlobalState } from '@/hooks/use-global-state';

interface PauseDistributionChartProps {
  timeRange: 'daily' | 'weekly' | 'monthly' | 'overall';
  selectedDate?: Date;
}

export function PauseDistributionChart({ timeRange, selectedDate }: PauseDistributionChartProps) {
  const { state } = useGlobalState();
  const { allCompletedWork } = state;

  const { histogram, stats, pieData } = useMemo(() => {
    // Filter work based on time range
    let filteredWork = allCompletedWork;
    const now = new Date();

    if (timeRange === 'daily') {
      const dateStr = selectedDate?.toISOString().split('T')[0] || now.toISOString().split('T')[0];
      filteredWork = allCompletedWork.filter(w => w.date === dateStr);
    } else if (timeRange === 'weekly') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filteredWork = allCompletedWork.filter(w => new Date(w.date) >= weekAgo);
    } else if (timeRange === 'monthly') {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      filteredWork = allCompletedWork.filter(w => new Date(w.date) >= monthAgo);
    }

    // Calculate histogram
    const histogram = {
      '0-30s': 0,
      '30s-2m': 0,
      '2m-5m': 0,
      '5m+': 0,
    };

    let totalPauses = 0;
    let totalPauseDuration = 0;
    let totalSessions = filteredWork.length;
    let sessionsWithPauses = 0;

    filteredWork.forEach(work => {
      if (work.pauseCount > 0) {
        sessionsWithPauses++;
        totalPauses += work.pauseCount;
        totalPauseDuration += work.pauseDuration;

        const avgPauseDuration = work.pauseDuration / work.pauseCount;

        if (avgPauseDuration <= 30 * 1000) {
          histogram['0-30s']++;
        } else if (avgPauseDuration <= 2 * 60 * 1000) {
          histogram['30s-2m']++;
        } else if (avgPauseDuration <= 5 * 60 * 1000) {
          histogram['2m-5m']++;
        } else {
          histogram['5m+']++;
        }
      }
    });

    const avgPausesPerSession = totalSessions > 0 ? totalPauses / totalSessions : 0;
    const avgPauseDuration = totalPauses > 0 ? totalPauseDuration / totalPauses : 0;

    const pieData = Object.entries(histogram).map(([bucket, count]) => ({
      name: bucket,
      value: count,
      percentage: sessionsWithPauses > 0 ? (count / sessionsWithPauses) * 100 : 0,
    }));

    const stats = {
      totalSessions,
      sessionsWithPauses,
      totalPauses,
      avgPausesPerSession: Math.round(avgPausesPerSession * 10) / 10,
      avgPauseDuration: Math.round(avgPauseDuration / 1000),
      avgPausesPerHour: 0, // Will calculate below
    };

    // Calculate pauses per hour
    let totalActiveHours = 0;
    filteredWork.forEach(work => {
      totalActiveHours += work.totalDuration / (1000 * 60 * 60);
    });
    stats.avgPausesPerHour = totalActiveHours > 0 ? Math.round((totalPauses / totalActiveHours) * 10) / 10 : 0;

    return { histogram, stats, pieData };
  }, [allCompletedWork, timeRange, selectedDate]);

  const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Sessions: </span>
            {data.value}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Percentage: </span>
            {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pause Distribution</span>
          <Badge variant="outline">
            {stats.sessionsWithPauses}/{stats.totalSessions} sessions had pauses
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(histogram).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {Object.entries(histogram).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} sessions`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="value" fill="#8884d8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{stats.avgPausesPerSession}</div>
            <div className="text-xs text-muted-foreground">Avg pauses per session</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{formatDuration(stats.avgPauseDuration)}</div>
            <div className="text-xs text-muted-foreground">Avg pause duration</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{stats.avgPausesPerHour}</div>
            <div className="text-xs text-muted-foreground">Pauses per hour</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{stats.totalPauses}</div>
            <div className="text-xs text-muted-foreground">Total pauses</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Quick breaks (0-30s)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Short breaks (30s-2m)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Medium breaks (2m-5m)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Long breaks (5m+)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}