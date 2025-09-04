"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { type CalendarEvent } from "@/lib/types";
import { EventForm, type EventFormData } from "./event-form";

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent?: CalendarEvent | null;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (event: CalendarEvent) => void;
  selectedDate?: Date;
}

export function EventDialog({ isOpen, onClose, selectedEvent, addEvent, updateEvent, selectedDate }: EventDialogProps) {

  const handleSubmit = (values: EventFormData) => {
    const eventData = {
      ...values,
      date: selectedEvent ? selectedEvent.date : format(selectedDate || new Date(), "yyyy-MM-dd"),
    };

    if (selectedEvent) {
      updateEvent({ ...selectedEvent, ...eventData });
    } else {
      addEvent(eventData as Omit<CalendarEvent, 'id'>);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{selectedEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
        </DialogHeader>
        <EventForm
            event={selectedEvent || undefined}
            onSubmit={handleSubmit}
            onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
