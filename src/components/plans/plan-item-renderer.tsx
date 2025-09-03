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
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ManualLogDialog } from '@/components/tasks/manual-log-dialog';
import { useGlobalState } from '@/hooks/use-global-state';
import { StudyTask, Routine, LogEvent } from '@/lib/types';
import { toast } from 'sonner';


// Lazy load TimerDialog for task-card variant
const TimerDialog = React.lazy(() => import('@/components/tasks/timer-dialog').then(module => ({ default: module.TimerDialog })));

type PlanItem =
  | { type: 'task'; data: StudyTask }
  | { type: 'routine'; data: Routine }
  | { type: 'completed_task'; data: LogEvent }
  | { type: 'completed_routine'; data: LogEvent };

type PlanItemVariant = 'card' | 'list' | 'task-card';

interface PlanItemRendererProps {
  item: PlanItem;
  variant: PlanItemVariant;
  onEditTask?: (task: StudyTask) => void;
  onUpdateTask?: (task: StudyTask) => void;
  onPushTaskToNextDay?: (taskId: string) => void;
  onEditRoutine?: (routine: Routine) => void;
  onDeleteRoutine?: (routineId: string) => void;
  onCompleteRoutine?: (routine: Routine) => void;
  onUndoCompleteRoutine?: (logId: string) => void;
  onDeleteCompleteRoutine?: (logId: string) => void;
  subjectDate?: Date;
  // Task-card specific props
  onArchiveTask?: (taskId: string) => void;
  onUnarchiveTask?: (taskId: string) => void;
  onCompleteTask?: (taskId: string) => void;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-blue-500';
    default: return 'text-muted-foreground';
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
    {data.priority && (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Flame className="h-3 w-3 text-red-500" />
        <span className={getPriorityColor(data.priority)}>{data.priority.charAt(0).toUpperCase() + data.priority.slice(1)}</span>
      </div>
    )}
  </>
);

const RoutineDetails = ({ data }: { data: Routine }) => (
  <>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Repeat className="h-3 w-3" />
      <span className="capitalize">routine</span>
    </div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Award className="h-3 w-3 text-amber-500" />
      <span>10 pts</span>
    </div>
  </>
);

