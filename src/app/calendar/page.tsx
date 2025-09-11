
"use client";

import { useState } from "react";
import { CalendarView } from "@/components/calendar/calendar-view";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EventDialog } from "@/components/calendar/event-dialog";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { CalendarEvent } from "@/lib/types";

export default function CalendarPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | undefined>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const { addEvent, updateEvent } = useCalendarEvents();

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <CalendarView
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onEventClick={handleEventClick}
      />
      <Button
        className="absolute bottom-28 right-4 md:right-8 md:bottom-8 h-16 w-16 rounded-full shadow-lg"
        onClick={() => setIsDialogOpen(true)}
        aria-label="Add event"
      >
        <Plus className="h-8 w-8" />
      </Button>
      <EventDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        addEvent={addEvent}
        updateEvent={updateEvent}
        selectedEvent={selectedEvent}
        selectedDate={currentDate}
      />
    </div>
  );
}
