# Timetable Page (Deprecated)

The Timetable page was the original interface for managing routines but has been deprecated in favor of the more comprehensive Plans page.

### 15.1. Core Functionality

*   **Redirect:** Automatically redirects users to the Plans page (`/plans`).

### 15.2. Reusable Routine Components

While the page itself is deprecated, its components are used throughout the application, particularly on the Plans page.

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Routine List Item** | A detailed card view for a single routine. | - **Timer Integration:** Start or stop the timer for a routine.<br>- **Action Menu:** Provides options to edit or delete a routine.<br>- **Manual Completion:** Allows users to mark a routine as complete without using the timer. | - [`src/components/timetable/routine-list-item.tsx`](src/components/timetable/routine-list-item.tsx): `RoutineListItem` (line 54), `handleStartTimer` (line 71), `onEdit` (line 45), `onDelete` (line 46), `onComplete` (line 47) |
| **Add/Edit Routine Dialog** | A dialog for creating and editing routines. (Note: This component is deprecated and its logic is merged into the unified `AddItemDialog`). | - | - [`src/components/timetable/add-routine-dialog.tsx`](src/components/timetable/add-routine-dialog.tsx): `AddRoutineDialog` (line 7) |

### 15.3. Inter-component and Feature Element References

*   `RoutineListItem` is a reusable component that exposes callbacks for `onEdit`, `onDelete`, and `onComplete`.
*   `handleStartTimer` within `RoutineListItem` likely interacts with a global timer state.
*   `AddRoutineDialog` is noted as deprecated, with its logic merged into `AddItemDialog` (from [`src/components/tasks/add-task-dialog.tsx`](src/components/tasks/add-task-dialog.tsx)).

### 15.4. Impacting and Dependent Factors

*   **Routine Data Model:** The structure of routine objects impacts how `RoutineListItem` displays information. Consistency in the data model is crucial for proper rendering and functionality.
*   **Global State Management:** Actions like `handleStartTimer`, `onEdit`, `onDelete`, and `onComplete` depend on a global state to update routine data and trigger side effects (e.g., logging, notifications).
*   **Unified `AddItemDialog`:** The successful deprecation of `AddRoutineDialog` means that the `AddItemDialog` must correctly handle both task and routine creation/editing, ensuring a seamless user experience.

### 15.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Routine Actions (within `RoutineListItem` and global state):** Functions like `handleStartTimer`, `onEdit`, `onDelete`, and `onComplete` should be well-defined, handling the specific logic for each routine action and interacting with the global state for persistence. They should be atomic and provide clear feedback.
    *   **Example (Manual Routine Completion):**
        ```typescript
        // Ideal: Manual routine completion with state update and logging
        async function onComplete(routineId: string) {
            try {
                await api.completeRoutine(routineId); // API call to mark complete
                globalState.dispatch({ type: 'COMPLETE_ROUTINE', payload: routineId }); // Update global state
                logActivity('Routine Manually Completed', { routineId }); // Log the action
            } catch (error) {
                handleError(error); // Centralized error handling
            }
        }
        ```
*   **Unified Creation/Editing:** The `AddItemDialog` should have a flexible form and submission logic to accommodate both tasks and routines, potentially using a common schema or conditional rendering based on item type. This promotes code reuse and reduces maintenance overhead.
*   **Component Reusability:** `RoutineListItem` serves as a good example of a reusable component for displaying routine details and actions, which can be utilized in various parts of the application (e.g., Plans page).

### 15.6. Future Enhancements/Considerations

*   **Complete Removal:** Given its deprecated status, consider completely removing this page and its associated files to reduce bundle size and simplify the codebase, ensuring no other parts of the application still link to it.
*   **Routine Templates:** Allow users to create and reuse routine templates for common daily or weekly schedules.
*   **Routine Analytics:** Integrate routine completion data into the Stats page for more detailed analysis of habits.
*   **AI-powered Routine Suggestions:** Based on user goals and past performance, suggest optimal routines.