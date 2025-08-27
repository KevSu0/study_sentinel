
'use client';

import React, { useState } from 'react';
import {
  Clock,
  Timer as TimerIcon,
  Award,
  Flame,
  Pencil,
  MoreHorizontal,
  SendToBack,
  Trash2,
  Check,
  Undo,
  Repeat,
  Calendar,
  Infinity,
  PlusCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StudyTask, Routine, LogEvent } from '@/lib/types';
import { format, parseISO, parse } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGlobalState } from '@/hooks/use-global-state';
import { Checkbox } from '../ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ManualLogDialog } from '../tasks/manual-log-dialog';


type PlanItem =
  | { type: 'task'; data: StudyTask }
  | { type: 'routine'; data: Routine }
  | { type: 'completed_task'; data: StudyTask }
  | { type: 'completed_routine'; data: LogEvent };

interface PlanItemCardProps {
  item: PlanItem;
  onEditTask?: (task: StudyTask) => void;
  onUpdateTask?: (task: StudyTask) => void;
  onPushTaskToNextDay?: (taskId: string) => void;
  onEditRoutine?: (routine: Routine) => void;
  onDeleteRoutine?: (routineId: string) => void;
  onCompleteRoutine?: (routine: Routine) => void;
  onUndoCompleteRoutine?: (logId: string) => void;
  onDeleteCompleteRoutine?: (logId: string) => void;
}

const getPriorityStyles = (priority: 'low' | 'medium' | 'high') => {
  switch (priority) {
    case 'high': return 'border-red-500/80 bg-red-500/5';
    case 'medium': return 'border-yellow-500/80 bg-yellow-500/5';
    case 'low': return 'border-blue-500/80 bg-blue-500/5';
    default: return 'border-border';
  }
};

const TaskDetails = ({ data }: { data: StudyTask }) => (
  <>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {data.timerType === 'infinity' ? <Infinity className="h-3 w-3" /> : <TimerIcon className="h-3 w-3" />}
      <span>{data.timerType === 'countdown' ? `${data.duration} min` : 'Infinity'}</span>
    </div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Award className="h-3 w-3 text-amber-500" />
      <span>{data.points} pts</span>
    </div>
    <div className="flex items-center gap-2 text-xs capitalize text-muted-foreground">
      <Flame className="h-3 w-3" />
      <span>{data.priority}</span>
    </div>
  </>
);

const RoutineDetails = ({ data }: { data: Routine }) => (
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <Repeat className="h-3 w-3" />
    <span>Routine</span>
  </div>
);

export const PlanItemCard = React.memo(function PlanItemCard({
  item,
  onEditTask,
  onUpdateTask,
  onPushTaskToNextDay,
  onEditRoutine,
  onDeleteRoutine,
  onCompleteRoutine,
  onUndoCompleteRoutine,
  onDeleteCompleteRoutine
}: PlanItemCardProps) {
  const { state, startTimer } = useGlobalState();
  const { activeItem } = state;
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [isLogDialogOpen, setLogDialogOpen] = useState(false);

  const isTask = item.type === 'task' || item.type === 'completed_task';
  const isRoutine = item.type === 'routine' || item.type === 'completed_routine';
  const isCompleted = item.type.startsWith('completed');
  
  const handleToggleComplete = () => {
    if (item.type === 'task' && onUpdateTask) {
        onUpdateTask({ ...item.data, status: 'completed' });
    }
  };

  const handleUndoCompleteTask = () => {
    if (item.type === 'completed_task' && onUpdateTask) {
        onUpdateTask({ ...item.data, status: 'todo' });
    }
  };

  const time = isTask ? (item.data as StudyTask).time : (item.data as Routine).startTime;
  const title = isTask ? (item.data as StudyTask).title : (item.data as Routine).title;
  const shortId = (item.data as StudyTask | Routine).shortId;
  const id = item.data.id;
  
  const isTimerActiveForThis = activeItem?.item.id === id;

  const handleDeleteConfirm = () => {
    if (item.type === 'routine' && onDeleteRoutine) {
      onDeleteRoutine(item.data.id);
    }
    setAlertOpen(false);
  };
  
  return (
    <>
    <div className="flex items-start gap-2 sm:gap-4" data-testid="plan-item-card">
      {/* Timeline */}
      <div className="flex flex-col items-center h-full pt-1 w-10 sm:w-12">
        <span className="text-xs font-mono text-muted-foreground">{time}</span>
        <div className="mt-1 flex-grow w-px bg-border" />
      </div>
    
      {/* Card */}
      <div className="w-full">
        <div
          className={cn(
            'flex items-center gap-2 sm:gap-3 rounded-lg border p-2 sm:p-3 transition-all',
            isTask && !isCompleted && getPriorityStyles((item.data as StudyTask).priority),
            isRoutine && !isCompleted && 'border-purple-500/50 bg-purple-500/5',
            isCompleted && 'bg-background border-dashed',
            isTimerActiveForThis && 'ring-2 ring-primary'
          )}
        >
          {/* Checkbox / Icon */}
          <div className="flex-shrink-0">
             {item.type === 'task' && <Checkbox id={`task-${id}`} onCheckedChange={handleToggleComplete} />}
             {item.type === 'routine' && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onCompleteRoutine?.(item.data as Routine)} aria-label="Complete Routine"><Check className="h-5 w-5"/></Button>}
             {item.type === 'completed_task' && <Checkbox id={`task-${id}`} checked onCheckedChange={handleUndoCompleteTask} className="data-[state=checked]:bg-green-600"/>}
             {item.type === 'completed_routine' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" aria-label="Retry completion">
                      <Undo className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onUndoCompleteRoutine?.(item.data.id)}>
                      Retry
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDeleteCompleteRoutine?.(item.data.id)} className="text-destructive">
                      Delete Log
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
             )}
          </div>

          {/* Title & Details */}
          <div className="flex-1 grid gap-1">
            <p className={cn("font-medium text-sm sm:text-base", isCompleted && "line-through text-muted-foreground")}>
              {shortId && <span className="text-xs font-mono text-muted-foreground/80 mr-2">{shortId}</span>}
              {title}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {item.type === 'task' && <TaskDetails data={item.data as StudyTask} />}
              {item.type === 'routine' && <RoutineDetails data={item.data as Routine} />}
              {item.type === 'completed_task' && <TaskDetails data={item.data as StudyTask} />}
              {item.type === 'completed_routine' && (
                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TimerIcon className="h-3 w-3" />
                    <span>Logged {format(parseISO(item.data.timestamp), 'p')}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          {(item.type === 'task' || item.type === 'routine') && (
            <div className="flex items-center gap-0">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startTimer(item.data)} aria-label="Start timer">
                <TimerIcon className={cn("h-5 w-5", isTimerActiveForThis && "text-primary animate-pulse")} />
              </Button>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open menu">
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
                    <DropdownMenuItem onSelect={() => onPushTaskToNextDay?.(id)} aria-label="Push to Today">
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
      </div>
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
      
      {isLogDialogOpen && (item.type === 'task' || item.type === 'routine') && (
        <ManualLogDialog
          isOpen={isLogDialogOpen}
          onOpenChange={setLogDialogOpen}
          item={item.data}
        />
      )}
    </>
  );
});
