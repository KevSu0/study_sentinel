# Dashboard Page

The Dashboard is the central hub of the application, providing a dynamic and personalized overview of the user's daily activities, progress, and key insights.

### 1.1. Core Functionality

*   **Dynamic Widget-Based Layout:** The dashboard is composed of various widgets that users can rearrange to suit their preferences. This is managed through a drag-and-drop interface.
*   **Customization:** Users can customize the visibility of widgets on their dashboard.

### 1.2. Features & Sub-features

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Header** | Displays the page title, the current date, and primary action buttons. | - **Customize Button:** Opens a dialog to manage widget visibility.<br>- **Add Item Button:** Opens a dialog to add new tasks or routines. | - [`src/app/page.tsx`](src/app/page.tsx): `DashboardPage` (line 71), `setCustomizeOpen` (line 75)<br>- [`src/components/dashboard/customize-dialog.tsx`](src/components/dashboard/customize-dialog.tsx)<br>- [`src/components/dashboard/add-item-dialog.tsx`](src/components/dashboard/add-item-dialog.tsx): `AddItemDialog` (line 10) |
| **Widget Container** | A sortable container that holds and displays all the dashboard widgets. | - **Drag-and-Drop Reordering:** Allows users to change the order of widgets. | - [`src/app/page.tsx`](src/app/page.tsx): `DndContext` (line 159), `SortableContext` (line 163), `handleDragEnd` (line 77)<br>- [`src/hooks/use-dashboard-layout.ts`](src/hooks/use-dashboard-layout.ts): `useDashboardLayout`<br>- `@dnd-kit/core` (external library)<br>- `@dnd-kit/sortable` (external library) |
| **Add Item Dialog** | A unified dialog for adding new tasks or routines directly from the dashboard. | - **Task Creation:** Captures details for a new task.<br>- **Routine Creation:** Captures details for a new routine. | - [`src/components/dashboard/add-item-dialog.tsx`](src/components/dashboard/add-item-dialog.tsx): `AddItemDialog` (line 10)<br>- [`src/components/tasks/add-task-dialog.tsx`](src/components/tasks/add-task-dialog.tsx): `UnifiedAddItemDialog` (line 377) |
| **Today's Routines Widget** | Displays a summary of the user's scheduled routines for the current day. | - (Functionality not yet implemented, placeholder component) | - [`src/components/dashboard/widgets/todays-routines-widget.tsx`](src/components/dashboard/widgets/todays-routines-widget.tsx): `TodaysRoutinesWidget` (line 3) |
| **Today's Plan Widget** | Displays a summary of the user's planned tasks for the current day. | - (Functionality not yet implemented, placeholder component) | - [`src/components/dashboard/widgets/todays-plan-widget.tsx`](src/components/dashboard/widgets/todays-plan-widget.tsx): `TodaysPlanWidget` (line 3) |
| **Stats Overview Widget** | Provides a comprehensive overview of the user's productivity statistics for the day. | - **Productivity Pie Chart:** Visualizes time spent on tasks and routines.<br>- **Points Earned:** Shows total points accumulated today.<br>- **Badges Unlocked:** Displays the number of new badges earned.<br>- **Sessions Completed:** Counts the total number of completed tasks and routines. | - [`src/components/dashboard/widgets/stats-overview-widget.tsx`](src/components/dashboard/widgets/stats-overview-widget.tsx): `StatsOverviewWidget` (line 24), `todaysPoints` (line 47), `todaysBadges.length` (line 95), `completedSessions` (line 48)<br>- [`src/components/dashboard/productivity-pie-chart.tsx`](src/components/dashboard/productivity-pie-chart.tsx): `ProductivityPieChart` |
| **Empty State** | Appears when there is no content to display on the dashboard, prompting the user to add tasks or routines. | - **Call to Action:** Provides a button to navigate to the planning section. | - [`src/app/page.tsx`](src/app/page.tsx): `EmptyState` (line 184)<br>- [`src/components/tasks/empty-state.tsx`](src/components/tasks/empty-state.tsx) |

### 1.3. Inter-component and Feature Element References

*   The Dashboard's Header directly references and controls the `CustomizeDialog` and `AddItemDialog`.
*   The `Widget Container` relies on `useDashboardLayout` hook and `@dnd-kit` libraries for its drag-and-drop functionality.
*   `AddItemDialog` integrates with `UnifiedAddItemDialog` for task/routine creation.
*   `Stats Overview Widget` incorporates `ProductivityPieChart` for data visualization.
*   The main `DashboardPage` conditionally renders `EmptyState` based on content availability.

### 1.4. Impacting and Dependent Factors

*   **User Preferences:** Widget visibility and arrangement are dependent on user customization settings.
*   **Data Availability:** Widgets like "Today's Routines," "Today's Plan," and "Stats Overview" depend on real-time user activity data (tasks, routines, points, badges, sessions).
*   **Drag-and-Drop State:** The reordering functionality is dependent on the state managed by `DndContext` and `SortableContext`.
*   **Empty State Condition:** The `EmptyState` component's rendering is directly impacted by the presence or absence of dashboard content.

### 1.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Modularity:** Each widget and dialog should be a self-contained, reusable component with clearly defined props and responsibilities.
*   **Separation of Concerns:** UI rendering logic should be distinct from data fetching, state management, and business logic. For example, `handleDragEnd` in [`src/app/page.tsx`](src/app/page.tsx:77) should primarily manage the UI reordering, while a separate utility or hook (e.g., within [`src/hooks/use-dashboard-layout.ts`](src/hooks/use-dashboard-layout.ts)) handles the persistence of the new layout.
*   **State Management:** A centralized state management solution (e.g., `use-global-state.ts` or a dedicated dashboard context) should manage widget data, layout preferences, and dialog open/close states.
*   **Data Fetching:** Functions responsible for fetching `todaysPoints`, `todaysBadges`, and `completedSessions` should be optimized for performance and potentially memoized or cached.
*   **Event Handlers:** Micro-functions like `setCustomizeOpen` and `handleDragEnd` should be concise, focusing on their immediate action (e.g., toggling a dialog, updating a local state for drag-and-drop). Sub-micro functions might include helpers for calculating `todaysPoints` or formatting data for the `ProductivityPieChart`.

### 1.6. Future Enhancements/Considerations

*   More customizable widget options (e.g., resizing, more granular data display).
*   Integration with external data sources (e.g., calendar integrations).
*   A "quick add" button directly on the header for common tasks/routines.
*   Improved accessibility for drag-and-drop functionality.