
'use client';

import React from 'react';
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
  Target,
  Pause,
  TrendingUp,
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
import {
  formatDurationMs,
  formatFocusPercentage,
  getFocusPercentageColor,
  extractMetricsFromLog,
  formatPauseCount,
} from '@/lib/format-metrics';

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

// Component to display detailed metrics
const MetricsDisplay = ({ log }: { log: any }) => {
  const metrics = extractMetricsFromLog(log);
  
  if (!metrics) return null;
  
  return (
    <div className="grid grid-cols-2 gap-2 mt-2 p-2 rounded-md bg-muted/30 text-xs">
      <div className="flex items-center gap-1.5">
        <Timer className="h-3 w-3 text-blue-500" />
        <span className="text-muted-foreground">Total:</span>
        <span className="font-medium">{formatDurationMs(metrics.totalDuration)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Target className="h-3 w-3 text-green-500" />
        <span className="text-muted-foreground">Productive:</span>
        <span className="font-medium">{formatDurationMs(metrics.productiveDuration)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Pause className="h-3 w-3 text-orange-500" />
        <span className="text-muted-foreground">Pauses:</span>
        <span className="font-medium">{formatDurationMs(metrics.pauseDuration)} ({metrics.pauseCount})</span>
      </div>
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3 w-3 text-purple-500" />
        <span className="text-muted-foreground">Focus:</span>
        <span className={cn("font-medium", getFocusPercentageColor(metrics.focusPercentage))}>
          {formatFocusPercentage(metrics.focusPercentage)}
        </span>
      </div>
    </div>
  );
};

export const ActivityItem = React.memo(function ActivityItem({
  item,
  onUndo,
  onHardUndo,
  isUndone,
}: {
  item: ActivityFeedItem;
  onUndo?: () => void;
  onHardUndo?: () => void;
  isUndone: boolean;
}) {
  const baseClasses =
    'flex items-start gap-4 p-3 border rounded-lg transition-colors bg-card/70';
  const formattedTime = format(parseISO(item.timestamp), 'p');

  switch (item.type) {
    case 'TASK_COMPLETE': {
      const {task, log} = item.data as {task: StudyTask; log: any | null};
      const duration = log ? log.payload.duration : (task.duration || 0) * 60;
      const points = log ? log.payload.points : task.points;

      return (
        <div className={cn(baseClasses, isUndone ? 'border-muted/50' : 'border-green-500/50')}>
          {isUndone ? (
            <Undo className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 grid gap-1">
            <div className="flex justify-between items-center">
              <p className={cn("font-medium", isUndone && "line-through text-muted-foreground")}>
                {task.title}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open menu">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onUndo} disabled={isUndone} aria-label="Undo Completion">
                    Undo Completion
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onHardUndo} className="text-destructive" aria-label="Hard Undo">
                    Hard Undo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
            <MetricsDisplay log={log} />
          </div>
        </div>
      );
    }
    case 'ROUTINE_COMPLETE': {
      const {data: log} = item;
      const {title, duration, points, studyLog} = log.payload;
      return (
        <div className={cn(baseClasses, isUndone ? 'border-muted/50' : 'border-accent/50')}>
          {isUndone ? (
            <Undo className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          )}
          <div className="flex-1 grid gap-1">
            <div className="flex justify-between items-center">
              <p className={cn("font-medium", isUndone && "line-through text-muted-foreground")}>
                {title}
              </p>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open menu">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onUndo} disabled={isUndone} aria-label="Undo Completion">
                    Undo Completion
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onHardUndo} className="text-destructive" aria-label="Hard Undo">
                    Hard Undo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
            <MetricsDisplay log={log} />
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
            <MetricsDisplay log={log} />
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
