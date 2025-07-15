
'use client';

import React, {memo} from 'react';
import {
  CheckCircle,
  Timer,
  Star,
  XCircle,
  AlertTriangle,
  BookText,
  Clock,
} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import type {ActivityFeedItem} from '@/hooks/use-global-state';
import {cn} from '@/lib/utils';
import type {StudyTask} from '@/lib/types';
import {parseISO, format} from 'date-fns';

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
};

export const ActivityItem = memo(function ActivityItem({
  item,
}: {
  item: ActivityFeedItem;
}) {
  const baseClasses =
    'flex items-start gap-4 p-3 border rounded-lg transition-colors bg-card/70';
  const formattedTime = format(parseISO(item.timestamp), 'p');

  switch (item.type) {
    case 'TASK_COMPLETE': {
      const {task, log} = item.data as {task: StudyTask; log: any | null};
      const duration = log ? log.payload.duration : task.duration * 60;
      const points = log ? log.payload.points : task.points;

      return (
        <div className={cn(baseClasses, 'border-green-500/50')}>
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          <div className="flex-1 grid gap-1">
            <p className="font-medium text-muted-foreground line-through">
              {task.title}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Timer className="h-4 w-4" />
                Completed ({formatDuration(duration)})
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-400" />
                {points} pts
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formattedTime}
              </span>
              <Badge variant="secondary" className="capitalize">
                {task.priority} Priority
              </Badge>
            </div>
          </div>
        </div>
      );
    }
    case 'ROUTINE_COMPLETE': {
      const {data: log} = item;
      const {title, duration, points, studyLog} = log.payload;
      return (
        <div className={cn(baseClasses, 'border-accent/50')}>
          <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1 grid gap-1">
            <p className="font-medium text-muted-foreground line-through">
              {title}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Timer className="h-4 w-4" />
                Studied for {formatDuration(duration || 0)}
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-400" />
                {points || 0} pts earned
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formattedTime}
              </span>
            </div>
            {studyLog && (
              <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-muted/50 text-sm">
                <BookText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-muted-foreground">{studyLog}</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    case 'TASK_STOPPED': {
      const {data: log} = item;
      const {title, reason, timeSpentSeconds} = log.payload;
      return (
        <div className={cn(baseClasses, 'border-amber-500/50')}>
          <XCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 grid gap-1">
            <p className="font-medium">{title} (Stopped)</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Timer className="h-4 w-4" />
                Time spent: {formatDuration(timeSpentSeconds || 0)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formattedTime}
              </span>
            </div>
            {reason && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                Reason: {reason}
              </div>
            )}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
});
