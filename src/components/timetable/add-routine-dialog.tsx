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
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useEffect} from 'react';
import {Routine} from '@/lib/types';
import {cn} from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const routineSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters.'),
    description: z.string().optional(),
    days: z.array(z.number()).min(1, 'You must select at least one day.'),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
}).refine(data => data.startTime < data.endTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
});

type RoutineFormData = z.infer<typeof routineSchema>;

interface AddRoutineDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddRoutine: (routine: Omit<Routine, 'id'>) => void;
  onUpdateRoutine: (routine: Routine) => void;
  routineToEdit?: Routine | null;
}

const daysOfWeek = [
  {id: 1, label: 'Mon'},
  {id: 2, label: 'Tue'},
  {id: 3, label: 'Wed'},
  {id: 4, label: 'Thu'},
  {id: 5, label: 'Fri'},
  {id: 6, label: 'Sat'},
  {id: 0, label: 'Sun'},
];

export function AddRoutineDialog({
  isOpen,
  onOpenChange,
  onAddRoutine,
  onUpdateRoutine,
  routineToEdit,
}: AddRoutineDialogProps) {
  const isEditing = !!routineToEdit;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: {errors},
  } = useForm<RoutineFormData>({
    resolver: zodResolver(routineSchema),
    defaultValues: {
        title: '',
        description: '',
        days: [1, 2, 3, 4, 5],
        startTime: '09:00',
        endTime: '10:00',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditing && routineToEdit) {
        reset({
          title: routineToEdit.title,
          description: routineToEdit.description || '',
          days: routineToEdit.days,
          startTime: routineToEdit.startTime,
          endTime: routineToEdit.endTime,
        });
      } else {
        reset({
            title: '',
            description: '',
            days: [1, 2, 3, 4, 5],
            startTime: '09:00',
            endTime: '10:00',
        });
      }
    }
  }, [isOpen, isEditing, routineToEdit, reset]);

  const onSubmit = (data: RoutineFormData) => {
    if (isEditing && routineToEdit) {
      onUpdateRoutine({ ...routineToEdit, ...data });
      toast({ title: "Routine Updated!" });
    } else {
      onAddRoutine(data);
      toast({ title: "Routine Added!" });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Routine' : 'Add New Routine'}</DialogTitle>
          <DialogDescription>
            Set up a repeating task for your weekly schedule.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} placeholder="e.g., Morning Review" className="mt-1" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...register('description')} placeholder="e.g., Review notes from yesterday's lectures" className="mt-1" />
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
                        className={cn(
                          "block h-10 cursor-pointer rounded-md border flex items-center justify-center text-sm transition-colors hover:bg-accent/50 peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary"
                        )}
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            />
             {errors.days && <p className="text-sm text-destructive mt-1">{errors.days.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="time" {...register('startTime')} className="mt-1" />
              {errors.startTime && <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>}
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="time" {...register('endTime')} className="mt-1" />
              {errors.endTime && <p className="text-sm text-destructive mt-1">{errors.endTime.message}</p>}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{isEditing ? 'Save Changes' : 'Add Routine'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
