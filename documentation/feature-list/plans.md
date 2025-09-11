# Plans Page

The Plans page is the primary interface for managing daily tasks and routines. It provides a comprehensive view of upcoming, overdue, and completed items for a selected day.

### 9.1. Core Functionality

*   **Date-based Planning:** Allows users to view and manage their plans for any selected day.
*   **Unified View:** Consolidates tasks and routines into a single, cohesive view.
*   **Multiple View Modes:** Offers both "card" and "list" views to suit user preferences.
*   **Item Management:** Provides a full suite of actions for managing tasks and routines, including creation, editing, completion, and deletion.

### 9.2. Features & Sub-features

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Date Navigation** | Allows users to navigate between different days to view their plans. | - **Previous/Next Day Buttons:** Moves to the adjacent day.<br>- **Date Picker:** Allows for direct selection of any date. | - [`src/app/plans/page.tsx`](src/app/plans/page.tsx): `selectedDate` (line 63), `changeDate` (line 118)<br>- [`src/components/ui/calendar.tsx`](src/components/ui/calendar.tsx) |
| **View Mode Toggle** | Switches the display of plan items between a detailed card view and a compact list view. | - | - [`src/components/plans/view-mode-toggle.tsx`](src/components/plans/view-mode-toggle.tsx): `ViewModeToggle` (line 19)<br>- [`src/hooks/use-view-mode.ts`](src/hooks/use-view-mode.ts) |
| **Upcoming Items** | Displays all tasks and routines scheduled for the selected day that are not yet completed. | - **Task/Routine Cards/List Items:** Shows item details and provides actions like starting a timer, editing, or marking as complete. | - [`src/app/plans/page.tsx`](src/app/plans/page.tsx): `upcomingItems` (line 75)<br>- [`src/components/plans/plan-item-card.tsx`](src/components/plans/plan-item-card.tsx): `PlanItemCard` (line 98)<br>- [`src/components/plans/plan-item-list-item.tsx`](src/components/plans/plan-item-list-item.tsx): `PlanListItem` (line 62) |
| **Overdue Tasks** | An expandable section that displays all tasks from previous days that are not yet completed. | - **Push to Today:** Allows a task to be rescheduled to the currently selected day. | - [`src/app/plans/page.tsx`](src/app/plans/page.tsx): `overdueTasks` (line 102)<br>- [`src/components/ui/accordion.tsx`](src/components/ui/accordion.tsx): `Accordion` |
| **Completed Items** | Displays all tasks and routines that have been completed on the selected day. | - **Undo Completion:** Allows a user to revert the completion of an item.<br>- **Hard Undo:** Permanently removes the completion log. | - [`src/app/plans/page.tsx`](src/app/plans/page.tsx): `handleUndoCompleteRoutine` (line 138), `handleHardUndo` (line 143)<br>- [`src/components/plans/completed-plan-list-item.tsx`](src/components/plans/completed-plan-list-item.tsx)<br>- [`src/components/dashboard/widgets/completed-today-widget.tsx`](src/components/dashboard/widgets/completed-today-widget.tsx): `CompletedTodayWidget` |
| **Add Item** | A floating action button and dialog for creating new tasks or routines. | - | - [`src/app/plans/page.tsx`](src/app/plans/page.tsx): `openAddItemDialog` (line 112)<br>- [`src/components/tasks/add-task-dialog.tsx`](src/components/tasks/add-task-dialog.tsx): `AddItemDialog` (line 377) |
| **Empty State** | Is displayed when there are no items scheduled for the selected day. | - | - [`src/app/plans/page.tsx`](src/app/plans/page.tsx)<br>- [`src/components/tasks/empty-state.tsx`](src/components/tasks/empty-state.tsx): `EmptyState` |

### 9.3. Inter-component and Feature Element References

*   `PlansPage` uses `Calendar` for date selection and `ViewModeToggle` for display preferences.
*   It conditionally renders `PlanItemCard` or `PlanListItem` based on the view mode.
*   `Accordion` is used for the `Overdue Tasks` section.
*   `CompletedTodayWidget` is referenced for completed items.
*   `AddItemDialog` is used for creating new tasks/routines.
*   `EmptyState` is used for empty plan days.

### 9.4. Impacting and Dependent Factors

*   **`selectedDate` State:** All displayed items are filtered by the `selectedDate`. Changes to this state trigger re-fetching or re-filtering of tasks and routines.
*   **`useViewMode` Hook:** Controls the rendering style (card vs. list). The persistence of this setting is important for user experience.
*   **Task/Routine Data:** The availability and status of tasks and routines determine what appears in "Upcoming," "Overdue," and "Completed" sections. This data needs to be consistently updated and managed.
*   **State Management:** Functions like `handleUndoCompleteRoutine` and `handleHardUndo` rely on a robust state management system to revert or permanently remove completion logs. Edge cases include attempting to undo a completion that has already been hard-undone.

### 9.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Date Navigation (`changeDate`):** A concise function to update the `selectedDate` state, triggering re-renders of the plan items. This should handle valid date ranges and potential invalid inputs.
*   **Filtering Logic:** Micro-functions to filter `upcomingItems`, `overdueTasks`, and `completedItems` based on `selectedDate` and completion status. These should be efficient, potentially memoized, and handle empty data sets gracefully.
*   **Item Actions:** Functions for `startTimer`, `edit`, `complete`, `delete`, `pushToToday`, `undoCompletion`, and `hardUndo` should be well-defined, handling both UI updates and data persistence. Each action should have clear pre-conditions and post-conditions.
    *   **Example (Undo Completion):**
        ```typescript
        // Ideal: Undo completion with error handling for edge cases
        async function handleUndoCompleteRoutine(routineId: string) {
            try {
                // Check if routine exists and was completed
                const routine = getRoutineById(routineId); // Micro-function to fetch routine
                if (!routine || routine.status !== 'completed') {
                    throw new Error('Routine not found or not completed.');
                }

                await api.undoRoutineCompletion(routineId); // API call to revert status
                globalState.dispatch({ type: 'UNDO_ROUTINE_COMPLETION', payload: routineId }); // Update state
                logActivity('Routine Completion Undone', { routineId }); // Logging
            } catch (error) {
                handleError(error); // Centralized error handling
                // Provide user feedback (e.g., toast notification)
            }
        }
        ```
*   **Unified Add Item:** The `openAddItemDialog` and the `AddItemDialog` component should provide a single, consistent interface for adding both tasks and routines, reducing code duplication and ensuring a consistent user experience.
*   **View Mode Logic:** The `useViewMode` hook should encapsulate the logic for toggling and persisting the user's preferred view mode, potentially using local storage.

### 9.6. Future Enhancements/Considerations

*   **Drag-and-Drop for Reordering:** Allow users to reorder tasks and routines within the "Upcoming Items" section.
*   **Recurring Tasks/Routines:** Implement support for creating and managing recurring tasks and routines directly from the Plans page.
*   **Dependency Management:** Allow users to define dependencies between tasks (e.g., Task B cannot start until Task A is completed).
*   **Collaboration Features:** Enable sharing plans with other users.
*   **Smart Suggestions:** AI-powered suggestions for task prioritization or routine scheduling based on user habits.