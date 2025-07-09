import React, {useState, lazy, Suspense, memo, useEffect} from 'react';
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
  BrainCircuit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  Calendar,
  Flame,
  Pencil,
  PlayCircle,
  CheckCircle2,
  ChevronDown,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const AnalysisDialog = lazy(() =>
  import('./analysis-dialog').then(module => ({default: module.AnalysisDialog}))
);
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

const TIMER_STORAGE_KEY = 'studySentinelActiveTimer';

export const TaskCard = memo(function TaskCard({
  task,
  onUpdate,
  onArchive,
  onUnarchive,
  onPushToNextDay,
  onEdit,
}: TaskCardProps) {
  const [isAnalysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [isTimerOpen, setTimerOpen] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const {toast} = useToast();

  useEffect(() => {
    const checkTimerStatus = () => {
      const savedTimerRaw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (savedTimerRaw) {
        const savedTimer = JSON.parse(savedTimerRaw);
        setIsTimerActive(savedTimer.taskId === task.id);
      } else {
        setIsTimerActive(false);
      }
    };

    checkTimerStatus();
    const interval = setInterval(checkTimerStatus, 2000); // Check periodically
    window.addEventListener('storage', checkTimerStatus); // Listen for changes in other tabs

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkTimerStatus);
    };
  }, [task.id]);

  const handleStatusChange = (newStatus: TaskStatus) => {
    const oldStatus = task.status;
    if (newStatus === oldStatus) return;

    if (newStatus === 'completed' && oldStatus !== 'completed') {
      toast({
        title: 'Task Completed!',
        description: `You've earned ${task.points} points for this task!`,
      });
    }
    onUpdate({...task, status: newStatus});
  };

  const handleTimerComplete = () => {
    handleStatusChange('completed');
  };

  const handleAnalysisComplete = (analysis: StudyTask['analysis']) => {
    onUpdate({
      ...task,
      analysis,
      progressDescription: task.progressDescription,
    });
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
            : priorityConfig[task.priority]?.className || 'border-transparent'
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
          {task.analysis && (
            <Collapsible>
              <div
                className={cn(
                  'p-3 rounded-md text-sm flex items-start gap-3',
                  task.analysis.error
                    ? 'bg-destructive/10 text-destructive-foreground'
                    : task.analysis.isOnTrack
                    ? 'bg-teal-500/10 text-teal-800'
                    : 'bg-amber-500/10 text-amber-800',
                  'dark:bg-opacity-20 dark:text-white/80'
                )}
              >
                {task.analysis.error ? (
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                ) : task.analysis.isOnTrack ? (
                  <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-teal-500" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                )}
                <div className="flex-1">
                  <CollapsibleTrigger className="flex justify-between items-center w-full text-left font-semibold [&[data-state=open]>svg]:rotate-180">
                    <span>
                      {task.analysis.error
                        ? 'Analysis Error'
                        : task.analysis.isOnTrack
                        ? "Monitor: You're on track!"
                        : 'Monitor: You might be falling behind.'}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 prose prose-sm dark:prose-invert prose-p:my-1">
                    <p>{task.analysis.error || task.analysis.analysis}</p>
                  </CollapsibleContent>
                </div>
              </div>
            </Collapsible>
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
              onClick={() => setAnalysisDialogOpen(true)}
              disabled={task.status === 'completed'}
            >
              <BrainCircuit className="mr-2 h-4 w-4" />
              Analyze
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
            onComplete={handleTimerComplete}
          />
        </Suspense>
      )}
      {isAnalysisDialogOpen && (
        <Suspense fallback={null}>
          <AnalysisDialog
            task={task}
            isOpen={isAnalysisDialogOpen}
            onOpenChange={setAnalysisDialogOpen}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </Suspense>
      )}
    </>
  );
});
