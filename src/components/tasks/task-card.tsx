import {useState} from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Trash2,
  BrainCircuit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  Calendar,
  Flame,
  Pencil,
} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {AnalysisDialog} from './analysis-dialog';
import {cn} from '@/lib/utils';
import {useToast} from '@/hooks/use-toast';
import type {StudyTask, TaskStatus, TaskPriority} from '@/lib/types';
import {format, parseISO} from 'date-fns';

interface TaskCardProps {
  task: StudyTask;
  onUpdate: (task: StudyTask) => void;
  onDelete: (taskId: string) => void;
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

export function TaskCard({task, onUpdate, onDelete, onEdit}: TaskCardProps) {
  const [isAnalysisOpen, setAnalysisOpen] = useState(false);
  const {toast} = useToast();

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

  const handleAnalysisComplete = (analysis: StudyTask['analysis']) => {
    onUpdate({
      ...task,
      analysis,
      progressDescription: task.progressDescription,
    });
  };

  const formattedDate = format(parseISO(task.date), 'MMM d, yyyy');

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
                  <Clock className="h-4 w-4" /> {task.time} ({task.duration}{' '}
                  min)
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow pb-4">
          {task.description && (
            <p className="text-sm text-foreground/80 mb-4">
              {task.description}
            </p>
          )}
          {task.analysis && (
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
                <p className="font-semibold">
                  {task.analysis.error
                    ? 'Analysis Error'
                    : task.analysis.isOnTrack
                    ? "Monitor: You're on track!"
                    : 'Monitor: You might be falling behind.'}
                </p>
                <p className="mt-1">
                  {task.analysis.error || task.analysis.analysis}
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnalysisOpen(true)}
              disabled={task.status === 'completed'}
            >
              <BrainCircuit className="mr-2 h-4 w-4" />
              Analyze <span className="hidden sm:inline">Progress</span>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </CardFooter>
      </Card>
      {isAnalysisOpen && (
        <AnalysisDialog
          task={task}
          isOpen={isAnalysisOpen}
          onOpenChange={setAnalysisOpen}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}
    </>
  );
}
