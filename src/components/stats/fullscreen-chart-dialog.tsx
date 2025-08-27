'use client';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

interface ActivityData {
  name: string;
  time: [number, number];
  type: 'task' | 'routine';
  duration: number;
  color: string;
}

interface FullscreenChartDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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


export function FullscreenChartDialog({ isOpen, onOpenChange, data }: FullscreenChartDialogProps) {
  const chartData = data.map((d, i) => ({ ...d, y: i * 2 }));
    
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Daily Activity Gantt Chart</DialogTitle>
        </DialogHeader>
        <div className="flex-grow w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis 
                type="number" 
                domain={[4, 28]}
                ticks={[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]}
                tickFormatter={(hour) => `${(hour - 1) % 12 + 1}${(hour < 12 || hour >= 24) ? 'am' : 'pm'}`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={true}
                axisLine={true}
                interval={0}
              />
              <YAxis
                type="category"
                dataKey="name"
                hide={true}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted-foreground)/0.1)' }} />
              <Bar dataKey="time" barSize={30} radius={[4,4,4,4]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList
                    dataKey="name"
                    position="insideLeft"
                    offset={10}
                    className="fill-primary-foreground font-semibold"
                    style={{ fontSize: '12px' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
