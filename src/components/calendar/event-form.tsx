
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { type CalendarEvent } from "@/lib/types";
import { useEffect } from "react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  materials: z.string().optional(),
  type: z.enum(['study_block', 'personal_event', 'milestone']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export type EventFormData = z.infer<typeof formSchema>;

interface EventFormProps {
    event?: CalendarEvent;
    onSubmit: (data: EventFormData) => void;
    onCancel: () => void;
}

export function EventForm({ event, onSubmit, onCancel }: EventFormProps) {
  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event?.title || "",
      notes: (event as any)?.notes || "",
      materials: (event as any)?.materials || "",
      type: event?.type || 'study_block',
      startTime: (event as any)?.startTime || "",
      endTime: (event as any)?.endTime || "",
    }
  });

  useEffect(() => {
    reset({
        title: event?.title || "",
        notes: (event as any)?.notes || "",
        materials: (event as any)?.materials || "",
        type: event?.type || 'study_block',
        startTime: (event as any)?.startTime || "",
        endTime: (event as any)?.endTime || "",
    });
  }, [event, reset]);


  const eventType = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="type">Event Type</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="study_block">Study Block</SelectItem>
                <SelectItem value="personal_event">Personal Event</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" placeholder="e.g., Physics Chapter 3" {...register("title")} />
        {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
      </div>

      {(eventType === 'study_block' || eventType === 'personal_event') && (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input id="startTime" type="time" {...register("startTime")} />
                {errors.startTime && <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>}
            </div>
            <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input id="endTime" type="time" {...register("endTime")} />
                {errors.endTime && <p className="text-sm text-destructive mt-1">{errors.endTime.message}</p>}
            </div>
        </div>
      )}

      {eventType === "study_block" && (
        <>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Add some notes..." {...register("notes")} />
            {errors.notes && <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>}
          </div>
          <div>
            <Label htmlFor="materials">Study Materials (URL or text)</Label>
            <Input id="materials" placeholder="https://example.com" {...register("materials")} />
            {errors.materials && <p className="text-sm text-destructive mt-1">{errors.materials.message}</p>}
          </div>
        </>
      )}

      {eventType === "personal_event" && (
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" placeholder="Add some notes..." {...register("notes")} />
          {errors.notes && <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>}
        </div>
      )}
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
