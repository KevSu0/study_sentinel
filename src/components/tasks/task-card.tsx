
import React, {useState, lazy, Suspense} from 'react';
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
  PlayCircle,
  CheckCircle2,
  RotateCcw,
  MoreHorizontal,
  SendToBack,
  Archive as ArchiveIcon,
  ArchiveRestore,
} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {useToast} from '@/hooks/use-toast';
import type {StudyTask, TaskStatus, TaskPriority} from '@/lib/types';
import {format, parseISO, parse} from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {useConfetti} from '@/components/providers/confetti-provider';
import { useTasks } from '@/hooks/use-tasks.tsx';

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
  activeItem: ReturnType<typeof useTasks>['activeItem'];
}

const priorityConfig: Record<
  TaskPriority,
  {label: string; className: string; badgeVariant: 'destructive' | 'secondary' | 'outline'}
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


export function TaskCard({
  task,
  onUpdate,
  onArchive,
  onUnarchive,
  onPushToNextDay,
  onEdit,
  activeItem,
}: TaskCardProps) {
  const [isTimerOpen, setTimerOpen] = useState(false);
  const {toast} = useToast();
  const {fire} = useConfetti();
  const isTimerActive = activeItem?.type === 'task' && activeItem.item.id === task.id;

  const handleStatusChange = (newStatus: TaskStatus) => {
    const oldStatus = task.status;
    if (newStatus === oldStatus) return;

    if (newStatus === 'completed' && oldStatus !== 'completed') {
      fire();
      toast({
        title: 'Task Completed!',
        description: `You've earned ${task.points} points for this task!`,
      });
    }
    onUpdate({...task, status: newStatus});
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

  const renderStatusControl = () => {
    switch (task.status) {
      case 'todo':
        return (
          <Button size="sm" onClick={() => handleStatusChange('in_progress')}>
            <PlayCircle className="mr-2" />
            Start Task
          </Button>
        );
      case 'in_progress':
        return (
          <Button
            size="sm"
            variant="outline"
            className="border-accent text-accent hover:bg-accent/10 hover:text-accent"
            onClick={() => handleStatusChange('completed')}
          >
            <CheckCircle2 className="mr-2" />
            Mark as Complete
          </Button>
        );
      case 'completed':
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleStatusChange('in_progress')}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Undo Complete
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card
        className={cn(
          'transition-all duration-300 flex flex-col border-l-4',
          task.status !== 'completed' &&
            task.date < format(new Date(), 'yyyy-MM-dd')
            ? 'border-destructive/70'
            : task.status === 'completed'
            ? 'bg-card/60 dark:bg-card/80 border-accent'
            : priorityConfig[task.priority]?.className || 'border-transparent',
            isTimerActive && 'ring-2 ring-primary'
        )}
      >
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="flex-grow">
              <CardTitle className="text-lg font-semibold">{task.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> {formattedDate}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> {formattedTime} ({task.duration}
                  {' '}min)
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
              {renderStatusControl()}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow pb-4 space-y-4">
          {task.description && (
            <p className="text-sm text-foreground/80">{task.description}</p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-amber-500" /> {task.points} pts
            </Badge>
            <Badge
              variant={priorityConfig[task.priority]?.badgeVariant || 'secondary'}
              className="capitalize flex items-center gap-1.5"
            >
              <Flame className="h-3.5 w-3.5" />
              {task.priority}
            </Badge>
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                </span>
              )}
              <TimerIcon className="mr-2 h-4 w-4" />
              {isTimerActive ? 'View Timer' : 'Start Timer'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(task)}
              disabled={task.status === 'completed'}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
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
}
