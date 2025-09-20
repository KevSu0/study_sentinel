
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

const logSchema = z.object({
  duration: z.coerce.number().min(1, 'Duration must be at least 1 minute.'),
  notes: z.string().optional(),
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
      duration: 30,
      notes: '',
    },
  });
  
  useEffect(() => {
    if (isOpen) {
      reset({
        duration: ('duration' in item && item.duration) || 30,
        notes: '',
      });
    }
  }, [isOpen, item, reset]);

  const onSubmit = (data: LogFormData) => {
    manuallyCompleteItem(item, data.duration, data.notes);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Productive Time</DialogTitle>
          <DialogDescription>
            Manually log time for &ldquo;{item.title}&rdquo;. This will mark it as complete.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="duration">Duration</Label>
            <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                    <DurationInput
                        value={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
             {errors.duration && (
              <p className="text-sm text-destructive mt-1">
                {errors.duration.message}
              </p>
            )}
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

