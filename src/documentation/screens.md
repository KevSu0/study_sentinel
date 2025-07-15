# Screens Documentation

This document provides detailed information on each distinct screen or page within the application, outlining their purpose, key components, and user interactions.

This document provides details on each distinct screen or page within the application.

## Dashboard Screen (`/`)

*   **Purpose:** This is the main landing page after a user logs in. It provides an overview of the user's daily progress, upcoming tasks, and important information.
*   **Main Components:**
    *   [`/src/components/bottom-nav.tsx`](/src/components/bottom-nav.tsx): Provides primary navigation to other main sections of the application (Plans, Stats, Profile).
    *   [`/src/components/user-menu.tsx`](/src/components/user-menu.tsx): Provides access to user-specific options such as Profile, Settings, and Logout.
    *   [`/src/components/dashboard/widgets/completed-today-widget.tsx`](/src/components/dashboard/widgets/completed-today-widget.tsx): A unified activity feed showing completed and stopped tasks and routines for the day.
    *   [`/src/components/dashboard/widgets/daily-briefing-widget.tsx`](/src/components/dashboard/widgets/daily-briefing-widget.tsx): Displays the AI-generated daily briefing or a motivational quote.
    *   [`/src/components/dashboard/widgets/stats-overview-widget.tsx`](/src/components/dashboard/widgets/stats-overview-widget.tsx): Presents key productivity statistics for the day at a glance, including a pie chart of time spent.
    *   [`/src/components/dashboard/widgets/unlocked-badges-widget.tsx`](/src/components/dashboard/widgets/unlocked-badges-widget.tsx): Highlights recently earned badges.
    *   Various UI components like `Card`, `Button`, `Progress`, `Badge`, `Separator`.
*   **Key Interactions:**
    *   Viewing an overall summary of daily progress and insights.
    *   Customizing the dashboard layout and widget visibility.
    *   Navigating to other sections via the sidebar or bottom navigation.
    *   Accessing user settings.

## Plans & Routines Screen (`/plans`)

*   **Purpose:** This screen is the central hub for viewing and managing all tasks and routines. Users can switch between days to see their schedule.
*   **Main Components:**
    *   `BottomNav`: Provides navigation.
    *   `Tabs`: To switch between "Upcoming", "Completed", and "Overdue" views.
    *   [`/src/components/tasks/add-task-dialog.tsx`](/src/components/tasks/add-task-dialog.tsx): A modal for creating new tasks.
    *   [`/src/components/timetable/add-routine-dialog.tsx`](/src/components/timetable/add-routine-dialog.tsx): A modal for creating new routines.
    *   [`/src/components/tasks/task-list.tsx`](/src/components/tasks/task-list.tsx) & [`/src/components/tasks/simple-task-list.tsx`](/src/components/tasks/simple-task-list.tsx): Renders lists of tasks in either card or list view.
    *   [`/src/components/timetable/routine-list-item.tsx`](/src/components/timetable/routine-list-item.tsx) & [`/src/components/routines/simple-routine-item.tsx`](/src/components/routines/simple-routine-item.tsx): Renders lists of routines.
    *   [`/src/components/tasks/global-timer-bar.tsx`](/src/components/tasks/global-timer-bar.tsx): A persistent bar that appears when any timer is active.
    *   [`/src/components/tasks/empty-state.tsx`](/src/components/tasks/empty-state.tsx): A component displayed when there are no tasks or routines for the selected view.
    *   `Calendar`: A popover calendar to select the date to view.
*   **Key Interactions:**
    *   Viewing and reviewing the list of tasks and routines for any given day.
    *   Adding, editing, or deleting new tasks and routines.
    *   Starting, stopping, and managing timers.
    *   Marking tasks as completed.
    *   Pushing overdue tasks to the next day.

## Briefing Screen (`/briefing`)

*   **Purpose:** Presents the daily briefing or AI-generated summary content in more detail than the dashboard widget. This screen provides a dedicated space to read and potentially interact with the AI's insights and suggestions for the day.
*   **Main Components:**
    *   Text display areas for the briefing content.
    *   Components to present key points or insights from the briefing.
    *   Potentially interactive elements related to the briefing content.
*   **Key Interactions:**
    *   Reading the daily briefing.
    *   Interacting with specific elements or suggestions within the briefing.
    
## Stats Screen (`/stats`)

*   **Purpose:** Displays various statistics related to user activity, productivity, or well-being.
*   **Main Components:**
    *   `BottomNav`: Provides navigation.
    *   `Tabs`: To filter stats by time range (Today, Last 7 Days, etc.).
    *   [`/src/components/stats/weekly-chart.tsx`](/src/components/stats/weekly-chart.tsx): A bar chart showing study activity over the selected time range.
    *   [`/src/components/stats/priority-chart.tsx`](/src/components/stats/priority-chart.tsx): A pie chart visualizing the distribution of completed tasks by priority level.
    *   `Stat Cards`: Cards displaying key metrics like points earned, time studied, and current streak.
    *   A view of the user's entire badge collection, categorized.
*   **Key Interactions:**
    *   Viewing graphical representations of personal data.
    *   Switching between different types of statistics or time periods.
    *   Understanding patterns in activity and productivity.

## Badges Screen (`/badges`)

*   **Purpose:** Displays the badges the user has earned and all available badges.
*   **Main Components:**
    *   `BottomNav`: Provides navigation.
    *   `Tabs`: To filter badges by category (Daily, Weekly, etc.).
    *   [`/src/components/badges/badge-card.tsx`](/src/components/badges/badge-card.tsx): Displays a single badge with its icon, name, and earned status.
    *   A "Manage Badges" button that navigates to the management screen.
*   **Key Interactions:**
    *   Viewing earned badges.
    *   Exploring available badges and their requirements.
    *   Navigating to the "Manage Badges" screen.

## Badges/Manage Screen (`/badges/manage`)

*   **Purpose:** Allows users to create custom badges, and enable/disable or edit existing ones.
*   **Main Components:**
    *   [`/src/components/badges/badge-list-item.tsx`](/src/components/badges/badge-list-item.tsx): A list item for each badge showing its status and providing management actions.
    *   [`/src/components/badges/badge-dialog.tsx`](/src/components/badges/badge-dialog.tsx): A modal for creating or editing a badge's properties and conditions.
    *   [`/src/components/badges/duration-input.tsx`](/src/components/badges/duration-input.tsx): A specialized input component used for setting time-based criteria for custom badges.
    *   [`/src/components/badges/icon-picker.tsx`](/src/components/badges/icon-picker.tsx): For choosing icons for custom badges.
*   **Key Interactions:**
    *   Creating custom badges with specific conditions.
    *   Editing the details of custom badges.
    *   Deleting custom badges.
    *   Enabling or disabling any badge (system or custom).

## Profile Screen (`/profile`)

*   **Purpose:** Allows users to view and manage their profile information which is used by the AI coach.
*   **Main Components:**
    *   Form components (`Input`, `Label`, `Textarea`, `Button`).
    *   Fields for name, passions, dreams, and other personal context.
*   **Key Interactions:**
    *   Updating profile information to personalize AI interactions.
    *   Saving changes.

## Other Screens

*   **Archive (`/archive`):** A page to view all tasks that have been manually archived.
*   **Logs (`/logs`):** A developer-oriented view of raw event logs for the current session day.
*   **Splash Screen:** The initial screen displayed while the application is loading or initializing.
*   **Deprecated Screens (`/tasks`, `/timetable`, `/lets-start`):** These URLs now redirect to `/plans` or `/` to maintain backwards compatibility while simplifying the app structure.
