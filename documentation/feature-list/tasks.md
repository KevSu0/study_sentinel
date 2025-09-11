# Tasks Page (Deprecated)

The Tasks page was the original interface for managing tasks but has been deprecated in favor of the more comprehensive Plans page.

### 13.1. Core Functionality

*   **Redirect:** Automatically redirects users to the Plans page (`/plans`).

### 13.2. Reusable Task Components

While the page itself is deprecated, its components are used throughout the application, particularly on the Plans and Archive pages.

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Task Card** | A detailed card view for a single task. | - **Status Toggling:** Mark tasks as complete or incomplete.<br>- **Timer Integration:** Start or view the timer for a task.<br>- **Action Menu:** Provides options to edit, push to the next day, or archive a task. | - [`src/components/tasks/task-card.tsx`](src/components/tasks/task-card.tsx): `TaskCard` (line 77), `handleStatusChange` (line 96), `onEdit` (line 49), `onPushToNextDay` (line 48), `onArchive` (line 46)<br>- [`src/hooks/use-global-state.ts`](src/hooks/use-global-state.ts): `startTimer` |
| **Task List** | A component that renders a list of `TaskCard` components. | - | - [`src/components/tasks/task-list.tsx`](src/components/tasks/task-list.tsx): `TaskList` (line 15) |
| **Add/Edit Task Dialog** | A dialog for creating and editing tasks. | - **Comprehensive Form:** Captures all task details, including title, description, date, time, duration, priority, and timer type. | - [`src/components/tasks/add-task-dialog.tsx`](src/components/tasks/add-task-dialog.tsx): `AddItemDialog` (line 377), `TaskForm` (line 140) |
| **Timer Controls** | A set of buttons for controlling an active timer. | - **Pause/Resume:** Toggles the timer's paused state.<br>- **Complete:** Marks the task as complete.<br>- **Stop:** Stops the timer without completing the task. | - [`src/components/tasks/timer-controls.tsx`](src/components/tasks/timer-controls.tsx): `TimerControls` (line 14) |

### 13.3. Inter-component and Feature Element References

*   `TaskCard` is a highly reusable component, accepting callbacks for various actions (`onEdit`, `onPushToNextDay`, `onArchive`).
*   `TaskList` composes multiple `TaskCard` components.
*   `AddItemDialog` (which is `UnifiedAddItemDialog` in [`src/components/tasks/add-task-dialog.tsx`](src/components/tasks/add-task-dialog.tsx)) is used for task creation/editing.
*   `TimerControls` is a separate component for timer interactions.
*   `startTimer` from `use-global-state.ts` is called by `TaskCard`.

### 13.4. Impacting and Dependent Factors

*   **Task Data Model:** The structure of task objects impacts how `TaskCard` displays information and how `AddItemDialog` handles input. Consistency in the data model is crucial.
*   **Global State Management:** Actions like `startTimer`, `handleStatusChange`, `onEdit`, `onPushToNextDay`, and `onArchive` all depend on a global state to update task data and trigger side effects (e.g., logging, notifications).
*   **Timer State:** The `Timer Controls` component is dependent on the current state of an active timer. Its functionality is directly tied to the global timer state.

### 13.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Task Actions (within `TaskCard` and global state):** Functions like `handleStatusChange`, `onEdit`, `onPushToNextDay`, and `onArchive` should be clearly defined, handling the specific logic for each task action and interacting with the global state for persistence. They should be atomic and handle potential errors during data updates.
    *   **Example (Archive Task):**
        ```typescript
        // Ideal: Atomic task action with state update and logging
        async function onArchive(taskId: string) {
            try {
                await api.archiveTask(taskId); // API call to archive
                globalState.dispatch({ type: 'ARCHIVE_TASK', payload: taskId }); // Update global state
                logActivity('Task Archived', { taskId }); // Log the action
            } catch (error) {
                handleError(error); // Centralized error handling
            }
        }
        ```
*   **Form Validation (`TaskForm`):** The `TaskForm` within `AddItemDialog` should use a robust validation schema (e.g., with `zod`) to ensure all task details are valid before submission. This prevents invalid data from entering the system.
*   **Timer Control Functions:** `TimerControls` should expose functions for `pause`, `resume`, `complete`, and `stop` that interact with a global timer state. These functions should be idempotent and handle various timer states gracefully.
*   **Component Composition:** The clear separation of `TaskCard`, `TaskList`, `AddItemDialog`, and `TimerControls` promotes reusability and maintainability across the application.

### 13.6. Future Enhancements/Considerations

*   **Task Prioritization:** Implement more advanced prioritization features (e.g., Eisenhower Matrix, custom priority levels).
*   **Sub-tasks/Checklists:** Allow users to break down tasks into smaller, manageable sub-tasks or checklists.
*   **Task Reminders:** Set specific reminders for tasks.
*   **Integration with Calendar:** Seamlessly integrate tasks with the Calendar page for visual scheduling.
*   **Task Templates:** Allow users to create and reuse task templates for common activities.