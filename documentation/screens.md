# Screens Documentation

This document provides detailed information on each distinct screen or page within the application, outlining their purpose, key components, and user interactions.

This document provides details on each distinct screen or page within the application.

## Home/Dashboard Screen

*   **Purpose:** This is the main landing page after a user logs in. It provides an overview of the user's daily progress, upcoming tasks, and important information.
*   **Main Components:**
    *   [`/src/components/bottom-nav.tsx`](/src/components/bottom-nav.tsx): Provides primary navigation to other main sections of the application (Tasks, Timetable, Stats, Badges).
    *   [`/src/components/user-menu.tsx`](/src/components/user-menu.tsx): Provides access to user-specific options such as Profile, Settings, and Logout.
    *   [`/src/components/dashboard/activity/activity-item.tsx`](/src/components/dashboard/activity/activity-item.tsx): Displays recent user activities in a feed-like format, offering a chronological overview of completed actions.
    *   [`/src/components/dashboard/widgets/completed-today-widget.tsx`](/src/components/dashboard/widgets/completed-today-widget.tsx): A summary widget showing the count or progress of tasks and routines completed within the current day.
    *   [`/src/components/dashboard/widgets/daily-briefing-widget.tsx`](/src/components/dashboard/widgets/daily-briefing-widget.tsx): Displays the AI-generated daily briefing, offering insights, motivations, and suggestions based on user activity and goals.
    *   [`/src/components/dashboard/widgets/stats-overview-widget.tsx`](/src/components/dashboard/widgets/stats-overview-widget.tsx): Presents key productivity or wellness statistics at a glance, such as total time focused, tasks completed, or streak information.
    *   [`/src/components/dashboard/widgets/unlocked-badges-widget.tsx`](/src/components/dashboard/widgets/unlocked-badges-widget.tsx): Highlights recently earned badges, encouraging continued engagement and achievement.
    *   [`/src/components/routines/routine-card.tsx`](/src/components/routines/routine-card.tsx): Displays an individual scheduled routine with relevant information and actions, such as starting the routine or logging its completion.
    *   [`/src/components/tasks/task-card.tsx`](/src/components/tasks/task-card.tsx): Shows an individual task with its title, priority, status, and timer controls (start/stop/pause).
    *   Various UI components like `Card`, `Button`, `Progress`, `Badge`, `Separator`.
*   **Key Interactions:**
    *   Viewing an overall summary of daily progress and insights.
    *   Starting or logging completion of routines.
    *   Managing tasks (starting/stopping timers, marking as complete).
    *   Navigating to other sections via the bottom navigation.
    *   Accessing user settings.

## Tasks Screen

*   **Purpose:** This screen is dedicated to viewing and managing the user's tasks.
*   **Main Components:**
    *   `BottomNav`: Provides navigation.
    *   [`/src/components/tasks/add-task-dialog.tsx`](/src/components/tasks/add-task-dialog.tsx): A modal dialog used for creating new tasks, allowing users to input task details like title, description, priority, and due date.
    *   [`/src/components/tasks/task-list.tsx`](/src/components/tasks/task-list.tsx): Displays a list of tasks, potentially categorized or sorted. It renders individual `TaskCard` components.
    *   [`/src/components/tasks/task-card.tsx`](/src/components/tasks/task-card.tsx): Represents a single task within the list, showing its information and interaction buttons.
    *   [`/src/components/tasks/global-timer-bar.tsx`](/src/components/tasks/global-timer-bar.tsx): A persistent bar that appears when a task timer is active, showing the current task and elapsed time, and offering quick timer controls.
    *   [`/src/components/tasks/empty-state.tsx`](/src/components/tasks/empty-state.tsx): A component displayed when the task list is empty, encouraging the user to add new tasks.
    *   [`/src/components/tasks/stop-timer-dialog.tsx`](/src/components/tasks/stop-timer-dialog.tsx): A modal dialog that appears when a user tries to stop a running timer, possibly prompting for confirmation or details about the completed task.
    *   [`/src/components/tasks/timer-dialog.tsx`](/src/components/tasks/timer-dialog.tsx): A modal dialog providing more detailed information and controls for the currently active task timer.
    *   Various UI components like `Button`, `Checkbox`, `Input`, `Label`.
