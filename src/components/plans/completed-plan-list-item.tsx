
'use client';

import React from 'react';
import {
  MoreHorizontal,
  CheckCircle,
  Star,
  Timer,
  Undo,
  PauseOctagon,
  Zap,
  Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActivityFeedItem } from '@/hooks/use-global-state';
import type { StudyTask } from '@/lib/types';

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

interface CompletedPlanListItemProps {
  item: ActivityFeedItem;
  onUndo?: () => void;
  onDelete?: () => void;
  isUndone: boolean;
}

export const CompletedPlanListItem = ({
  item,
  onUndo,
  onDelete,
  isUndone,
}: CompletedPlanListItemProps) => {
  
  const extractMetrics = () => {
    if (item.type === 'TASK_COMPLETE') {
      const {task, log} = item.data as {task: StudyTask; log: any | null};
      const totalDuration = log?.payload.duration ?? (task.duration || 0) * 60;
      const productiveDuration = log?.payload.productiveDuration ?? totalDuration;
      const pausedDuration = log?.payload.pausedDuration ?? 0;
      const pauseCount = log?.payload.pauseCount ?? 0;
      const points = log?.payload.points ?? task.points;
      const focusPercentage = totalDuration > 0 ? (productiveDuration / totalDuration) * 100 : 100;
      
      return { title: task.title, totalDuration, productiveDuration, pausedDuration, pauseCount, points, focusPercentage };
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

      return { title: routine.title, totalDuration, productiveDuration, pausedDuration, pauseCount, points, focusPercentage };
    }
    return null;
  };

  const metrics = extractMetrics();

  if (!metrics) return null;

  const { title, productiveDuration, points, pausedDuration, pauseCount, focusPercentage, totalDuration } = metrics;
  const isRoutine = item.type === 'ROUTINE_COMPLETE';

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg p-2 transition-all text-sm',
        isUndone ? 'bg-muted/50' : 'hover:bg-muted/50'
      )}
      data-testid="completed-plan-list-item"
    >
      <div className="flex-shrink-0">
        {isUndone ? (
          <Undo className="h-5 w-5 text-muted-foreground" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
      </div>

      <div className="flex-1 grid gap-0.5">
        <p
          className={cn(
            'font-medium',
            isUndone && 'line-through text-muted-foreground'
          )}
        >
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
           <span className="flex items-center gap-1" title="Productive Time">
              <Timer className="h-3 w-3" />
              {formatDuration(productiveDuration || 0)}
            </span>
            <span className="flex items-center gap-1" title="Focus Percentage">
                <Zap className="h-3 w-3 text-green-500" />
                {focusPercentage.toFixed(0)}% Focus
            </span>
             {pauseCount > 0 && (
                <span className="flex items-center gap-1" title="Pauses">
                    <PauseOctagon className="h-3 w-3 text-amber-500" />
                    {pauseCount} {pauseCount > 1 ? 'pauses' : 'pause'} ({formatDuration(pausedDuration)})
                </span>
             )}
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-400" />
              {points || 0} pts
            </span>
            <span className="flex items-center gap-1" title="Total Session Time">
                <Clock className="h-3 w-3" />
                Total: {formatDuration(totalDuration)}
            </span>
        </div>
      </div>

      <div className="flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Open menu"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={onUndo}
              disabled={isUndone}
              aria-label="Retry"
            >
              Retry
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem
                onSelect={onDelete}
                className="text-destructive"
                aria-label="Delete Log"
              >
                Delete Log
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
