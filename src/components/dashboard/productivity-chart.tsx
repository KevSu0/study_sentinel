
'use client';
import React from 'react';
import {PieChart, Pie, Cell, ResponsiveContainer, Legend} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

interface ProductivityChartProps {
  data: {name: string; value: number; fill: string}[];
}

export default function ProductivityChart({data}: ProductivityChartProps) {
  const totalHours = data.reduce((sum, item) => sum + item.value, 0);

  if (totalHours === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Today's Productivity
          </CardTitle>
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
        <CardTitle className="text-sm font-medium">
          Today's Productivity
        </CardTitle>
        <CardDescription className="text-xs">
          Total: {totalHours.toFixed(1)} hours
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center p-0 pb-2">
        <ResponsiveContainer width="100%" height={100}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              dataKey="value"
              innerRadius={25}
              outerRadius={40}
              paddingAngle={5}
            >
              {data.map(entry => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
              ))}
            </Pie>
            <Legend
              iconType="circle"
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{fontSize: '12px'}}
              formatter={value => (
                <span className="text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
