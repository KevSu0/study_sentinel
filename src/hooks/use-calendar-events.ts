import {useState, useEffect} from 'react';
import {type CalendarEvent} from '../lib/types';

const STORAGE_KEY = 'calendar_events';

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    try {
      const storedEvents = localStorage.getItem(STORAGE_KEY);
      if (storedEvents) {
        setEvents(JSON.parse(storedEvents));
      }
    } catch (error) {
      console.error("Failed to load calendar events from local storage", error);
    }
  }, []);

  const updateEvents = (updatedEvents: CalendarEvent[]) => {
    setEvents(updatedEvents);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
    } catch (error) {
      console.error("Failed to save calendar events to local storage", error);
    }
  };

  const addEvent = (event: Omit<CalendarEvent, 'id'>) => {
    const newEvent = {...event, id: crypto.randomUUID()} as CalendarEvent;
    updateEvents([...events, newEvent]);
  };

  const updateEvent = (updatedEvent: CalendarEvent) => {
    const updatedEvents = events.map(event =>
      event.id === updatedEvent.id ? updatedEvent : event
    );
    updateEvents(updatedEvents);
  };

  const deleteEvent = (eventId: string) => {
    const updatedEvents = events.filter(event => event.id !== eventId);
    updateEvents(updatedEvents);
  };

  return {events, addEvent, updateEvent, deleteEvent};
}