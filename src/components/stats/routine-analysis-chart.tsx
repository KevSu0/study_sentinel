'use client';
import React from 'react';
import {
  LazyBarChart as BarChart,
  LazyBar as Bar,
  LazyXAxis as XAxis,
  LazyYAxis as YAxis,
  LazyCartesianGrid as CartesianGrid,
  LazyTooltip as Tooltip,
  LazyLegend as Legend,
  LazyResponsiveContainer as ResponsiveContainer,
} from '@/components/lazy/chart-components';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

interface RoutineData {
  name: string;
  totalHours: number;
}

interface RoutineAnalysisChartProps {
  data: RoutineData[];
}

export function RoutineAnalysisChart({data}: RoutineAnalysisChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Routine Time Distribution</CardTitle>
          <CardDescription>
            Time spent on each routine in the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">
            No routine data for this time range.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Routine Time Distribution</CardTitle>
        <CardDescription>
          Total hours spent on each routine in the selected period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer {...({} as any)} width="100%" height={300}>
          <BarChart {...({} as any)} data={data} layout="vertical" margin={{left: 10, right: 10}}>
            <CartesianGrid {...({} as any)} strokeDasharray="3 3" />
            <XAxis {...({} as any)} type="number" unit="h" />
            <YAxis
              {...({} as any)}
              type="category"
              dataKey="name"
              width={80}
              tick={{fontSize: 12}}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              {...({} as any)}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
              }}
              formatter={(value: number) => [`${value.toFixed(1)} hours`, 'Total Time']}
            />
            <Legend {...({} as any)} />
            <Bar {...({} as any)} dataKey="totalHours" name="Total Hours" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
