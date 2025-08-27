
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/use-media-query';
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
import type {StudyTask, TaskPriority, TaskTimerType, Routine} from '@/lib/types';
import {useEffect, useState} from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Timer, Infinity as InfinityIcon, ClipboardList, CheckSquare, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const taskSchema = z.object({
  title: z.string().min(3, 'Task title must be at least 3 characters.'),
  description: z.string().optional(),
  date: z.string(),
  time: z.string(),
  duration: z.coerce.number().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  timerType: z.enum(['countdown', 'infinity']),
}).refine(data => {
    if (data.timerType === 'countdown') {
        return data.duration !== undefined && data.duration >= 1;
    }
    return true;
}, {
    message: "Duration is required for countdown timers.",
    path: ["duration"],
});

const routineSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters.'),
    description: z.string().optional(),
    days: z.array(z.number()).min(1, 'You must select at least one day.'),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
    priority: z.enum(['low', 'medium', 'high']),
}).refine(data => data.startTime < data.endTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
});


type TaskFormData = z.infer<typeof taskSchema>;
type RoutineFormData = z.infer<typeof routineSchema>;

interface AddItemDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddTask: (task: Omit<StudyTask, 'id' | 'status'>) => void;
  onUpdateTask: (task: StudyTask) => void;
  onAddRoutine: (routine: Omit<Routine, 'id'>) => void;
  onUpdateRoutine: (routine: Routine) => void;
  editingItem?: StudyTask | Routine | null;
  itemType?: 'task' | 'routine';
  selectedDate?: Date;
}

const generateDurationOptions = () => {
  const options: {value: number; label: string}[] = [];
  const formatLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  for (let i = 5; i <= 120; i += 5) options.push({value: i, label: formatLabel(i)});
  for (let i = 135; i <= 240; i += 15) options.push({value: i, label: formatLabel(i)});
  for (let i = 270; i <= 480; i += 30) options.push({value: i, label: formatLabel(i)});
  return options;
};

const generateTimeOptions = () => {
  const options: {value: string; label: string}[] = [];
  for (let i = 0; i < 24 * 4; i++) {
    const hours = Math.floor(i / 4);
    const minutes = (i % 4) * 15;
    const date = new Date(2000, 0, 1, hours, minutes);
    options.push({
      value: format(date, 'HH:mm'),
      label: format(date, 'p'),
    });
  }
  return options;
};

const durationOptions = generateDurationOptions();
const timeOptions = generateTimeOptions();

const priorityOptions: {value: TaskPriority; label: string}[] = [
  {value: 'low', label: 'Low'},
  {value: 'medium', label: 'Medium'},
  {value: 'high', label: 'High'},
];

const daysOfWeek = [
  {id: 1, label: 'Mon'}, {id: 2, label: 'Tue'}, {id: 3, label: 'Wed'},
  {id: 4, label: 'Thu'}, {id: 5, label: 'Fri'}, {id: 6, label: 'Sat'}, {id: 0, label: 'Sun'},
];

const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };

const calculatePoints = (duration: number = 0, priority: TaskPriority) => {
  if (duration === 0) return 10;
  return Math.round(duration * priorityMultipliers[priority]);
};

