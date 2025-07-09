import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {format} from 'date-fns';
import type {StudyTask, TaskPriority} from '@/lib/types';

const taskSchema = z.object({
  title: z.string().min(3, 'Task title must be at least 3 characters.'),
  description: z.string().optional(),
  date: z.string(),
  time: z.string(),
  duration: z.coerce.number().min(1, 'Duration is required.'),
  priority: z.enum(['low', 'medium', 'high']),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface AddTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddTask: (task: Omit<StudyTask, 'id' | 'status'>) => void;
}

const durationOptions = [
  {value: 15, label: '15 minutes'},
  {value: 30, label: '30 minutes'},
  {value: 45, label: '45 minutes'},
  {value: 60, label: '1 hour'},
  {value: 90, label: '1.5 hours'},
  {value: 120, label: '2 hours'},
];

const priorityOptions: {value: TaskPriority; label: string}[] = [
  {value: 'low', label: 'Low'},
  {value: 'medium', label: 'Medium'},
  {value: 'high', label: 'High'},
];

const timeOptions = Array.from({length: 24 * 4}, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0'
  )}`;
});

// Simple point system: 1 point per minute of study
const calculatePoints = (duration: number) => duration;

export function AddTaskDialog({
  isOpen,
  onOpenChange,
  onAddTask,
}: AddTaskDialogProps) {
  const now = new Date();
  const roundedMinutes = Math.round(now.getMinutes() / 15) * 15;
  const roundedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), roundedMinutes);
  const defaultTime = format(roundedDate, 'HH:mm');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: {errors},
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      time: defaultTime,
      duration: 30,
      priority: 'medium',
    },
  });

  const onSubmit = (data: TaskFormData) => {
    onAddTask({
      ...data,
      points: calculatePoints(data.duration),
    });
    reset({
      date: format(new Date(), 'yyyy-MM-dd'),
      time: defaultTime,
      duration: 30,
      title: '',
      description: '',
      priority: 'medium',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add a New Study Task</DialogTitle>
          <DialogDescription>
            Plan your study session. A well-planned task is halfway done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="e.g., Review Chapter 5"
              className="mt-1"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">
                {errors.title.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="e.g., Focus on ionic bonds and practice problems."
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
                className="mt-1"
              />
              {errors.date && (
                <p className="text-sm text-destructive mt-1">
                  {errors.date.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Controller
                name="time"
                control={control}
                render={({field}) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger id="time" className="mt-1">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.time && (
                <p className="text-sm text-destructive mt-1">
                  {errors.time.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Controller
                name="duration"
                control={control}
                render={({field}) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={String(field.value)}
                  >
                    <SelectTrigger id="duration" className="mt-1">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map(option => (
                        <SelectItem
                          key={option.value}
                          value={String(option.value)}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.duration && (
                <p className="text-sm text-destructive mt-1">
                  {errors.duration.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({field}) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger id="priority" className="mt-1">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.priority && (
                <p className="text-sm text-destructive mt-1">
                  {errors.priority.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
