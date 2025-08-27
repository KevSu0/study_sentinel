'use client';
import React, {useEffect, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {useTheme} from 'next-themes';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {formatDuration} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Expand } from 'lucide-react';
import { FullscreenChartDialog } from './fullscreen-chart-dialog';

export interface Activity {
  name: string;
  time: [number, number];
  type: 'task' | 'routine';
  duration: number;
  color: string;
  pauseCount?: number;
}

interface DailyActivityTimelineProps {
  data: Activity[];
}

const TimeLabel: React.FC<{hour: number}> = ({hour}) => {
  const displayHour = hour % 24;
  const isVisible = displayHour % 3 === 0;
  const ampm = displayHour >= 12 ? 'PM' : 'AM';
  let hour12 = displayHour % 12;
  if (hour12 === 0) hour12 = 12;

  return (
    <div
      className="absolute -top-5 text-xs text-muted-foreground"
      style={{
        left: `${((hour - 4) / 24) * 100}%`,
        transform: 'translateX(-50%)',
        opacity: isVisible ? 1 : 0,
      }}
    >
      {`${hour12}${isVisible && displayHour !== 0 ? ampm : ''}`}
    </div>
  );
};

const CurrentTimeIndicator: React.FC = () => {
  const [currentHour, setCurrentHour] = useState(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentHour(now.getHours() + now.getMinutes() / 60);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  let adjustedHour = currentHour;
  if (adjustedHour < 4) {
    adjustedHour += 24;
  }

  if (adjustedHour < 4 || adjustedHour >= 28) return null;

  const left = `${((adjustedHour - 4) / 24) * 100}%`;

  return (
    <div
      className="absolute top-0 h-full w-0.5 bg-red-500"
      style={{left, zIndex: 20}}
      title={`Current Time: ${new Date().toLocaleTimeString()}`}
    />
  );
};

export const DailyActivityTimeline: React.FC<DailyActivityTimelineProps> = ({data}) => {
  const [isExpanded, setExpanded] = useState(false);
  const {theme} = useTheme();
  const timelineColor = theme === 'dark' ? '#333' : '#E5E5E5';

  const timeLabels = Array.from({length: 25}, (_, i) => (4 + i));

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
    )
  }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Daily Activity Timeline</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Your productive sessions from 4 AM to 4 AM.
            </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setExpanded(true)}>
            <Expand className="h-5 w-5" />
            <span className="sr-only">Expand Chart</span>
        </Button>
      </CardHeader>
      <CardContent className="pt-8 pb-4">
        <TooltipProvider>
          <div className="relative h-10 w-full">
            <div
              className="absolute top-1/2 h-4 w-full -translate-y-1/2 rounded-lg"
              style={{backgroundColor: timelineColor}}
            />
            
            {Array.from({length: 24}).map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-black/10 dark:bg-white/10"
                style={{left: `calc(${(i / 24) * 100}% + 1px)`}}
              />
            ))}

            <CurrentTimeIndicator />

            {timeLabels.map(hour => (
              <TimeLabel key={hour} hour={hour} />
            ))}

            {data.map((activity, index) => {
              const left = `${((activity.time[0] - 4) / 24) * 100}%`;
              const width = `${((activity.time[1] - activity.time[0]) / 24) * 100}%`;
              
              return (
                <Tooltip key={index} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-1/2 h-5 -translate-y-1/2 cursor-pointer rounded"
                      style={{
                        left,
                        width,
                        backgroundColor: activity.color,
                        zIndex: 10,
                        boxShadow: `0 0 8px ${activity.color}66`,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-bold">{activity.name}</p>
                    <p>Duration: {formatDuration(activity.duration)}</p>
                    {activity.pauseCount !== undefined && <p>Pauses: {activity.pauseCount}</p>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
    <FullscreenChartDialog isOpen={isExpanded} onOpenChange={setExpanded} data={data} />
    </>
  );
};
