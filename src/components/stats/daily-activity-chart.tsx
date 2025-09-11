
'use client';
import React from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface DailyActivityChartProps {
  data: { name: string; time: [number, number] }[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { name, time } = payload[0].payload;
    const start = new Date();
    start.setHours(Math.floor(time[0]), (time[0] % 1) * 60, 0, 0);
    const end = new Date();
    end.setHours(Math.floor(time[1]), (time[1] % 1) * 60, 0, 0);

    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
      <div className="p-2 bg-background border rounded-lg shadow-lg">
        <p className="font-bold">{name}</p>
        <p className="text-sm text-muted-foreground">{`${formatTime(start)} - ${formatTime(end)}`}</p>
      </div>
    );
  }

  return null;
};

export default function DailyActivityChart({ data }: DailyActivityChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="h-full flex flex-col">
                 <CardHeader>
                    <CardTitle>Daily Activity Timeline</CardTitle>
                    <CardDescription>A 24-hour view of your productive sessions.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No activity logged for this day.</p>
                </CardContent>
            </Card>
        );
    }
    
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Daily Activity Timeline</CardTitle>
        <CardDescription>A 24-hour view of your productive sessions.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pl-2 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
            barCategoryGap={1}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
            <XAxis type="number" domain={[0, 24]} ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]} unit="h" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted-foreground)/0.2)' }} />
            <ReferenceLine x={new Date().getHours()} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
            <Bar dataKey="time" fill="hsl(var(--primary))" barSize={10} radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
