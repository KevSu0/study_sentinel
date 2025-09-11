# Plan: Integrated Study Calendar & Daily Planner (Phase 1)

This document outlines the step-by-step implementation plan for creating the Integrated Study Calendar feature.

---

### **Phase 1: Project Setup & Core Structure**

#### **1.1: Create New Page and Route for the Calendar**

*   **Action:** Create a new file to serve as the main page for the calendar feature.
*   **Location:** `src/app/calendar/page.tsx`
*   **Expected Change:** Create a new file with the following content:

```tsx
// src/app/calendar/page.tsx
"use client";

import {CalendarView} from "@/components/calendar/calendar-view";

export default function CalendarPage() {
  return (
    <div className="flex flex-col h-full">
      <CalendarView />
    </div>
  );
}
```

---

#### **1.2: Add Navigation Link to Bottom Nav**

*   **Action:** Add a new link to the main navigation bar to make the calendar page accessible.
*   **Location:** `src/components/bottom-nav.tsx`
*   **Expected Change:**

```diff
<<<<<<< SEARCH
import {
  LayoutDashboard,
  TrendingUp,
  ClipboardList,
  MessageCircle,
} from 'lucide-react';

const menuItems = [
  {href: '/', label: 'Dashboard', icon: LayoutDashboard},
  {href: '/plans', label: 'Plans', icon: ClipboardList},
  {href: '/chat', label: 'AI Coach', icon: MessageCircle},
  {href: '/stats', label: 'Stats', icon: TrendingUp},
];
=======
import {
  Calendar,
  LayoutDashboard,
  TrendingUp,
  ClipboardList,
  MessageCircle,
} from 'lucide-react';

const menuItems = [
  {href: '/', label: 'Dashboard', icon: LayoutDashboard},
  {href: '/plans', label: 'Plans', icon: ClipboardList},
  {href: '/calendar', label: 'Calendar', icon: Calendar},
  {href: '/chat', label: 'AI Coach', icon: MessageCircle},
  {href: '/stats', label: 'Stats', icon: TrendingUp},
];
>>>>>>> REPLACE
```

---

#### **1.3: Define Calendar Event Data Structures**

*   **Action:** Define the necessary types for the different calendar events.
*   **Location:** `src/lib/types.ts`
*   **Expected Change:** Append the following types to the end of the file.

```ts
// src/lib/types.ts

// ... (existing types)

export type CalendarEventType = 'study_block' | 'personal_event' | 'milestone';

export interface BaseCalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  date: string; // YYYY-MM-DD
}

export interface StudyBlock extends BaseCalendarEvent {
  type: 'study_block';
  notes?: string;
  materials?: string; // URL or text note
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isCompleted?: boolean;
}

export interface PersonalEvent extends BaseCalendarEvent {
  type: 'personal_event';
  notes?: string;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isCompleted?: boolean;
}

export interface Milestone extends BaseCalendarEvent {
  type: 'milestone';
}

export type CalendarEvent = StudyBlock | PersonalEvent | Milestone;
```

---

#### **1.4: Create Custom Hook for Event Management**

*   **Action:** Create a new custom hook to manage creating, reading, updating, and deleting calendar events from local storage.
*   **Location:** `src/hooks/use-calendar-events.ts`
*   **Expected Change:** Create a new file with the following content:

```tsx
// src/hooks/use-calendar-events.ts
import {useState, useEffect} from 'react';
import {CalendarEvent} from '@/lib/types';

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
```

---

### **Phase 2, 3, & 4: Component Implementation**

The remaining phases involve creating new components. The subordinate AI will create these files with placeholder content, and we will iterate on them in subsequent steps.

*   `src/components/calendar/calendar-view.tsx`
*   `src/components/calendar/week-view.tsx`
*   `src/components/calendar/day-view.tsx`
*   `src/components/calendar/event-dialog.tsx`
*   `src/components/calendar/todo-list.tsx`

This structured plan provides a clear path forward for implementation.