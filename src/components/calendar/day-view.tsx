"use client";

import { DndContext, useDroppable } from '@dnd-kit/core';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import { EventItem } from './event-item';
import { format } from 'date-fns';
import { TodoList } from './todo-list';
import { type CalendarEvent } from '@/lib/types';

interface DayViewProps {
    day: Date;
    onEventClick: (event: CalendarEvent) => void;
}

export function DayView({ day, onEventClick }: DayViewProps) {
  const { events, updateEvent } = useCalendarEvents();
  const { setNodeRef } = useDroppable({ id: 'day-view' });

  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const handleDragEnd = (event: any) => {
    const { over, active, delta } = event;
    if (over && over.id === 'day-view') {
      const calendarEvent = active.data.current.event;
      const newTime = new Date(
        new Date(calendarEvent.date).getTime() + delta.y * 60 * 1000
      );
      const newStartTime = format(newTime, 'HH:mm');
      const newEndTime = format(
        new Date(newTime.getTime() + 60 * 60 * 1000),
        'HH:mm'
      );

      updateEvent({
        ...calendarEvent,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    }
  };

  const dayEvents = events.filter(
    (event) => event.date === format(day, 'yyyy-MM-dd')
  );

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4" data-testid="day-view">
        <div className="md:col-span-2">
          <div className="grid grid-cols-[auto_1fr] gap-x-4">
            {/* Time column */}
            <div className="col-start-1">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-16 flex items-center justify-end text-xs text-muted-foreground"
                >
                  {hour}
                </div>
              ))}
            </div>

            {/* Timeline grid */}
            <div className="col-start-2 relative" ref={setNodeRef}>
              {hours.map((hour) => (
                <div key={`grid-${hour}`} className="h-16 border-b">
                  {/* Event blocks will be rendered here */}
                </div>
              ))}
              {dayEvents
                .filter((event) => 'startTime' in event && event.startTime)
                .map((event) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    onUpdate={updateEvent}
                    onClick={onEventClick}
                    gridCellHeight={32}
                  />
                ))}
            </div>
          </div>
        </div>
        <div className="md:col-span-1">
          <TodoList currentDay={day} />
        </div>
      </div>
    </DndContext>
  );
}