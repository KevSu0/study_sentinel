'use client';

import React, {useState, Suspense, lazy, useMemo} from 'react';
import {
  MoreVertical,
  Timer,
  Pencil,
  Archive,
  SendToBack,
  ArchiveRestore,
} from 'lucide-react';
import {Checkbox} from '@/components/ui/checkbox';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {cn} from '@/lib/utils';
import type {StudyTask} from '@/lib/types';
import {useConfetti} from '@/components/providers/confetti-provider';
import {getPriorityCardStyles, getPriorityTextStyles} from '@/lib/priority-colors';
import toast from 'react-hot-toast';
import {format, parseISO} from 'date-fns';
import {useGlobalState} from '@/hooks/use-global-state';

const TimerDialog = lazy(() =>
  import('./timer-dialog').then(module => ({default: module.TimerDialog}))
);

interface SimpleTaskItemProps {
  task: StudyTask;
  onUpdate: (task: StudyTask) => void;
  onArchive: (taskId: string) => void;
  onUnarchive: (taskId: string) => void;
  onPushToNextDay: (taskId: string) => void;
  onEdit: (task: StudyTask) => void;
}

export const SimpleTaskItem = React.memo(function SimpleTaskItem({
  task,
  onUpdate,
  onArchive,
  onUnarchive,
  onPushToNextDay,
  onEdit,
}: SimpleTaskItemProps) {
  const {state} = useGlobalState();
  const {activeAttempt} = state;
  const isTimerActive =
    activeAttempt?.entityId === task.id;
  const isCompleted = task.status === 'completed';
  const {fire} = useConfetti();
  const [isTimerOpen, setTimerOpen] = useState(false);
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const isOverdue = !isCompleted && task.date < todayStr;

  const handleToggleComplete = () => {
    const newStatus = isCompleted ? 'todo' : 'completed';
    if (newStatus === 'completed') {
      fire();
      toast.success(`Task Completed! You've earned ${task.points} points!`);
    }
    onUpdate({...task, status: newStatus});
  };

  if (task.status === 'archived') {
    return (
      <div className="flex items-center p-2 border-b">
        <p className="flex-1 text-muted-foreground line-through">
          {task.title}
        </p>
        <Button variant="ghost" size="sm" onClick={() => onUnarchive(task.id)}>
          <ArchiveRestore className="h-4 w-4 mr-2" /> Unarchive
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-4 p-3 border rounded-lg transition-colors hover:bg-muted/50',
          getPriorityCardStyles(task.priority),
          isOverdue && 'border-destructive/50 bg-destructive/5',
          isCompleted && 'bg-accent/10',
          isTimerActive && 'ring-2 ring-primary'
        )}
      >
        <Checkbox
          id={`task-${task.id}`}
          checked={isCompleted}
          onCheckedChange={handleToggleComplete}
          aria-label={`Mark task ${task.title} as ${
            isCompleted ? 'incomplete' : 'complete'
          }`}
          className={cn(
            isCompleted &&
              'data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600'
          )}
        />
        <div className="flex-1 grid gap-1">
          <label
            htmlFor={`task-${task.id}`}
            className={cn(
              'font-medium cursor-pointer',
              isCompleted && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </label>
          <p
            className={cn(
              'text-sm text-muted-foreground',
              isOverdue && 'text-destructive'
            )}
          >
            {task.duration} min &bull; {task.points} pts &bull; 
            <span className={getPriorityTextStyles(task.priority)}>
              {task.priority} priority
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimerOpen(true)}
            disabled={isCompleted}
            className="hidden sm:flex"
          >
            {isTimerActive && (
              <span className="relative flex h-3 w-3 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            )}
            <Timer className="mr-2 h-4 w-4" />
            {isTimerActive ? 'View' : 'Timer'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => onEdit(task)}
                disabled={isCompleted}
              >
                <Pencil className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setTimerOpen(true)}
                disabled={isCompleted}
                className="sm:hidden"
              >
                <Timer className="mr-2 h-4 w-4" />
                <span>{isTimerActive ? 'View Timer' : 'Start Timer'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onPushToNextDay(task.id)}>
                <SendToBack className="mr-2 h-4 w-4" />
                <span>Push to Next Day</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onArchive(task.id)}
                className="text-destructive"
              >
                <Archive className="mr-2 h-4 w-4" />
                <span>Archive</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isTimerOpen && (
        <Suspense fallback={null}>
          <TimerDialog
            task={task}
            isOpen={isTimerOpen}
            onOpenChange={setTimerOpen}
            onComplete={() => {}}
          />
        </Suspense>
      )}
    </>
  );
});
