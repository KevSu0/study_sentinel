
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
  Undo,
  MoreHorizontal,
  Zap,
  PauseOctagon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import type {ActivityFeedItem} from '@/hooks/use-global-state';
import {cn} from '@/lib/utils';
import type {StudyTask} from '@/lib/types';
import {parseISO, format} from 'date-fns';

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
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
  onUndo,
  onDelete,
  isUndone,
}: {
  item: ActivityFeedItem;
  onUndo?: () => void;
  onDelete?: () => void;
  isUndone: boolean;
}) {
  const baseClasses =
    'flex items-start gap-4 p-3 border rounded-lg transition-colors bg-card/70';
  const formattedTime = format(parseISO(item.timestamp), 'p');

  const extractMetrics = () => {
    if (item.type === 'TASK_COMPLETE') {
      const {task, log} = item.data as {task: StudyTask; log: any | null};
      const totalDuration = log?.payload.duration ?? (task.duration || 0) * 60;
      const productiveDuration = log?.payload.productiveDuration ?? totalDuration;
      const pausedDuration = log?.payload.pausedDuration ?? 0;
      const pauseCount = log?.payload.pauseCount ?? 0;
      const points = log?.payload.points ?? task.points;
      const focusPercentage = totalDuration > 0 ? (productiveDuration / totalDuration) * 100 : 100;
      
      return { title: task.title, totalDuration, productiveDuration, pausedDuration, pauseCount, points, focusPercentage, priority: task.priority };
    }
    if (item.type === 'ROUTINE_COMPLETE') {
      const {routine, log} = item.data as {routine: any; log: any | null};
      if (!routine) {
        // Handle case where routine is undefined - use fallback values
        const title = item.data.name || item.data.title || 'Unknown Routine';
        return { title, totalDuration: 0, productiveDuration: 0, pausedDuration: 0, pauseCount: 0, points: 0, focusPercentage: 100 };
      }
      const totalDuration = log?.payload?.duration ?? 0;
      const productiveDuration = log?.payload?.productiveDuration ?? totalDuration;
      const pausedDuration = log?.payload?.pausedDuration ?? 0;
      const pauseCount = log?.payload?.pauseCount ?? 0;
      const points = log?.payload?.points ?? 0;
      const focusPercentage = totalDuration > 0 ? (productiveDuration / totalDuration) * 100 : 100;

      return { title: routine.title, totalDuration, productiveDuration, pausedDuration, pauseCount, points, focusPercentage, studyLog: log?.payload?.studyLog, priority: routine.priority };
    }
    return null;
  };

  const metrics = extractMetrics();

  if (item.type === 'TASK_COMPLETE' || item.type === 'ROUTINE_COMPLETE') {
    const { title, totalDuration, productiveDuration, pausedDuration, pauseCount, points, focusPercentage, priority, studyLog } = metrics!;
    const isRoutine = item.type === 'ROUTINE_COMPLETE';
    
    return (
      <div className={cn(baseClasses, isUndone ? 'border-muted/50' : 'border-green-500/50')}>
        {isUndone ? (
          <Undo className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 grid gap-1">
          <div className="flex justify-between items-center">
            <p className={cn("font-medium", isUndone ? "text-muted-foreground" : "line-through text-muted-foreground")}>
              {title}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onUndo} disabled={isUndone}>
                  Retry
                </DropdownMenuItem>
                {onDelete && (
                    <DropdownMenuItem onSelect={onDelete} className="text-destructive">
                        Delete Log
                    </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5" title="Total Time (Productive + Paused)">
              <Clock className="h-4 w-4" />
              Total: {formatDuration(totalDuration)}
            </span>
            <span className="flex items-center gap-1.5" title="Productive Time">
              <Timer className="h-4 w-4" />
              Prod: {formatDuration(productiveDuration)}
            </span>
            <span className="flex items-center gap-1.5 text-green-500" title="Focus Percentage">
                <Zap className="h-4 w-4" />
                {focusPercentage.toFixed(0)}% Focus
            </span>
            {pauseCount > 0 && (
               <span className="flex items-center gap-1.5 text-amber-500" title="Pauses">
                  <PauseOctagon className="h-4 w-4" />
                  {pauseCount} {pauseCount > 1 ? 'pauses' : 'pause'} ({formatDuration(pausedDuration)})
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-yellow-400" />
              {points} pts
            </span>
            {priority && <Badge variant="secondary" className="capitalize">{priority} Priority</Badge>}
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

  if (item.type === 'TASK_STOPPED') {
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

  return null;
});