export const PlanItemRenderer: React.FC<PlanItemRendererProps> = ({
  item,
  variant,
  onEditTask,
  onUpdateTask,
  onPushTaskToNextDay,
  onEditRoutine,
  onDeleteRoutine,
  onCompleteRoutine,
  onUndoCompleteRoutine,
  onDeleteCompleteRoutine,
  onArchiveTask,
  onUnarchiveTask,
  onCompleteTask,
  subjectDate,
}) => {
  const { state, startTimer, updateRoutine, updateLog } = useGlobalState() as any;
  const { activeItem } = state;
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [isLogDialogOpen, setLogDialogOpen] = useState(false);
  const [isTimerDialogOpen, setIsTimerDialogOpen] = useState(false);

  const isTask = item.type === 'task' || item.type === 'completed_task';
  const isRoutine = item.type === 'routine' || item.type === 'completed_routine';
  const isCompleted = item.type.startsWith('completed');

  const handleToggleComplete = () => {
    if (item.type === 'task' && onUpdateTask) {
      onUpdateTask({ ...item.data, status: 'completed' });
    }
  };

  const handleDeleteConfirm = () => {
    if (item.type === 'routine' && onDeleteRoutine) {
      onDeleteRoutine(item.data.id);
    }
    setAlertOpen(false);
  };

  const time = isTask ? (item.data as StudyTask).time : (item.data as Routine).startTime;
  const title = isTask ? (item.data as StudyTask).title : (item.data as Routine).title;
  const shortId = (item.data as StudyTask | Routine).shortId;
  const id = item.data.id;

  const isTimerActiveForThis = activeItem?.item.id === id;

  // Task-card specific handlers
  const handleStatusChange = (newStatus: 'completed' | 'archived') => {
    if (item.type === 'task' && onUpdateTask) {
      const task = item.data as StudyTask;
      if (newStatus === 'completed') {
        // Simple confetti effect without canvas-confetti
        toast.success('Task completed! 🎉');
      }
      onUpdateTask({ ...task, status: newStatus });
    }
  };

  const handleArchive = () => {
    if (item.type === 'task' && onArchiveTask) {
      onArchiveTask(item.data.id);
      toast.success('Task archived');
    }
  };

  const handleUnarchive = () => {
    if (item.type === 'task' && onUnarchiveTask) {
      onUnarchiveTask(item.data.id);
      toast.success('Task restored');
    }
  };

  const handleStartTimer = () => {
    if (isTask) {
      const task = item.data as StudyTask;
      if (task.timerType === 'countdown') {
        setIsTimerDialogOpen(true);
      } else {
        startTimer(task);
      }
    }
  };

  const renderContent = () => {
    const commonContent = (
      <>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {variant !== 'task-card' && (
              <Checkbox
                checked={isCompleted}
                onCheckedChange={handleToggleComplete}
                disabled={isCompleted || item.type === 'routine'}
              />
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{time}</span>
              </div>
              <h3 className={cn(
                "font-medium",
                isCompleted && "line-through text-muted-foreground",
                isTimerActiveForThis && "text-primary"
              )}>
                {title}
              </h3>
              <div className="text-xs text-muted-foreground">#{shortId}</div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Task actions */}
              {isTask && !isCompleted && (
                <>
                  <DropdownMenuItem onClick={handleStartTimer}>
                    <TimerIcon className="mr-2 h-4 w-4" />
                    Start Timer
                  </DropdownMenuItem>
                  {onEditTask && (
                    <DropdownMenuItem onClick={() => onEditTask(item.data as StudyTask)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onPushTaskToNextDay && (
                    <DropdownMenuItem onClick={() => onPushTaskToNextDay(item.data.id)}>
                      <SendToBack className="mr-2 h-4 w-4" />
                      Push to Next Day
                    </DropdownMenuItem>
                  )}
                  {variant === 'task-card' && (
                    <>
                      <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                        <Check className="mr-2 h-4 w-4" />
                        Mark Complete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleArchive}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
              
              {/* Routine actions */}
              {isRoutine && !isCompleted && (
                <>
                  {onEditRoutine && (
                    <DropdownMenuItem onClick={() => onEditRoutine(item.data as Routine)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onCompleteRoutine && (
                    <DropdownMenuItem onClick={() => onCompleteRoutine(item.data as Routine)}>
                      <Check className="mr-2 h-4 w-4" />
                      Complete Routine
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setLogDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Log Time
                  </DropdownMenuItem>
                  {onDeleteRoutine && (
                    <DropdownMenuItem onClick={() => setAlertOpen(true)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </>
              )}
              
              {/* Completed item actions */}
              {isCompleted && (
                <>
                  {isTask && onUndoCompleteRoutine && (
                    <DropdownMenuItem onClick={() => onUndoCompleteRoutine(item.data.id)}>
                      <Undo className="mr-2 h-4 w-4" />
                      Undo Complete
                    </DropdownMenuItem>
                  )}
                  {isRoutine && onUndoCompleteRoutine && (
                    <DropdownMenuItem onClick={() => onUndoCompleteRoutine(item.data.id)}>
                      <Undo className="mr-2 h-4 w-4" />
                      Undo Complete
                    </DropdownMenuItem>
                  )}
                  {onDeleteCompleteRoutine && (
                    <DropdownMenuItem onClick={() => onDeleteCompleteRoutine(item.data.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </>
              )}
              
              {/* Task-card specific archived actions */}
              {variant === 'task-card' && item.type === 'task' && (item.data as StudyTask).status === 'archived' && (
                <DropdownMenuItem onClick={handleUnarchive}>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Details section */}
        <div className="mt-3 flex flex-wrap gap-4">
          {isTask && <TaskDetails data={item.data as StudyTask} />}
          {isRoutine && <RoutineDetails data={item.data as Routine} />}
        </div>
        
        {/* Task-card specific additional info */}
        {variant === 'task-card' && isTask && (
          <>
            {(item.data as StudyTask).description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {(item.data as StudyTask).description}
              </p>
            )}
            {subjectDate && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{format(subjectDate, 'MMM d, yyyy')}</span>
              </div>
            )}
          </>
        )}
      </>
    );

    if (variant === 'list') {
      return (
        <div className="flex items-start gap-3 p-3 border-b">
          {commonContent}
        </div>
      );
    }

    return (
      <Card className={cn(
        "transition-all duration-200",
        isTimerActiveForThis && "ring-2 ring-primary",
        isCompleted && "opacity-60"
      )}>
        <CardContent className="p-4">
          {commonContent}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {renderContent()}
      
      {/* Dialogs */}
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Routine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this routine? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {isRoutine && (
        <ManualLogDialog
          isOpen={isLogDialogOpen}
          onOpenChange={setLogDialogOpen}
          item={item.data as Routine}
        />
      )}
      
      {variant === 'task-card' && isTask && (
        <React.Suspense fallback={null}>
          <TimerDialog
            isOpen={isTimerDialogOpen}
            onOpenChange={setIsTimerDialogOpen}
            task={item.data as StudyTask}
            onComplete={() => {
              setIsTimerDialogOpen(false);
              if (onCompleteTask) {
                onCompleteTask(item.data.id);
              }
            }}
          />
        </React.Suspense>
      )}
    </>
  );
};