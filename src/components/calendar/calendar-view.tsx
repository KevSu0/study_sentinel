"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useTimezonePreference } from "@/hooks/use-timezone-preference";
import { formatWithTimezone } from "@/lib/date-formatting";

type View = "month" | "week" | "day";

import { CalendarEvent } from "@/lib/types";

interface CalendarViewProps {
  currentDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarView({ currentDate, onDateChange, onEventClick }: CalendarViewProps) {
  const [view, setView] = useState<View>("month");
  const { events } = useCalendarEvents();
  const { timezone } = useTimezonePreference();

  const daysWithEvents = useMemo(() => {
    const dates = new Set<string>();
    events.forEach(event => {
      dates.add(event.date);
    });
    return dates;
  }, [events]);

  const renderView = () => {
    switch (view) {
      case "month":
        return (
          <div className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={onDateChange}
              className="rounded-md border"
              modifiers={{
                hasEvents: (date: Date) => {
                  const dateString = format(date, "yyyy-MM-dd");
                  return daysWithEvents.has(dateString);
                },
              }}
              modifiersClassNames={{
                hasEvents: "has-events",
              }}
            />
          </div>
        );
      case "week":
        return <WeekView />;
      case "day":
        return currentDate ? <DayView day={currentDate} onEventClick={onEventClick} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {currentDate ? formatWithTimezone(currentDate, 'MMMM yyyy', timezone) : ''}
          {timezone === 'IST' && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              IST
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant={view === 'month' ? 'default' : 'outline'} onClick={() => setView('month')}>Month</Button>
          <Button variant={view === 'week' ? 'default' : 'outline'} onClick={() => setView('week')}>Week</Button>
          <Button variant={view === 'day' ? 'default' : 'outline'} onClick={() => setView('day')}>Day</Button>
        </div>
      </div>
      <div className="flex-grow">
        {renderView()}
      </div>
    </div>
  );
}