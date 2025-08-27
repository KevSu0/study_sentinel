'use client';
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  LabelList
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

interface ActivityData {
  name: string;
  time: [number, number];
  type: 'task' | 'routine';
  duration: number;
  color: string;
}

interface DailyActivityChartProps {
  data: ActivityData[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, time, duration } = payload[0].payload;
      const start = new Date();
      start.setHours(Math.floor(time[0]), (time[0] % 1) * 60, 0, 0);
      const end = new Date();
      end.setHours(Math.floor(time[1]), (time[1] % 1) * 60, 0, 0);

      const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      return (
        <div className="p-2 bg-background border rounded-lg shadow-lg">
          <p className="font-bold">{name}</p>
          <p className="text-sm text-muted-foreground">{`${formatTime(start)} - ${formatTime(end)}`}</p>
          <p className="text-sm text-muted-foreground">Duration: {Math.round(duration / 60)} mins</p>
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
          <CardTitle>Daily Activity Gantt</CardTitle>
          <CardDescription>
            A 24-hour view of your productive sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No activity logged for this day.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d, i) => ({ ...d, y: i * 2 }));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Daily Activity Gantt</CardTitle>
        <CardDescription>
          A 360° view of your productive day, from 4 AM to 4 AM.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pb-0">
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              barCategoryGap="30%"
            >
              <XAxis 
                type="number" 
                domain={[4, 28]}
                ticks={[4, 7, 10, 13, 16, 19, 22, 25, 28]}
                tickFormatter={(hour) => `${(hour - 1) % 12 + 1}${(hour < 12 || hour >= 24) ? 'am' : 'pm'}`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="name"
                hide={true}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted-foreground)/0.1)' }} />
              <Bar dataKey="time" minPointSize={2} >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList
                    dataKey="name"
                    position="insideLeft"
                    offset={5}
                    className="fill-primary-foreground font-semibold"
                    style={{ fontSize: '10px' }}
                />
              </Bar>
            </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
