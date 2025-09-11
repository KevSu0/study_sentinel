# Archive Page

The Archive page serves as a historical record of all tasks that have been marked as "archived" by the user.

### 2.1. Core Functionality

*   **View Archived Tasks:** Displays a comprehensive list of all tasks that have been moved to the archive.

### 2.2. Features & Sub-features

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Header** | Displays the page title and a brief description. | - | - [`src/app/archive/page.tsx`](src/app/archive/page.tsx): `ArchivePage` (line 9) |
| **Archived Task List** | Renders the list of archived tasks. | - **Unarchive Task:** Allows a task to be restored from the archive to its previous state.<br>- **Push to Next Day:** (If applicable to archived tasks) Moves the task to the next day's plan.<br>- **Edit Task:** (If applicable to archived tasks) Opens a dialog to edit task details. | - [`src/app/archive/page.tsx`](src/app/archive/page.tsx): `archivedTasks` (line 19), `TaskList` (line 40), `unarchiveTask` (line 14), `pushTaskToNextDay` (line 14), `updateTask` (line 13)<br>- [`src/components/tasks/task-list.tsx`](src/components/tasks/task-list.tsx)<br>- [`src/hooks/use-global-state.ts`](src/hooks/use-global-state.ts) |
| **Empty State** | Is displayed when there are no archived tasks, informing the user that the archive is empty. | - | - [`src/app/archive/page.tsx`](src/app/archive/page.tsx): `EmptyState` (line 50)<br>- [`src/components/tasks/empty-state.tsx`](src/components/tasks/empty-state.tsx) |

### 2.3. Inter-component and Feature Element References

*   The `ArchivePage` utilizes `TaskList` to render archived tasks.
*   `EmptyState` is conditionally rendered by `ArchivePage`.
*   Actions like `unarchiveTask`, `pushTaskToNextDay`, and `updateTask` likely interact with a global state management system (e.g., `use-global-state.ts`).

### 2.4. Impacting and Dependent Factors

*   **`archivedTasks` State:** The content displayed on the page is entirely dependent on the `archivedTasks` data.
*   **Task Actions:** The ability to unarchive, push to next day, or edit tasks depends on the underlying data model and state management.
*   **Empty State Condition:** The `EmptyState` component's rendering is directly impacted by the presence or absence of archived tasks.

### 2.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Data Operations:** Functions like `unarchiveTask`, `pushTaskToNextDay`, and `updateTask` should be atomic and idempotent, ensuring data consistency. They should ideally be part of a service layer or a global state management hook that handles persistence.
    *   **Example (Unarchive Task):**
        ```typescript
        // Ideal: Atomic and idempotent data operation
        async function unarchiveTask(taskId: string): Promise<void> {
            try {
                // Assume an API or direct state mutation for unarchiving
                await api.updateTaskStatus(taskId, 'active');
                globalState.dispatch({ type: 'UNARCHIVE_TASK', payload: taskId });
                logActivity('Task Unarchived', { taskId });
            } catch (error) {
                handleError(error); // Centralized error handling
            }
        }
        ```
*   **Component Reusability:** `TaskList` and `EmptyState` are good examples of reusable components. Their functions should be generic enough to accept different data sets and display options.
*   **Conditional Rendering:** The logic for displaying `TaskList` or `EmptyState` should be simple and based on the `archivedTasks` array's length.

### 2.6. Future Enhancements/Considerations

*   **Search and Filtering:** Add functionality to search and filter archived tasks by keywords, date ranges, or other criteria.
*   **Bulk Actions:** Implement options for bulk unarchiving or deleting multiple tasks.
*   **Archived Routine Support:** Extend the archive to include routines, if applicable, requiring updates to the data model and UI.
*   **Performance Optimization:** For very large archives, consider pagination or lazy loading to improve performance.