
'use client';
import React, {useMemo, useState, useCallback} from 'react';
import {
  LazyPieChart as PieChart,
  LazyPie as Pie,
  LazyCell as Cell,
  LazyResponsiveContainer as ResponsiveContainer,
  LazySector as Sector,
} from '@/components/lazy/chart-components';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {cn} from '@/lib/utils';

interface PieChartData {
  name: string;
  productiveDuration: number;
  pausedDuration: number;
  pauseCount: number;
  focusPercentage: number;
}
interface ProductivityPieChartProps {
  data: PieChartData[];
  focusScore?: number;
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

const formatTime = (totalSeconds: number) => {
  if (totalSeconds < 0) totalSeconds = 0;
  if (totalSeconds < 60) {
    return totalSeconds > 0 ? '<1m' : '0m';
  }
  const totalMinutes = Math.round(totalSeconds / 60);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(' ') : '0m';
};

const renderActiveShape = (props: any) => {
  const {cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload} =
    props;
  const [type, ...nameParts] = payload.name.split(': ');
  const name = nameParts.join(': ');

  return (
    <g>
      <text
        x={cx}
        y={cy - 20}
        dy={8}
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        className="text-sm font-bold"
      >
        {name}
      </text>
      <text
        x={cx}
        y={cy}
        dy={8}
        textAnchor="middle"
        className="text-xs fill-muted-foreground"
      >
        Productive: {formatTime(payload.productiveDuration)}
      </text>
       <text
        x={cx}
        y={cy + 15}
        dy={8}
        textAnchor="middle"
        className="text-xs fill-muted-foreground"
      >
        Paused: {formatTime(payload.pausedDuration)} ({payload.pauseCount} times)
      </text>
      <text
        x={cx}
        y={cy + 30}
        dy={8}
        textAnchor="middle"
        className="text-xs font-bold"
        style={{ fill }}
      >
        Focus: {payload.focusPercentage.toFixed(0)}%
      </text>
      <Sector
        {...{
          cx,
          cy,
          innerRadius,
          outerRadius,
          startAngle,
          endAngle,
          fill,
        } as any}
      />
      <Sector
        {...{
          cx,
          cy,
          startAngle,
          endAngle,
          innerRadius: outerRadius + 6,
          outerRadius: outerRadius + 10,
          fill,
        } as any}
      />
    </g>
  );
};

export default function ProductivityPieChart({
  data,
  focusScore,
}: ProductivityPieChartProps) {
  const totalProductiveSeconds = useMemo(
    () => data.reduce((sum, item) => sum + item.productiveDuration, 0),
    [data]
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onPieEnter = useCallback(
    (_: any, index: number) => {
      setActiveIndex(index);
    },
    [setActiveIndex]
  );

  const onPieLeave = useCallback(() => {
    setActiveIndex(null);
  }, [setActiveIndex]);

  if (totalProductiveSeconds === 0) {
    return (
      <Card className="h-full min-h-[380px] flex flex-col">
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
    <Card className="h-full min-h-[380px] flex flex-col">
      <CardHeader>
        <CardTitle>Today's Productivity</CardTitle>
        <CardDescription>
          Hover over a slice to see detailed info.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center p-0 pb-2 relative" style={{ height: 360 }}>
        {activeIndex === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <p className="text-4xl font-bold tracking-tighter">
              {formatTime(totalProductiveSeconds)}
            </p>
            <p className="text-sm text-muted-foreground">Productive Time</p>
            {focusScore !== undefined && (
                 <p className="text-2xl font-bold text-green-500 mt-2">{focusScore.toFixed(0)}% <span className="text-sm font-medium text-muted-foreground">Focus</span></p>
            )}
          </div>
        )}
        {/** Cast lazy components to accept any props to satisfy TS */}
        {(() => {
          const ResponsiveContainerAny = ResponsiveContainer as unknown as React.ComponentType<any>;
          const PieChartAny = PieChart as unknown as React.ComponentType<any>;
          const PieAny = Pie as unknown as React.ComponentType<any>;
          const CellAny = Cell as unknown as React.ComponentType<any>;
          return (
            <ResponsiveContainerAny width="100%" height="100%">
              <PieChartAny>
                {/** Subtle background track to make the ring visible in dark mode */}
                <PieAny
                  {...{
                    data: [{ name: 'track', productiveDuration: Math.max(totalProductiveSeconds, 1) }],
                    cx: '50%',
                    cy: '50%',
                    dataKey: 'productiveDuration',
                    innerRadius: '58%',
                    outerRadius: '92%',
                    isAnimationActive: false,
                    stroke: 'none',
                    fill: 'hsl(var(--muted))',
                    fillOpacity: 0.25,
                  } as any}
                />
                <PieAny
                  {...{
                    activeIndex: activeIndex === null ? -1 : activeIndex,
                    activeShape: renderActiveShape,
                    data,
                    cx: '50%',
                    cy: '50%',
                    dataKey: 'productiveDuration',
                    nameKey: 'name',
                    innerRadius: '60%',
                    outerRadius: '90%',
                    paddingAngle: 2,
                    stroke: 'hsl(var(--background) / 0.6)',
                    strokeWidth: 2,
                    onMouseEnter: onPieEnter,
                    onMouseLeave: onPieLeave,
                  } as any}
                >
                {data.map((entry, index) => (
                  <CellAny
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="outline-none ring-0 focus:outline-none focus:ring-0"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.25))' }}
                  />
                ))}
                </PieAny>
              </PieChartAny>
            </ResponsiveContainerAny>
          );
        })()}
      </CardContent>
    </Card>
  );
}
