'use client';
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductivityDataPoint {
  day: string;
  productivity: number;
}

interface ActiveProductivityWidgetProps {
  data: ProductivityDataPoint[];
  isLoaded: boolean;
}

export function ActiveProductivityWidget({ data, isLoaded }: ActiveProductivityWidgetProps) {
  const latestProductivity = data.length > 0 ? data[data.length - 1].productivity : 0;
  
  const maxProductivity = Math.max(...data.map(d => d.productivity), 0);
  let yDomainMax = 50;
  if (maxProductivity > 150) {
    yDomainMax = 200;
  } else if (maxProductivity > 100) {
    yDomainMax = 150;
  } else if (maxProductivity > 50) {
    yDomainMax = 100;
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Productivity</CardTitle>
        <CardDescription>Productive time vs. your scheduled study window.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoaded ? (
          <>
            <div className="text-4xl font-bold text-accent mb-4">{latestProductivity.toFixed(1)}%</div>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, yDomainMax]} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Productivity']}
                  />
                  <Line type="monotone" dataKey="productivity" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-[150px] w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
