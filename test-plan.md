# Test Plan

This document outlines the testing strategy for the application, based on the feature documentation provided in `documentation/feature-list/`.

## 1. Deprecated Pages

-   **`lets-start.md`**:
    -   **E2E Test**:
        -   Verify that navigating to `/lets-start` redirects to `/`.
-   **`tasks.md`**:
    -   **E2E Test**:
        -   Verify that navigating to `/tasks` redirects to `/plans`.
-   **`timetable.md`**:
    -   **E2E Test**:
        -   Verify that navigating to `/timetable` redirects to `/plans`.

## 2. Core Features

### 2.1. Archive Page

-   **Unit Tests**:
    -   Test the `unarchiveTask`, `pushTaskToNextDay`, and `updateTask` functions to ensure they correctly modify the task's state.
-   **Integration Tests**:
    -   Verify that the `TaskList` component correctly renders a list of archived tasks.
    -   Test that the `EmptyState` component is displayed when there are no archived tasks.
-   **E2E Tests**:
    -   Simulate a user archiving a task and verify that it appears on the Archive page.
    -   Test the "Unarchive" functionality to ensure that the task is moved back to its original state.

### 2.2. Badges Page

-   **Unit Tests**:
    -   Test the `badgeSchema` and `conditionSchema` to ensure they correctly validate badge data.
    -   Test the `createBadge`, `updateBadge`, and `deleteBadge` functions to ensure they correctly modify the badge's state.
-   **Integration Tests**:
    -   Verify that the `BadgeGrid` component correctly renders a list of badges.
    -   Test the `BadgeDialog` component to ensure it correctly handles form submission and validation.
-   **E2E Tests**:
    -   Simulate a user creating a new badge and verify that it appears on the Badges page.
    -   Test the "Edit" and "Delete" functionality to ensure that the badge is correctly updated or removed.

### 2.3. AI Daily Briefing Page

-   **Unit Tests**:
    -   Test the `getDailySummary` function to ensure it correctly fetches and processes the data required for the AI briefing.
-   **Integration Tests**:
    -   Verify that the `Briefing Display` component correctly renders the AI-generated content.
    -   Test that the `EmptyState` component is displayed when there is no activity from the previous day.
-   **E2E Tests**:
    -   Simulate a user with previous day's activity and verify that the briefing is generated and displayed correctly.
    -   Simulate a user with no activity and verify that the `EmptyState` component is displayed.

### 2.4. Calendar Page

-   **Unit Tests**:
    -   Test the `handleDragEnd` functions in `WeekView` and `DayView` to ensure they correctly update the event's time/date.
-   **Integration Tests**:
    -   Verify that the `CalendarView` component correctly renders the `Month View`, `Week View`, and `Day View`.
    -   Test the `EventDialog` component to ensure it correctly handles form submission and validation.
-   **E2E Tests**:
    -   Simulate a user creating a new event and verify that it appears on the calendar.
    -   Test the drag-and-drop functionality to ensure that the event is correctly rescheduled.

### 2.5. AI Chat Page

-   **Unit Tests**:
    -   Test the `getChatbotResponse` function to ensure it correctly fetches and processes the data required for the AI response.
-   **Integration Tests**:
    -   Verify that the `Message Display` component correctly renders the conversation history.
    -   Test the `Message Input` component to ensure it correctly handles message submission.
-   **E2E Tests**:
    -   Simulate a user sending a message and verify that the chatbot responds correctly.
    -   Test the "Clear History" functionality to ensure that the chat history is cleared.

### 2.6. Dashboard Page

-   **Unit Tests**:
    -   Test the `handleDragEnd` function to ensure it correctly reorders the widgets.
-   **Integration Tests**:
    -   Verify that the `Widget Container` component correctly renders the dashboard widgets.
    -   Test the `AddItemDialog` component to ensure it correctly handles form submission and validation.
-   **E2E Tests**:
    -   Simulate a user rearranging the widgets and verify that the layout is saved.
    -   Test the "Add Item" functionality to ensure that a new task or routine is created.

### 2.7. Logs Page

-   **Unit Tests**:
    -   Test the `getIconForLogType` function to ensure it returns the correct icon for each log type.
-   **Integration Tests**:
    -   Verify that the `Log List` component correctly renders a list of log entries.
    -   Test that the `EmptyState` component is displayed when there is no activity to show.
-   **E2E Tests**:
    -   Simulate a user performing an action and verify that a new log entry is created and displayed on the Logs page.

### 2.8. Plans Page

-   **Unit Tests**:
    -   Test the `handleUndoCompleteRoutine` and `handleHardUndo` functions to ensure they correctly revert or remove completion logs.
-   **Integration Tests**:
    -   Verify that the `Upcoming Items`, `Overdue Tasks`, and `Completed Items` sections are correctly rendered.
    -   Test the `AddItemDialog` component to ensure it correctly handles form submission and validation.
-   **E2E Tests**:
    -   Simulate a user creating a new task and verify that it appears in the "Upcoming Items" section.
    -   Test the "Complete" and "Undo" functionality to ensure that the task's status is correctly updated.

### 2.9. Profile Page

-   **Unit Tests**:
    -   Test the `profileSchema` to ensure it correctly validates user profile data.
-   **Integration Tests**:
    -   Verify that the `Personal Information Form` correctly handles form submission and validation.
-   **E2E Tests**:
    -   Simulate a user updating their profile and verify that the changes are saved.

### 2.10. Settings Page

-   **Unit Tests**:
    -   Test the `handleSoundChange` function to ensure it correctly updates the sound settings.
-   **Integration Tests**:
    -   Verify that the `Sound & Notifications` card correctly displays the current settings.
-   **E2E Tests**:
    -   Simulate a user changing a sound setting and verify that the new setting is applied.

### 2.11. Stats Page

-   **Unit Tests**:
    -   Test the `calculateStudyStreak` function to ensure it correctly calculates the user's study streak.
-   **Integration Tests**:
    -   Verify that the `Stat Card Grid`, `Study Activity Chart`, `Productivity Pie Chart`, and `Daily Activity Timeline` components correctly render the statistical data.
-   **E2E Tests**:
    -   Simulate a user with historical data and verify that the stats are displayed correctly.
    -   Test the time range filtering to ensure that the stats are updated accordingly.

### 2.12. Timer Page

-   **Unit Tests**:
    -   Test the timer logic to ensure that the `timeDisplay`, `isOvertime`, and `timerProgress` are calculated correctly.
-   **Integration Tests**:
    -   Verify that the `Timer Controls` component correctly handles user interactions.
    -   Test the `StopTimerDialog` component to ensure it correctly handles the reason for stopping the timer.
-   **E2E Tests**:
    -   Simulate a user starting a timer and verify that the Timer page is displayed correctly.
    -   Test the "Pause", "Resume", "Complete", and "Stop" functionality to ensure that the timer's state is correctly updated.