
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { BrainCircuit } from 'lucide-react';

interface PeakProductivityCardProps {
  data: { hour: string; totalSeconds: number }[];
}

export const PeakProductivityCard: React.FC<PeakProductivityCardProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Peak Productivity Hours</CardTitle>
          <CardDescription>Your most productive times of the day based on total study time.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">Not enough data to determine peak hours.</p>
        </CardContent>
      </Card>
    );
  }

  const peakHour = data.reduce((max, hour) => (hour.totalSeconds > max.totalSeconds ? hour : max), data[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peak Productivity Hours</CardTitle>
        <CardDescription>
          Your most productive time is around <span className="text-primary font-bold">{peakHour.hour}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              labelStyle={{ fontWeight: 'bold' }}
              formatter={(value: number) => [`${Math.round(value / 60)} mins`, 'Total Time']}
            />
            <Bar dataKey="totalSeconds" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
