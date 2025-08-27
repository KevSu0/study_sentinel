"use client";

import { useState } from 'react';
import { eachDayOfInterval, startOfWeek, endOfWeek, format } from 'date-fns';
import { DndContext, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import { EventItem } from './event-item';
import { CalendarEvent } from '@/lib/types';
import { EventDialog } from './event-dialog';

const GRID_CELL_HEIGHT = 64; // Corresponds to h-16 tailwind class (16 * 4px)

export function WeekView() {
  const { events, updateEvent, addEvent } = useCalendarEvents();
  const { setNodeRef } = useDroppable({ id: 'week-view' });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  const today = new Date();
  const week = eachDayOfInterval({
    start: startOfWeek(today, { weekStartsOn: 1 }), // Monday as the first day
    end: endOfWeek(today, { weekStartsOn: 1 }),
  });

  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    const eventData = active.data.current;

    if (eventData?.type === 'event' && over) {
      const calendarEvent = eventData.event as CalendarEvent;
      
      // Simplified logic for demonstration. A real implementation would need more robust date/time calculation.
      const newDate = over.id.toString().replace('week-view-day-', '');
      
      updateEvent({
        ...calendarEvent,
        date: newDate,
      });
    }
  };

  return (
    <>
      <DndContext onDragEnd={handleDragEnd}>
        <div className="p-4" data-testid="week-view">
          <div className="grid grid-cols-[auto_1fr] gap-x-4">
            {/* Time column */}
            <div className="col-start-1">
              <div className="h-12"></div> {/* Empty cell for alignment */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-16 flex items-center justify-end text-xs text-muted-foreground"
                >
                  {hour}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="col-start-2 grid grid-cols-7" ref={setNodeRef}>
              {week.map((day) => (
                <div key={day.toString()} className="text-center border-b pb-2">
                  <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                  <div className="text-2xl font-bold">{format(day, 'd')}</div>
                </div>
              ))}

              {/* Grid cells for events */}
              {week.map((day) => {
                const dayEvents = events.filter(
                  (event) => event.date === format(day, 'yyyy-MM-dd')
                );
                return (
                  <div
                    key={`grid-${day.toString()}`}
                    className="relative border-r"
                    id={`week-view-day-${format(day, 'yyyy-MM-dd')}`}
                  >
                    {hours.map((hour) => (
                      <div
                        key={`${day.toString()}-${hour}`}
                        className="h-16 border-b"
                      >
                        {/* Event blocks will be rendered here */}
                      </div>
                    ))}
                    {dayEvents.map((event: CalendarEvent) => (
                      <EventItem
                        key={event.id}
                        event={event}
                        onUpdate={updateEvent}
                        onClick={handleEventClick}
                        gridCellHeight={GRID_CELL_HEIGHT / 2} // 30 min slot
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DndContext>
      <EventDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        selectedEvent={selectedEvent}
        addEvent={addEvent}
        updateEvent={updateEvent}
      />
    </>
  );
}