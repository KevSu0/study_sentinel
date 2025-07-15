
'use client';
import React, {useMemo} from 'react';
import {PieChart, Pie, Cell, ResponsiveContainer, Tooltip} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {cn} from '@/lib/utils';

interface ProductivityPieChartProps {
  data: {name: string; value: number}[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
];

const CustomTooltip = ({active, payload}: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const [type, ...nameParts] = data.name.split(': ');
    const name = nameParts.join(': ');
    const timeInMinutes = data.value.toFixed(1);

    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-sm">
        <div className="grid grid-cols-[auto,1fr] items-center gap-x-2 gap-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {type}
          </p>
          <p className="text-xs text-right font-semibold text-foreground">
            {timeInMinutes} min
          </p>
          <p className="col-span-2 text-sm text-foreground">{name}</p>
        </div>
      </div>
    );
  }
  return null;
};

const formatProductiveTime = (totalMinutes: number) => {
  if (totalMinutes < 1) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
};

export default function ProductivityPieChart({
  data,
}: ProductivityPieChartProps) {
  const totalMinutes = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );

  if (totalMinutes === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Today's Productivity</CardTitle>
          <CardDescription>
            Time spent on tasks and routines today.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No time logged yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Today's Productivity</CardTitle>
        <CardDescription>
          Hover over a slice to see detailed info.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center p-0 pb-2 relative">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-bold tracking-tight">
            {formatProductiveTime(totalMinutes)}
          </p>
          <p className="text-xs text-muted-foreground">Total Time</p>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              dataKey="value"
              nameKey="name"
              innerRadius="65%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  className="outline-none ring-0 focus:outline-none focus:ring-0"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
