'use client';

import React from 'react';
import { MoreHorizontal, CheckCircle, Star, Timer, Undo, Target, Pause, TrendingUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActivityFeedItem } from '@/hooks/use-global-state';
import {
  formatDurationMs,
  formatFocusPercentage,
  getFocusPercentageColor,
  extractMetricsFromLog,
} from '@/lib/format-metrics';

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

// Compact metrics display for plan list items
const CompactMetricsDisplay = ({ log }: { log: any }) => {
  const metrics = extractMetricsFromLog(log);
  
  if (!metrics) return null;
  
  return (
    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Target className="h-3 w-3 text-green-500" />
        {formatDurationMs(metrics.productiveDuration)}
      </span>
      <span className="flex items-center gap-1">
        <Pause className="h-3 w-3 text-orange-500" />
        {formatDurationMs(metrics.pauseDuration)} ({metrics.pauseCount})
      </span>
      <span className="flex items-center gap-1">
        <TrendingUp className="h-3 w-3 text-purple-500" />
        <span className={cn("font-medium", getFocusPercentageColor(metrics.focusPercentage))}>
          {formatFocusPercentage(metrics.focusPercentage)}
        </span>
      </span>
    </div>
  );
};

interface CompletedPlanListItemProps {
  item: ActivityFeedItem;
  onUndo?: () => void;
  onHardUndo?: () => void;
  isUndone: boolean;
}

export const CompletedPlanListItem = ({ item, onUndo, onHardUndo, isUndone }: CompletedPlanListItemProps) => {
  const isTask = item.type === 'TASK_COMPLETE';
  const data = item.data;
  
  const title = isTask ? data.task.title : data.payload.title;
  const duration = isTask ? (data.log?.payload.duration || 0) : data.payload.duration;
  const points = isTask ? (data.log?.payload.points || 0) : (data.payload.points || 0);

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
        <p className={cn("font-medium", isUndone && "line-through text-muted-foreground")}>
          {title}
        </p>
      </div>
      
      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        <span className="flex items-center gap-1">
          <Timer className="h-3 w-3" />
          {formatDuration(duration || 0)}
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-400" />
          {points || 0} pts
        </span>
      </div>
      <CompactMetricsDisplay log={isTask ? item.data.log : item.data} />

      <div className="flex-shrink-0">
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
    </div>
  );
};