function TaskForm({ onSubmit, onCancel, editingItem, selectedDate }: { onSubmit: (data: TaskFormData) => void; onCancel: () => void; editingItem?: StudyTask | null, selectedDate?: Date}) {
  const now = new Date();
  const roundedMinutes = Math.round(now.getMinutes() / 15) * 15;
  const roundedDate = new Date( now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), roundedMinutes);
  const defaultTime = format(roundedDate, 'HH:mm');

  const { register, handleSubmit, control, reset, watch, formState: {errors} } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
      time: defaultTime,
      duration: 30,
      priority: 'medium',
      title: '',
      description: '',
      timerType: 'countdown'
    },
  });

  const timerType = watch('timerType');
  const duration = watch('duration');
  const priority = watch('priority');

  const displayedPoints = timerType === 'countdown' ? calculatePoints(duration, priority) : 0;

  useEffect(() => {
    if (editingItem) {
      reset({
        title: editingItem.title,
        description: editingItem.description || '',
        date: editingItem.date,
        time: editingItem.time,
        duration: editingItem.duration || 30,
        priority: editingItem.priority,
        timerType: editingItem.timerType || 'countdown',
      });
    } else {
       reset({
        date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
        time: defaultTime,
        duration: 30,
        priority: 'medium',
        title: '',
        description: '',
        timerType: 'countdown'
      });
    }
  }, [editingItem, reset, selectedDate, defaultTime]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-1">
      <div>
        <Label htmlFor="title">Task Title</Label>
        <Input id="title" {...register('title')} placeholder="e.g., Review Chapter 5" className="mt-1" />
        {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
      </div>
      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea id="description" {...register('description')} placeholder="e.g., Focus on ionic bonds" className="mt-1" />
      </div>
       <div>
        <Label>Timer Type</Label>
        <Controller
            name="timerType"
            control={control}
            render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button type="button" variant={field.value === 'countdown' ? 'default' : 'outline'} onClick={() => field.onChange('countdown')}>
                        <Timer className="mr-2 h-4 w-4" /> Countdown
                    </Button>
                    <Button type="button" variant={field.value === 'infinity' ? 'default' : 'outline'} onClick={() => field.onChange('infinity')}>
                        <InfinityIcon className="mr-2 h-4 w-4" /> Infinity
                    </Button>
                </div>
            )}
        />
       </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register('date')} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="time">Time</Label>
          <Controller name="time" control={control} render={({field}) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger id="time" className="mt-1"><SelectValue placeholder="Select time" /></SelectTrigger>
              <SelectContent>
                {timeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </div>
      </div>
        <div className={cn("grid gap-4", timerType === 'countdown' ? 'grid-cols-2' : 'grid-cols-1')}>
            <div className={cn("transition-opacity", timerType === 'infinity' ? 'opacity-50 pointer-events-none' : 'opacity-100')}>
              <Label htmlFor="duration">Duration</Label>
              <Controller name="duration" control={control} render={({field}) => (
                <Select onValueChange={value => field.onChange(Number(value))} defaultValue={String(field.value)} disabled={timerType === 'infinity'}>
                  <SelectTrigger id="duration" className="mt-1"><SelectValue placeholder="Select duration" /></SelectTrigger>
                  <SelectContent>
                    {durationOptions.map(option => (
                      <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {errors.duration && <p className="text-sm text-destructive mt-1">{errors.duration.message}</p>}
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Controller name="priority" control={control} render={({field}) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="priority" className="mt-1"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
        </div>
        {timerType === 'countdown' && (
          <div className="flex items-center justify-center text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
            <Award className="h-4 w-4 mr-2 text-amber-500" />
            <span>This task is worth approximately <strong className="text-foreground">{displayedPoints}</strong> points.</span>
          </div>
        )}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="w-full" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="w-full">{editingItem ? 'Save Changes' : 'Add Task'}</Button>
      </div>
    </form>
  );
}

function RoutineForm({ onSubmit, onCancel, editingItem }: { onSubmit: (data: RoutineFormData) => void; onCancel: () => void; editingItem?: Routine | null }) {
    const { register, handleSubmit, control, reset } = useForm<RoutineFormData>({
    resolver: zodResolver(routineSchema),
    defaultValues: {
        title: '',
        description: '',
        days: [1, 2, 3, 4, 5],
        startTime: '09:00',
        endTime: '10:00',
        priority: 'medium',
    },
  });

  useEffect(() => {
    if (editingItem) {
      reset({ ...editingItem, description: editingItem.description || '' });
    } else {
      reset({
          title: '', description: '', days: [1, 2, 3, 4, 5],
          startTime: '09:00', endTime: '10:00', priority: 'medium',
      });
    }
  }, [editingItem, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-1">
       <div>
            <Label htmlFor="routine_title">Title</Label>
            <Input id="routine_title" {...register('title')} placeholder="e.g., Morning Review" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="routine_description">Description (Optional)</Label>
            <Textarea id="routine_description" {...register('description')} placeholder="e.g., Review notes from yesterday's lectures" className="mt-1" />
          </div>
          <div className="space-y-2">
            <Label>Repeat on</Label>
            <Controller
              name="days"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-7 gap-1">
                  {daysOfWeek.map(day => (
                    <div key={day.id}>
                      <input
                        type="checkbox"
                        id={`day-${day.id}`}
                        checked={field.value?.includes(day.id)}
                        onChange={(e) => {
                          const newDays = e.target.checked
                            ? [...(field.value || []), day.id]
                            : (field.value || []).filter(d => d !== day.id);
                          field.onChange(newDays);
                        }}
                        className="sr-only peer"
                      />
                      <Label
                        htmlFor={`day-${day.id}`}
                        className={cn("block h-9 sm:h-10 cursor-pointer rounded-md border flex items-center justify-center text-sm transition-colors hover:bg-accent/50 peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary")}
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="time" {...register('startTime')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="time" {...register('endTime')} className="mt-1" />
            </div>
          </div>
           <div>
              <Label htmlFor="priority">Priority</Label>
              <Controller name="priority" control={control} render={({field}) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="priority" className="mt-1"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
        <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="w-full" onClick={onCancel}>Cancel</Button>
            <Button type="submit" className="w-full">{editingItem ? 'Save Changes' : 'Add Routine'}</Button>
        </div>
    </form>
  );
}

export function AddItemDialog({ isOpen, onOpenChange, onAddTask, onUpdateTask, onAddRoutine, onUpdateRoutine, editingItem, itemType, selectedDate }: AddItemDialogProps) {
  const [open, setOpen] = useState(isOpen);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [activeTab, setActiveTab] = useState(itemType || 'task');

  const isEditing = !!editingItem;
  const editingTask = isEditing && 'status' in editingItem ? editingItem : null;
  const editingRoutine = isEditing && !('status' in editingItem) ? editingItem : null;
  
  useEffect(() => {
    setOpen(isOpen);
    if(isOpen) {
        setActiveTab(itemType || 'task')
    }
  }, [isOpen, itemType]);

  const handleOpenChange = (newOpenState: boolean) => {
    setOpen(newOpenState);
    onOpenChange(newOpenState);
  };
  
  const onTaskSubmit = (data: TaskFormData) => {
    const points = calculatePoints(data.duration, data.priority);
    const finalData = { ...data, points, duration: data.timerType === 'infinity' ? undefined : data.duration };
    if (editingTask) {
      onUpdateTask({ ...editingTask, ...finalData });
    } else {
      const shortId = Math.random().toString(36).substring(2, 8);
      onAddTask({ ...finalData, shortId });
    }
    handleOpenChange(false);
  };

  const onRoutineSubmit = (data: RoutineFormData) => {
    if (editingRoutine) {
      onUpdateRoutine({ ...editingRoutine, ...data });
    } else {
      const newRoutine = {
        ...data,
        shortId: Math.random().toString(36).substring(2, 8),
      };
      onAddRoutine(newRoutine);
    }
    handleOpenChange(false);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'task' | 'routine');
  };
  
  const title = isEditing ? `Edit ${activeTab === 'task' ? 'Task' : 'Routine'}` : 'Add New Item';
  const description = isEditing 
    ? `Update the details for your ${activeTab}.` 
    : 'Plan your study session or recurring routine.';

  const content = (
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {!isEditing && (
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="task">
                    <CheckSquare className="mr-2 h-4 w-4" /> Task
                </TabsTrigger>
                <TabsTrigger value="routine">
                    <ClipboardList className="mr-2 h-4 w-4" /> Routine
                </TabsTrigger>
            </TabsList>
          )}
          <TabsContent value="task">
             <TaskForm onSubmit={onTaskSubmit} onCancel={() => handleOpenChange(false)} editingItem={editingTask} selectedDate={selectedDate}/>
          </TabsContent>
          <TabsContent value="routine">
             <RoutineForm onSubmit={onRoutineSubmit} onCancel={() => handleOpenChange(false)} editingItem={editingRoutine} />
          </TabsContent>
      </Tabs>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DrawerHeader>
        <ScrollArea className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
            <div className="px-4 pb-4">
              {content}
            </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
