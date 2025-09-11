# Calendar Page

The Calendar page provides a comprehensive and interactive view of the user's scheduled events, tasks, and routines.

### 5.1. Core Functionality

*   **Multiple Views:** Offers month, week, and day views to visualize schedules from different perspectives.
*   **Event Management:** Allows users to create, update, and manage calendar events.
*   **Drag-and-Drop:** Supports drag-and-drop for rescheduling events in the day and week views.

### 5.2. Features & Sub-features

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **View Toggles** | Allows users to switch between month, week, and day views. | - | - [`src/components/calendar/calendar-view.tsx`](src/components/calendar/calendar-view.tsx): `CalendarView` (line 18), `setView` (line 19) |
| **Month View** | Displays a traditional monthly calendar, highlighting days with scheduled events. | - | - [`src/components/calendar/calendar-view.tsx`](src/components/calendar/calendar-view.tsx)<br>- [`src/components/ui/calendar.tsx`](src/components/ui/calendar.tsx): `Calendar` |
| **Week View** | Shows a detailed weekly schedule with events plotted on a timeline. | - **Drag-and-Drop Rescheduling:** Events can be moved to different days. | - [`src/components/calendar/week-view.tsx`](src/components/calendar/week-view.tsx): `WeekView` (line 11), `handleDragEnd` (line 26)<br>- `@dnd-kit/core` (external library) |
| **Day View** | Provides an hourly timeline for a selected day, showing all scheduled events and tasks. | - **Drag-and-Drop Rescheduling:** Events can be moved to different times.<br>- **To-Do List:** Displays a list of tasks for the selected day. | - [`src/components/calendar/day-view.tsx`](src/components/calendar/day-view.tsx): `DayView` (line 9), `handleDragEnd` (line 18)<br>- [`src/components/calendar/todo-list.tsx`](src/components/calendar/todo-list.tsx): `TodoList`<br>- `@dnd-kit/core` (external library) |
| **Event Dialog** | A dialog for creating and editing calendar events. | - **Event Form:** Captures event details such as title, description, start time, and end time. | - [`src/app/calendar/page.tsx`](src/app/calendar/page.tsx)<br>- [`src/components/calendar/event-dialog.tsx`](src/components/calendar/event-dialog.tsx): `EventDialog` (line 25)<br>- [`src/components/calendar/event-form.tsx`](src/components/calendar/event-form.tsx): `EventForm` |

### 5.3. Inter-component and Feature Element References

*   `CalendarView` orchestrates the display of `Month View` (using `Calendar`), `Week View`, and `Day View` based on the `view` state.
*   `WeekView` and `DayView` both utilize `@dnd-kit/core` for drag-and-drop functionality and have their own `handleDragEnd` implementations.
*   `DayView` incorporates `TodoList` to display tasks.
*   `EventDialog` uses `EventForm` for event input.

### 5.4. Impacting and Dependent Factors

*   **Selected View:** The `view` state (month, week, day) directly impacts which calendar component is rendered.
*   **Event Data:** The display of events across all views depends on the availability and structure of event data. This data needs to be efficiently queried and updated.
*   **Drag-and-Drop Logic:** The `handleDragEnd` functions in `WeekView` and `DayView` are crucial for updating event times/dates after a drag operation. This requires careful state management to ensure data consistency.
*   **Form Validation:** `EventForm` likely has validation logic to ensure correct event details (e.g., valid dates, times, non-empty title).

### 5.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **View Management:** A central function or hook (`setView` in [`src/components/calendar/calendar-view.tsx`](src/components/calendar/calendar-view.tsx:19)) should manage the active calendar view, ensuring smooth transitions and proper rendering of the selected view component.
*   **Event Manipulation:** Functions for creating, updating, and deleting events should be robust, handling time zone conversions, data validation, and persistence to a backend or global state. These functions should be atomic and provide clear success/failure feedback.
    *   **Example (Update Event after Drag-and-Drop):**
        ```typescript
        // Ideal: Event update function after drag-and-drop
        async function handleDragEnd(event: DragEndEvent) {
            const { active, over } = event;
            if (active.id !== over?.id) {
                const updatedEvent = { ...active.data.current.event, newTime: over.id }; // Extract new time/date
                try {
                    await updateCalendarEvent(updatedEvent.id, updatedEvent); // Persist change
                    // Update local state to reflect change
                } catch (error) {
                    handleError(error); // Handle persistence errors
                    // Revert UI to original state if update fails
                }
            }
        }
        ```
*   **Drag-and-Drop Handlers:** `handleDragEnd` functions in `WeekView` and `DayView` should be highly optimized to quickly update the UI and persist changes to the backend or global state. They should also include error handling for invalid drops (e.g., dropping an event on an un-droppable area).
*   **Date Utilities:** Micro-functions for date formatting, parsing, and manipulation (e.g., getting the start/end of a week/month, checking for date overlaps) are essential for calendar functionality and should be centralized for consistency.
*   **Form Submission:** The `EventForm`'s submission function should validate input, then call an event creation/update function, and handle success/error states.

### 5.6. Future Enhancements/Considerations

*   **Recurring Events:** Implement support for creating and managing recurring events (daily, weekly, monthly, custom).
*   **Calendar Sync:** Integration with external calendar services (Google Calendar, Outlook Calendar).
*   **Event Reminders:** Advanced notification options for events.
*   **Color-coding Events:** Allow users to color-code events based on type or priority.
*   **Performance Optimization:** For calendars with many events, consider virtualization or lazy loading to maintain smooth performance.