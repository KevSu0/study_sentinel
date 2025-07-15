# User Flows

This document outlines the typical user flows for key tasks within the application.

## 1. User Login Flow

This flow describes how a user accesses their account.

1.  **Start:** User opens the application.
2.  **Decision:** Is the user already logged in?
    *   **Yes:** Redirect to the Dashboard screen.
    *   **No:** Display the Login/Sign Up screen.
3.  **Action:** User chooses to log in.
4.  **Action:** User enters their credentials (e.g., email and password, or uses a social login option).
5.  **Action:** User clicks the "Login" button.
6.  **System Process:** Application authenticates the user.
7.  **Decision:** Is authentication successful?
    *   **Yes:** Redirect to the Dashboard screen.
    *   **No:** Display an error message (e.g., "Invalid credentials"). User can try again or choose "Forgot Password".
8.  **End:** User is logged into the application.

## 2. Adding a Task Flow

This flow describes how a user adds a new task to their list.

1.  **Start:** User is on a screen where tasks can be managed (e.g., Tasks screen, Dashboard).
2.  **Action:** User clicks or taps a button/icon to add a new task (e.g., "+ Add Task").
3.  **System Process:** A dialog or a new screen for adding a task appears.
4.  **Action:** User enters the task details (e.g., title, description, priority, due date).
5.  **Action:** User clicks or taps a "Save" or "Add" button.
6.  **System Process:** Application validates the input and saves the new task to the user's data.
7.  **System Process:** The task list is updated to show the new task.
8.  **End:** The new task is successfully added and visible to the user.

## 3. Completing a Routine Flow

This flow describes how a user marks a task as complete.

1.  **Start:** User is viewing a list of tasks (e.g., on the Tasks screen or Dashboard).
2.  **Action:** User identifies a task they have completed.
3.  **Action:** User interacts with the task item to mark it as complete (e.g., clicks a checkbox, swipes the item, clicks a "Complete" button).
4.  **System Process:** The application updates the task's status to "completed".
5.  **System Process:** The task may be moved to a completed tasks list or visually distinguished (e.g., struck through, faded).
6.  **System Process:** Relevant progress metrics (e.g., tasks completed today/this week) are updated.
7.  **System Process:** The user may receive a notification or visual feedback (e.g., confetti) for completing the task.
8.  **End:** The task is successfully marked as complete.

## 4. Scheduling a Routine Flow

This flow describes how a user creates or schedules a new routine in their timetable.

1.  **Start:** User is on the Timetable or Routines management screen.
2.  **Action:** User clicks or taps a button/icon to add or schedule a new routine (e.g., "+ Add Routine", "Schedule Routine").
3.  **System Process:** A dialog or a new screen for adding/scheduling a routine appears.

This flow describes how a user logs the completion of a scheduled routine.

1.  **Start:** User is on a screen displaying scheduled routines (e.g., Timetable screen, Dashboard).
2.  **Action:** User identifies a routine they have completed or are currently doing.
3.  **Action:** User interacts with the routine item to indicate completion (e.g., clicks a "Complete" button, checks a checkbox).
4.  **System Process:** A confirmation or logging mechanism may appear (e.g., a dialog to confirm completion time, add notes, or rate the routine).
5.  **Action (Optional):** User provides additional details if prompted.
6.  **Action:** User confirms completion.
7.  **System Process:** Application records the routine completion, including time and any notes.
8.  **System Process:** The routine's status is updated (e.g., marked as completed for the day).
9.  **System Process:** Relevant progress metrics are updated.
10. **End:** The routine completion is successfully logged.

## 4. Viewing Progress Flow

## 6. Earning a Badge Flow

This flow describes how a user is notified and views newly unlocked badges.

1.  **Start:** User completes an action that contributes to a badge requirement (e.g., completes a certain number of tasks, logs a routine consistently, achieves a productivity milestone).
2.  **System Process:** The application checks if the completed action fulfills any badge criteria.
3.  **Decision:** Has a badge been earned?
    *   **Yes:**
        *   **System Process:** The application marks the badge as unlocked for the user.
        *   **System Process:** A notification is displayed to the user announcing the earned badge (e.g., a pop-up, a banner, a notification in a notification center).
        *   **System Process:** The unlocked badge is added to the user's collection on the Badges screen.
    *   **No:** Continue using the application.
4.  **Action (Optional):** User clicks on the badge notification to view details about the earned badge.
5.  **Action:** User navigates to the Badges screen to view their collection of earned and locked badges.
6.  **System Process:** The Badges screen displays the user's badges, often categorized or showing progress towards locked badges.
7.  **Action (Optional):** User clicks on a specific badge to see its requirements and details.
8.  **End:** User is aware of and can view their earned badges.

## 7. Updating Profile Information Flow

This flow describes how a user modifies their personal details or settings.

1.  **Start:** User is logged into the application.
2.  **Action:** User navigates to the Profile or Settings screen (e.g., clicks on their avatar or a "Settings" icon).
3.  **System Process:** The Profile/Settings screen is displayed, showing the user's current information and available settings.
4.  **Action:** User clicks or taps on a section or field they wish to edit (e.g., name, email, password, preferences).
5.  **Action:** User modifies the information in the provided input fields or selects new options.
6.  **Action:** User clicks or taps a "Save" or "Update" button.
7.  **System Process:** The application validates the changes.
8.  **Decision:** Are the changes valid?
    *   **Yes:**
        *   **System Process:** The application updates the user's information in the database.
        *   **System Process:** A confirmation message is displayed (e.g., "Profile updated successfully").
    *   **No:** Display an error message indicating the issue (e.g., "Invalid email format").
9.  **End:** User's profile information is successfully updated or the user is informed of an error.


This flow describes how a user checks their progress and statistics.


1.  **Start:** User is logged into the application.
2.  **Action:** User navigates to the section for viewing progress or stats (e.g., clicks a "Stats" or "Progress" tab/button).
3.  **System Process:** The application retrieves the user's progress data (e.g., completed tasks, routine consistency, time spent on activities, unlocked badges).
4.  **System Process:** The application displays the progress data, often using charts, graphs, and summaries.
5.  **Action (Optional):** User interacts with filters or date selectors to view specific periods or metrics.
6.  **Action (Optional):** User clicks on specific elements (e.g., a bar in a chart) for more detailed information.
7.  **End:** User is viewing their progress data.