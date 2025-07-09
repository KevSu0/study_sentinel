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
} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {AnalysisDialog} from './analysis-dialog';
import {cn} from '@/lib/utils';
import type {StudyTask, TaskStatus} from '@/lib/types';

interface TaskCardProps {
  task: StudyTask;
  onUpdate: (task: StudyTask) => void;
  onDelete: (taskId: string) => void;
}

const statusConfig = {
  todo: {label: 'To Do', color: 'bg-gray-500'},
  in_progress: {label: 'In Progress', color: 'bg-blue-500'},
  completed: {label: 'Completed', color: 'bg-accent'},
};

export function TaskCard({task, onUpdate, onDelete}: TaskCardProps) {
  const [isAnalysisOpen, setAnalysisOpen] = useState(false);

  const handleStatusChange = (status: TaskStatus) => {
    onUpdate({...task, status});
  };

  const handleAnalysisComplete = (analysis: StudyTask['analysis']) => {
    onUpdate({...task, analysis});
  };

  return (
    <>
      <Card
        className={cn(
          'transition-all duration-300',
          task.status === 'completed' && 'border-l-4 border-accent'
        )}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-semibold">
                {task.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Clock className="h-4 w-4" />
                <span>{task.time}</span>
              </CardDescription>
            </div>
            <Select value={task.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        {task.analysis && (
          <CardContent>
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
          </CardContent>
        )}
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnalysisOpen(true)}
          >
            <BrainCircuit className="mr-2 h-4 w-4" />
            Analyze Progress
          </Button>
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
      <AnalysisDialog
        task={task}
        isOpen={isAnalysisOpen}
        onOpenChange={setAnalysisOpen}
        onAnalysisComplete={handleAnalysisComplete}
      />
    </>
  );
}