*   **Key Interactions:**
    *   Viewing and reviewing the list of pending tasks.
    *   Adding new tasks.
    *   Starting, stopping, and managing task timers.
    *   Marking tasks as completed.
    *   Editing or deleting tasks (if implemented).

## Routines/Timetable Screen

*   **Purpose:** This screen allows users to view and manage their scheduled routines and build their overall timetable. It helps users structure their day or week with recurring activities and time blocks.
*   **Main Components:**
    *   `BottomNav`: Provides navigation.
    *   [`/src/components/timetable/add-routine-dialog.tsx`](/src/components/timetable/add-routine-dialog.tsx): A modal dialog for creating and scheduling new routines, allowing specification of time, frequency, and associated tasks or activities.
    *   [`/src/components/timetable/routine-list-item.tsx`](/src/components/timetable/routine-list-item.tsx): Displays a single routine within a list format, typically showing its name, scheduled time, and duration.
    *   `RoutineCard`: (Possibly reused if displaying routines with more detail).
    *   `Calendar`: (If a calendar view of the timetable is implemented).
    *   Various UI components like `Button`, `Dialog`, `List`.
*   **Key Interactions:**
    *   Viewing the list or calendar view of scheduled routines and time blocks.
    *   Adding new routines to the schedule.
    *   Editing or removing routines from the schedule.
    *   Potentially viewing routines in a daily or weekly calendar format.

## Plans Screen

*   **Purpose:** This screen likely focuses on longer-term goals or plans, possibly involving guided programs or projects.
*   **Main Components:** (Based on the file list, specific Plan components are not immediately obvious, so describing potential components)
    *   `BottomNav`: Provides navigation.
    *   Components to display different plans or goals.
    *   Progress indicators (`Progress`).
    *   Task or routine lists associated with a plan (`TaskList`, `RoutineList`).
    *   Various UI components like `Card`, `Button`.
*   **Key Interactions:**
    *   Viewing active plans or goals.
    *   Tracking progress towards plan completion.
    *   Accessing tasks or routines related to a specific plan.
    *   Potentially creating or customizing plans.

## Stats Screen

*   **Purpose:** Displays various statistics related to user activity, productivity, or well-being.
*   **Main Components:**
    *   `BottomNav`: Provides navigation.
    *   [`/src/components/stats/priority-chart.tsx`](/src/components/stats/priority-chart.tsx): A chart visualizing the distribution of completed tasks or time spent across different priority levels.
    *   [`/src/components/stats/weekly-chart.tsx`](/src/components/stats/weekly-chart.tsx): A chart showing a user's activity or productivity trend over the past week, potentially tracking metrics like focused time, tasks completed, or routines finished per day.
    *   [`/src/components/dashboard/productivity-pie-chart.tsx`](/src/components/dashboard/productivity-pie-chart.tsx): A pie chart visualizing how time is spent across different categories or task types. (While in dashboard folder, likely used here too).
    *   Various chart components (`Chart`).
    *   Various UI components like `Card`, `Tabs` (for different stat views).
*   **Key Interactions:**
    *   Viewing graphical representations of personal data.
    *   Switching between different types of statistics or time periods.
    *   Understanding patterns in activity and productivity.

## Badges Screen

*   **Purpose:** Displays the badges the user has earned and available badges.
*   **Main Components:**
    *   `BottomNav`: Provides navigation.
    *   [`/src/components/badges/badge-card.tsx`](/src/components/badges/badge-card.tsx): Displays a single badge with its icon, name, and potentially a brief description or progress indicator.
    *   [`/src/components/badges/badge-list-item.tsx`](/src/components/badges/badge-list-item.tsx): Shows a badge in a compact list format, often used for displaying multiple badges.
    *   [`/src/components/badges/badge-dialog.tsx`](/src/components/badges/badge-dialog.tsx): A modal dialog that provides detailed information about a selected badge, including its requirements, description, and unlock status.
    *   Components for filtering or sorting badges.
    *   Various UI components like `Card`, `List`, `Dialog`.
