'use client';

import React, {useState, lazy, Suspense, useMemo} from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Clock,
  Timer as TimerIcon,
  Award,
  Calendar,
  Flame,
  Pencil,
  MoreHorizontal,
  SendToBack,
  Archive as ArchiveIcon,
  ArchiveRestore,
} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import toast from 'react-hot-toast';
import type {StudyTask, TaskStatus, TaskPriority} from '@/lib/types';
import {format, parseISO, parse} from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {useConfetti} from '@/components/providers/confetti-provider';
import {useGlobalState} from '@/hooks/use-global-state';
import {Checkbox} from '../ui/checkbox';

const TimerDialog = lazy(() =>
  import('./timer-dialog').then(module => ({default: module.TimerDialog}))
);

interface TaskCardProps {
  task: StudyTask;
  onUpdate: (task: StudyTask) => void;
  onArchive: (taskId: string) => void;
  onUnarchive: (taskId: string) => void;
  onPushToNextDay: (taskId: string) => void;
  onEdit: (task: StudyTask) => void;
}

const priorityConfig: Record<
  TaskPriority,
  {
    label: string;
    className: string;
    badgeVariant: 'destructive' | 'secondary' | 'outline';
  }
> = {
  low: {
    label: 'Low',
    className: 'border-sky-400',
    badgeVariant: 'outline',
  },
  medium: {
    label: 'Medium',
    className: 'border-yellow-400',
    badgeVariant: 'secondary',
  },
  high: {
    label: 'High',
    className: 'border-destructive',
    badgeVariant: 'destructive',
  },
};

export const TaskCard = React.memo(function TaskCard({
  task,
  onUpdate,
  onArchive,
  onUnarchive,
  onPushToNextDay,
  onEdit,
}: TaskCardProps) {
  const [isTimerOpen, setTimerOpen] = useState(false);
  const {fire} = useConfetti();
  const {state} = useGlobalState();
  const {activeItem} = state;
  const isTimerActive =
    activeItem?.type === 'task' && activeItem.item.id === task.id;

  const isCompleted = task.status === 'completed';
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const isOverdue = !isCompleted && task.date < todayStr;

  const handleStatusChange = (newStatus: TaskStatus) => {
    const oldStatus = task.status;
    if (newStatus === oldStatus) return;

    if (newStatus === 'completed' && oldStatus !== 'completed') {
      fire();
      toast.success(`Task Completed! You've earned ${task.points} points!`);
    }
    onUpdate({...task, status: newStatus});
  };

  const handleToggleComplete = () => {
    handleStatusChange(isCompleted ? 'todo' : 'completed');
  };

  const formattedDate = format(parseISO(task.date), 'MMM d, yyyy');
  const formattedTime = format(parse(task.time, 'HH:mm', new Date()), 'p');

  if (task.status === 'archived') {
    return (
      <Card className="flex flex-col sm:flex-row items-center justify-between p-4 bg-card/50 border-dashed">
        <div className="flex-grow">
          <p className="font-semibold text-muted-foreground line-through">
            {task.title}
          </p>
          <p className="text-sm text-muted-foreground/80">{formattedDate}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUnarchive(task.id)}
          className="mt-2 sm:mt-0"
        >
          <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
        </Button>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={cn(
          'transition-all duration-300 flex flex-col border-l-4',
          isOverdue
            ? 'border-destructive/70 bg-destructive/5'
            : task.status === 'completed'
            ? 'bg-card/60 dark:bg-card/80 border-accent'
            : priorityConfig[task.priority]?.className || 'border-transparent',
          isTimerActive && 'ring-2 ring-primary'
        )}
      >
        <CardHeader className="flex flex-row items-start gap-4 p-4 pb-2">
          <Checkbox
            id={`card-task-${task.id}`}
            checked={isCompleted}
            onCheckedChange={handleToggleComplete}
            aria-label={`Mark task ${task.title} as ${
              isCompleted ? 'incomplete' : 'complete'
            }`}
            className={cn(
              'mt-1 h-5 w-5',
              isCompleted &&
                'data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600'
            )}
          />
          <div className="flex-1 grid gap-1.5">
            <label
              htmlFor={`card-task-${task.id}`}
              className={cn(
                'text-lg font-semibold leading-none cursor-pointer',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </label>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span
                className={cn(
                  'flex items-center gap-2',
                  isOverdue && 'text-destructive font-semibold'
                )}
              >
                <Calendar className="h-4 w-4" /> {formattedDate}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> {formattedTime} ({task.duration}
                {' min)'}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow py-2 px-4 flex">
          <div className="w-5 mr-4" />
          {task.description && (
            <p
              className={cn(
                'text-sm text-foreground/80 flex-1',
                isCompleted && 'text-muted-foreground'
              )}
            >
              {task.description}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center p-4 pt-2">
          <div className="flex-1 flex items-center justify-start">
            <div className="w-5 mr-4" />
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <Badge variant="secondary" className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-amber-500" />{' '}
                {task.points} pts
              </Badge>
              <Badge
                variant={
                  priorityConfig[task.priority]?.badgeVariant || 'secondary'
                }
                className="capitalize flex items-center gap-1.5"
              >
                <Flame className="h-3.5 w-3.5" />
                {task.priority}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimerOpen(true)}
              disabled={task.status === 'completed'}
            >
              {isTimerActive && (
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
              )}
              <TimerIcon className="mr-2 h-4 w-4" />
              {isTimerActive ? 'View Timer' : 'Start Timer'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="More actions"
                  className="h-9 w-9"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onSelect={() => onEdit(task)}
                  disabled={task.status === 'completed'}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onPushToNextDay(task.id)}>
                  <SendToBack className="mr-2 h-4 w-4" />
                  Push to Next Day
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onArchive(task.id)}
                  className="text-destructive"
                >
                  <ArchiveIcon className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardFooter>
      </Card>
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
