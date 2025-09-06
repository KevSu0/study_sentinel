'use client';

import React, { useState } from 'react';
import {
  Clock,
  Timer as TimerIcon,
  Award,
  Flame,
  MoreHorizontal,
  Check,
  Undo,
  Repeat,
  Infinity as InfinityIcon,
  Pencil,
  SendToBack,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StudyTask, Routine, CompletedActivity } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { getPriorityCardStyles, getPriorityTextStyles } from '@/lib/priority-colors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGlobalState } from '@/hooks/use-global-state';
import { Checkbox } from '../ui/checkbox';
import { ManualLogDialog } from '../tasks/manual-log-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type PlanItem =
  | { type: 'task'; data: StudyTask }
  | { type: 'routine'; data: Routine }
  | { type: 'completed_item'; data: CompletedActivity };

interface PlanListItemProps {
  item: PlanItem;
  onEditTask?: (task: StudyTask) => void;
  onUpdateTask?: (task: StudyTask) => void;
  onPushTaskToNextDay?: (taskId: string) => void;
  onEditRoutine?: (routine: Routine) => void;
  onDeleteRoutine?: (routineId: string) => void;
  onCompleteRoutine?: (routine: Routine) => void;
  onUndoCompleteItem?: (attemptId: string) => void;
  onDeleteCompleteItem?: (attemptId: string) => void;
}

export const PlanListItem = React.memo(function PlanListItem({
  item,
  onEditTask,
  onUpdateTask,
  onPushTaskToNextDay,
  onEditRoutine,
  onDeleteRoutine,
  onCompleteRoutine,
  onUndoCompleteItem,
  onDeleteCompleteItem
}: PlanListItemProps) {
  const { state, startTimer } = useGlobalState();
  const { activeAttempt } = state;
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [isLogDialogOpen, setLogDialogOpen] = useState(false);

  const itemToLog = (item.type === 'task' || item.type === 'routine') ? item.data : null;

  const isTask = item.type === 'task' || (item.type === 'completed_item' && 'isRoutine' in item.data.template === false);
  const isCompleted = item.type === 'completed_item';

  const handleToggleComplete = () => {
    if (item.type === 'task' && onUpdateTask) {
      onUpdateTask({ ...item.data, status: 'completed' });
    }
  };

  const handleUndoCompleteTask = () => {
     if (item.type === 'completed_item' && 'isRoutine' in item.data.template === false && onUpdateTask) {
        // This needs to be handled by the parent, likely by deleting the attempt and resetting task status
     }
  };

  const data = item.type === 'completed_item' ? item.data.template : item.data;
  const { time, startTime, title, shortId, id } = data as any;

  const isTimerActiveForThis = activeAttempt?.entityId === id;

  const handleDeleteConfirm = () => {
    if (item.type === 'routine' && onDeleteRoutine) {
      onDeleteRoutine(item.data.id);
    }
    setAlertOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 sm:gap-3 rounded-lg p-2 transition-all hover:bg-muted/50',
          isTimerActiveForThis && 'bg-primary/10',
          !isCompleted && getPriorityCardStyles((data as any).priority)
        )}
      >
        <span className="text-xs font-mono text-muted-foreground w-10 sm:w-12 text-right">{time || startTime}</span>

        <div className="flex-shrink-0">
          {item.type === 'task' && <Checkbox id={`list-task-${id}`} onCheckedChange={handleToggleComplete} />}
          {item.type === 'routine' && <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => onCompleteRoutine?.(item.data as Routine)}><Check className="h-5 w-5" /></Button>}
          {item.type === 'completed_item' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-green-600">
                  <Undo className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onUndoCompleteItem?.(item.data.attempt.id)}>
                  Retry
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDeleteCompleteItem?.(item.data.attempt.id)} className="text-destructive">
                  Delete Log
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex-1 grid gap-0.5">
          <p className={cn("font-medium text-sm sm:text-base", isCompleted && "line-through text-muted-foreground")}>
            {shortId && <span className="text-xs font-mono text-muted-foreground/80 mr-2">{shortId}</span>}
            {title}
          </p>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
            {item.type === 'task' && <>
              {(() => {
                const p = (item.data as StudyTask).priority;
                const explicit = p === 'high' ? 'text-red-500' : p === 'medium' ? 'text-yellow-500' : 'text-blue-500';
                return <Flame className={cn("h-3 w-3", getPriorityTextStyles(p), explicit)} />
              })()}
              {(item.data as StudyTask).timerType === 'infinity' ?
                <InfinityIcon className="h-3 w-3" /> :
                <span>{(item.data as StudyTask).duration} min</span>
              }
            </>}
            {item.type === 'routine' && <><Flame className={cn("h-3 w-3", getPriorityTextStyles((item.data as Routine).priority))} /><Repeat className="h-3 w-3" /><span>Routine</span></>}
            {item.type === 'completed_item' && <><Award className="h-3 w-3 text-green-500" /><span>Logged {format(new Date(item.data.attempt.createdAt), 'p')}</span></>}
          </div>
        </div>

        {!isCompleted && (
          <div className="flex items-center">
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => startTimer(item.data)}>
              <TimerIcon className={cn("h-5 w-5", isTimerActiveForThis && "text-primary animate-pulse")} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {item.type === 'task' && (
                  <>
                    <DropdownMenuItem onSelect={() => onEditTask?.(item.data as StudyTask)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLogDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Log Time
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onPushTaskToNextDay?.(id)}>
                      <SendToBack className="mr-2 h-4 w-4" /> Push to Today
                    </DropdownMenuItem>
                  </>
                )}
                {item.type === 'routine' && (
                  <>
                    <DropdownMenuItem onSelect={() => onEditRoutine?.(item.data as Routine)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLogDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Log Time
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setAlertOpen(true)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the routine "{title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isLogDialogOpen && itemToLog && (
        <div data-testid="manual-log-dialog">
          <ManualLogDialog
            isOpen={isLogDialogOpen}
            onOpenChange={setLogDialogOpen}
            item={itemToLog}
          />
        </div>
      )}
    </>
  );
});