*   **Key Interactions:**
    *   Viewing earned badges.
    *   Exploring available badges and their requirements.
    *   Viewing details about a specific badge.
    *   Navigating to the "Manage Badges" screen.

## Badges/Manage Screen

*   **Purpose:** Allows users to customize or manage aspects of their badges, possibly creating custom ones or setting goals.
*   **Main Components:** (Based on the files, this screen is specifically for managing badges).
    *   Components for defining badge criteria.
    *   [`/src/components/badges/duration-input.tsx`](/src/components/badges/duration-input.tsx): A specific input component likely used for setting time-based criteria for custom badges (e.g., "complete 1 hour of focused work").
    *   `IconPicker`: For choosing icons for custom badges.
    *   Various form components (`Form`, `Input`, `Select`, `Button`).
*   **Key Interactions:**
    *   Creating custom badges.
    *   Setting parameters or requirements for badges.
    *   Managing existing custom badges.

## Briefing Screen

*   **Purpose:** Presents the daily briefing or AI-generated summary content in more detail than the dashboard widget. This screen provides a dedicated space to read and potentially interact with the AI's insights and suggestions for the day.
*   **Main Components:**
    *   Text display areas for the briefing content.
    *   Components to present key points or insights from the briefing.
    *   Potentially interactive elements related to the briefing content.
*   **Key Interactions:**
    *   Reading the daily briefing.
    *   Interacting with specific elements or suggestions within the briefing.

## Logs Screen

*   **Purpose:** Provides a historical log of user activities, completed tasks, routines, or other relevant events.
*   **Main Components:** (Based on the file list, specific Log components are not immediately obvious, so describing potential components)
    *   List components to display log entries.
    *   Filtering or sorting options for log entries (e.g., by date, type of activity).
    *   Individual log item components.
*   **Key Interactions:**
    *   Reviewing past activities and accomplishments.
    *   Filtering logs by date, type, or other criteria.

## Archive Screen

*   **Purpose:** Allows users to view completed or archived tasks, routines, or plans.
*   **Main Components:** (Based on the file list, specific Archive components are not immediately obvious, so describing potential components)
    *   List components for archived items.
    *   Filtering or searching archived items (e.g., by date of completion, type).
    *   Components to display details of archived items.
*   **Key Interactions:**
    *   Accessing historical records of completed items.
    *   Searching or filtering the archive.

## Profile Screen

*   **Purpose:** Allows users to view and manage their profile information and application settings.
*   **Main Components:** (Based on the file list, specific Profile components are not immediately obvious, so describing potential components)
    *   Form components for editing profile details (`Input`, `Label`, `Button`).
    *   Sections for application settings (e.g., notifications, theme preferences, data export).
    *   `Avatar`: Displays the user's profile picture.
*   **Key Interactions:**
    *   Updating profile information.
    *   Adjusting application settings.
    *   Managing account details.

## Let's Start Screen

*   **Purpose:** This is likely an onboarding or initial setup screen designed to guide new users through the process of configuring their account, setting initial goals, or learning how to use the application.
*   **Main Components:** (Based on the file list, specific 'LetsStart' components are not immediately obvious, so describing potential components)
    *   Input fields for gathering necessary initial information (e.g., name, goals, preferred schedule).
    *   Buttons for progression through the setup steps.
    *   Informational text or prompts.
*   **Key Interactions:**
    *   Providing initial setup information.
    *   Completing onboarding steps.

## Splash Screen

*   **Purpose:** The first screen displayed when the application launches, usually showing the app logo or loading indicator.
*   **Main Components:** (Based on the file list)
    *   [`/src/components/logo.tsx`](/src/components/logo.tsx): Displays the application logo.
    *   Loading indicators (`Progress` or custom).
    *   [`/src/components/splash-screen.tsx`](/src/components/splash-screen.tsx): The component specifically designed to handle the splash screen's presentation and transition to the main application content once loading is complete.
*   **Key Interactions:**
    *   None. This is a passive, transitional screen for the user.