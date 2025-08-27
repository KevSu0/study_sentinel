
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useEffect, useState} from 'react';
import type {StudyTask, Routine} from '@/lib/types';
import {DurationInput} from '@/components/badges/duration-input';
import { useGlobalState } from '@/hooks/use-global-state';
import { Input } from '../ui/input';
import { format, parse } from 'date-fns';

const logSchema = z.object({
  logDate: z.string().min(1, 'Date is required.'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  productiveDuration: z.coerce.number().min(1, 'Productive duration must be at least 1 minute.'),
  breaks: z.coerce.number().min(0, 'Breaks cannot be negative.').default(0),
  notes: z.string().optional(),
}).refine(data => {
    const start = parse(data.startTime, 'HH:mm', new Date());
    const end = parse(data.endTime, 'HH:mm', new Date());
    return end > start;
}, {
    message: "End time must be after start time.",
    path: ["endTime"],
}).refine(data => {
    const start = parse(data.startTime, 'HH:mm', new Date());
    const end = parse(data.endTime, 'HH:mm', new Date());
    const totalDurationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return data.productiveDuration <= totalDurationMinutes;
}, {
    message: "Productive time cannot exceed total session time.",
    path: ["productiveDuration"],
});


type LogFormData = z.infer<typeof logSchema>;

interface ManualLogDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: StudyTask | Routine;
}

export function ManualLogDialog({
  isOpen,
  onOpenChange,
  item,
}: ManualLogDialogProps) {
  const { manuallyCompleteItem } = useGlobalState();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<LogFormData>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      productiveDuration: 30,
      notes: '',
      logDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: format(new Date(), 'HH:mm'),
      endTime: format(new Date(Date.now() + 30 * 60000), 'HH:mm'),
      breaks: 0,
    },
  });
  
  useEffect(() => {
    if (isOpen) {
      const isTask = 'duration' in item;
      const initialDuration = (isTask && typeof item.duration === 'number') ? item.duration : 30;
      const now = new Date();
      const startTime = isTask ? parse(item.time, 'HH:mm', new Date()) : now;
      const endTime = new Date(startTime.getTime() + initialDuration * 60000);

      reset({
        productiveDuration: initialDuration,
        notes: '',
        logDate: isTask ? item.date : format(now, 'yyyy-MM-dd'),
        startTime: format(startTime, 'HH:mm'),
        endTime: format(endTime, 'HH:mm'),
        breaks: 0,
      });
    }
  }, [isOpen, item, reset]);

  const onSubmit = (data: LogFormData) => {
    manuallyCompleteItem(item, data);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Productive Time</DialogTitle>
          <DialogDescription>
            Manually log time for "{item.title}". This will mark it as complete.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="logDate">Date of Session</Label>
            <Input id="logDate" type="date" {...control.register('logDate')} className="mt-1" />
            {errors.logDate && <p className="text-sm text-destructive mt-1">{errors.logDate.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input id="startTime" type="time" {...control.register('startTime')} className="mt-1" />
                  {errors.startTime && <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>}
              </div>
              <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" type="time" {...control.register('endTime')} className="mt-1" />
                  {errors.endTime && <p className="text-sm text-destructive mt-1">{errors.endTime.message}</p>}
              </div>
          </div>
          <div>
            <Label htmlFor="productiveDuration">Productive Duration</Label>
            <Controller
                name="productiveDuration"
                control={control}
                render={({ field }) => (
                    <DurationInput
                        value={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
             {errors.productiveDuration && (
              <p className="text-sm text-destructive mt-1">
                {errors.productiveDuration.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="breaks">Number of Breaks</Label>
            <Input id="breaks" type="number" {...control.register('breaks')} className="mt-1" min="0" />
            {errors.breaks && <p className="text-sm text-destructive mt-1">{errors.breaks.message}</p>}
          </div>
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...control.register('notes')}
              placeholder="What did you work on?"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Log and Complete</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
