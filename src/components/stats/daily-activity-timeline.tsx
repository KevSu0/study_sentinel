'use client';
import React, {useEffect, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useTheme} from 'next-themes';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {formatDuration} from '@/lib/utils';
import { TimezoneBoundaryService } from '@/lib/timezone-boundary-service';
import { useTimezonePreference } from '@/hooks/use-timezone-preference';

interface Activity {
  name: string;
  time: [number, number];
  type: 'task' | 'routine';
  duration: number;
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
      {`${hour12} ${ampm}`}
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

  if (currentHour < 4 || currentHour >= 24) return null;

  // The timeline visually represents 20 hours (from 4 AM to midnight, then midnight to 4 AM)
  // But the calculation should be based on a 24-hour cycle starting from 4 AM.
  const hourForCalc = currentHour < 4 ? currentHour + 24 : currentHour;
  const left = `${((hourForCalc - 4) / 20) * 100}%`;

  return (
    <div
      className="absolute top-0 h-full w-0.5 bg-red-500"
      style={{left, zIndex: 20}}
      title={`Current Time: ${new Date().toLocaleTimeString()}`}
    />
  );
};

export const DailyActivityTimeline: React.FC<DailyActivityTimelineProps> = ({data}) => {
  const {theme} = useTheme();
  const { timezone } = useTimezonePreference();
  const timelineColor = theme === 'dark' ? '#333' : '#E5E5E5';
  const taskColor = theme === 'dark' ? 'rgba(136, 132, 216, 0.7)' : 'rgba(136, 132, 216, 0.9)';
  const routineColor = theme === 'dark' ? 'rgba(130, 202, 157, 0.7)' : 'rgba(130, 202, 157, 0.9)';

  // Get boundary hour based on timezone
  const boundaryHour = timezone === 'IST' ? 4 : 4; // Both use 4 AM as boundary
  const timeLabels = Array.from({length: 25}, (_, i) => (boundaryHour + i));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Activity Timeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          A 24-hour view of your productive sessions from {boundaryHour} AM to {boundaryHour} AM.
          {timezone === 'IST' && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              IST
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="pt-8 pb-4">
        <TooltipProvider>
          <div className="relative h-20 w-full">
            <div
              className="absolute top-1/2 h-8 w-full -translate-y-1/2 rounded-lg"
              style={{backgroundColor: timelineColor}}
            />
            
            {/* Vertical Grid Lines */}
            {Array.from({length: 24}).map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 h-8 w-px -translate-y-1/2 bg-black/10 dark:bg-white/10"
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
              const bgColor = activity.type === 'task' ? taskColor : routineColor;
              
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div
                      data-testid="timeline-activity"
                      className="absolute top-1/2 h-6 -translate-y-1/2 cursor-pointer rounded-md border-2"
                      style={{
                        left,
                        width,
                        backgroundColor: bgColor,
                        zIndex: 10,
                        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-bold">{activity.name}</p>
                    <p>Duration: {formatDuration(activity.duration)}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};