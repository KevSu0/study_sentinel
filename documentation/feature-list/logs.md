# Activity Log Page

The Activity Log page provides a detailed, chronological record of all user actions within the current session day.

### 8.1. Core Functionality

*   **Real-time Logging:** Captures and displays user actions as they happen.
*   **Detailed Information:** Shows the type of action, a timestamp, and the associated data payload.

### 8.2. Features & Sub-features

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Header** | Displays the page title and a brief description. | - | - [`src/app/logs/page.tsx`](src/app/logs/page.tsx): `LogPage` (line 28) |
| **Log List** | Renders a reverse-chronological list of all log entries for the day. | - **Log Entry:** Displays the action type, icon, timestamp, and a formatted JSON payload of the event data. | - [`src/app/logs/page.tsx`](src/app/logs/page.tsx): `logs` (line 30), `getIconForLogType` (line 9)<br>- [`src/hooks/use-global-state.ts`](src/hooks/use-global-state.ts) |
| **Empty State** | Is displayed when there is no activity to show for the current day. | - | - [`src/app/logs/page.tsx`](src/app/logs/page.tsx): `EmptyState` (implicitly rendered based on `logs.length`, line 77) |

### 8.3. Inter-component and Feature Element References

*   `LogPage` retrieves `logs` from `use-global-state.ts`.
*   `getIconForLogType` is a helper function used within `LogPage` to display appropriate icons based on the log entry type.
*   `EmptyState` is conditionally rendered based on the `logs` array's length.

### 8.4. Impacting and Dependent Factors

*   **Global State Logging:** The `logs` data is dependent on a global state management system (e.g., `use-global-state.ts`) that captures and stores user actions. The integrity and completeness of this log data are crucial.
*   **Data Structure:** The format of log entries (action type, timestamp, payload) impacts how they are displayed. Any changes to the log entry structure must be reflected in the display logic.
*   **`getIconForLogType`:** This helper function is crucial for visual representation of log types. It needs to be kept up-to-date with all possible log types.

### 8.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Logging Mechanism (within `use-global-state.ts` or similar):** A dedicated function (e.g., `addLogEntry`) should be responsible for capturing user actions, timestamping them, and storing them in the global state. This function should be called consistently across the application whenever a significant user action occurs (e.g., task completion, routine start, badge earned).
    *   **Example (Add Log Entry):**
        ```typescript
        // Ideal: Centralized logging function
        function addLogEntry(type: LogType, payload: any) {
            const newLog = {
                id: generateUniqueId(), // Sub-micro function
                type,
                timestamp: new Date().toISOString(),
                payload,
            };
            setLogs((prevLogs) => [newLog, ...prevLogs]); // Add to global state
        }
        ```
*   **Data Formatting:** Functions for formatting the JSON payload of log entries should ensure readability and consistency, especially for complex data structures. This might involve pretty-printing JSON or transforming specific data types.
*   **Icon Mapping (`getIconForLogType`):** This micro-function should provide a clear and exhaustive mapping between log types and their corresponding icons, making it easy to extend or modify as new log types are introduced.
*   **Reverse Chronological Display:** The rendering logic for the `Log List` should ensure that the most recent activities are displayed first, which typically involves sorting the `logs` array.

### 8.6. Future Enhancements/Considerations

*   **Log Filtering and Search:** Implement functionality to filter log entries by type, date range, or search keywords.
*   **Log Export:** Allow users to export their activity logs for personal analysis or backup.
*   **Persistent Logs:** Currently, logs are likely session-based. Consider persisting logs across sessions (e.g., to a backend database) for long-term historical analysis.
*   **Performance Optimization:** For very long log lists, consider virtualization or lazy loading to prevent performance degradation.