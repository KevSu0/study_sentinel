# Stats Page

The Stats page provides a comprehensive and visually rich overview of the user's productivity, habits, and achievements over various time ranges.

### 12.1. Core Functionality

*   **Time Range Filtering:** Allows users to view statistics for different periods (daily, weekly, monthly, overall).
*   **Data Visualization:** Utilizes a variety of charts and graphs to present data in an easily digestible format.
*   **Performance Analysis:** Offers insights into study streaks, task completion rates, and other key performance indicators.

### 12.2. Features & Sub-features

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Time Range Tabs** | Allows users to switch between different time ranges for the displayed statistics. | - | - [`src/app/stats/page.tsx`](src/app/stats/page.tsx): `StatsPage` (line 35), `setTimeRange` (line 38) |
| **Stat Card Grid** | Displays a grid of key performance indicators. | - **Points Earned:** Total points accumulated.<br>- **Time Spent:** Total time logged.<br>- **Sessions Completed:** Total number of completed tasks and routines.<br>- **Completion Rate:** Percentage of tasks completed.<br>- **Average Session Duration:** Average time per session.<br>- **Badges Earned:** Total number of badges unlocked.<br>- **Study Streak:** Current consecutive day study streak. | - [`src/app/stats/page.tsx`](src/app/stats/page.tsx)<br>- [`src/components/stats/stat-card-grid.tsx`](src/components/stats/stat-card-grid.tsx): `StatCardGrid` (line 26)<br>- [`src/hooks/use-stats.ts`](src/hooks/use-stats.ts) |
| **Study Activity Chart** | A bar chart visualizing the user's study hours over the selected time range. | - | - [`src/app/stats/page.tsx`](src/app/stats/page.tsx)<br>- [`src/components/stats/weekly-chart.tsx`](src/components/stats/weekly-chart.tsx): `StudyActivityChart` (line 13) |
| **Productivity Pie Chart** | A pie chart that breaks down the user's time spent on different tasks and routines. | - | - [`src/app/stats/page.tsx`](src/app/stats/page.tsx)<br>- [`src/components/dashboard/productivity-pie-chart.tsx`](src/components/dashboard/productivity-pie-chart.tsx): `ProductivityPieChart` |
| **Daily Activity Timeline** | A timeline chart that visualizes the user's productive sessions over a 24-hour period. | - | - [`src/app/stats/page.tsx`](src/app/stats/page.tsx)<br>- [`src/components/stats/daily-activity-timeline.tsx`](src/components/stats/daily-activity-timeline.tsx): `DailyActivityTimeline` |
| **Badge Collection** | Displays all earned and unearned badges, categorized for easy viewing. | - | - [`src/app/stats/page.tsx`](src/app/stats/page.tsx)<br>- [`src/components/stats/badge-collection.tsx`](src/components/stats/badge-collection.tsx): `BadgeCollection` |
| **Performance Coach** | Provides AI-driven insights and comparisons of the user's performance. | - | - [`src/app/stats/page.tsx`](src/app/stats/page.tsx)<br>- [`src/components/stats/performance-coach.tsx`](src/components/stats/performance-coach.tsx): `PerformanceCoach` |

### 12.3. Inter-component and Feature Element References

*   `StatsPage` uses `setTimeRange` to control the data displayed by `StatCardGrid`, `StudyActivityChart`, `ProductivityPieChart`, and `DailyActivityTimeline`.
*   `use-stats.ts` is a central hook for fetching and processing statistical data, which is then consumed by various display components.
*   `BadgeCollection` and `PerformanceCoach` are integrated as distinct components within the `StatsPage`.

### 12.4. Impacting and Dependent Factors

*   **Time Range Selection:** The `timeRange` state is the primary filter for all displayed statistics. Changes to this state trigger re-calculation and re-rendering of all charts and KPIs.
*   **Raw Activity Data:** All charts and KPIs depend on comprehensive historical data of tasks, routines, and logged sessions. The accuracy and completeness of this underlying data are critical.
*   **`use-stats.ts` Logic:** This hook is critical for aggregating, calculating, and formatting the raw data into meaningful statistics. Its performance directly impacts the responsiveness of the Stats page.
*   **Chart Libraries:** External chart libraries (implicitly used by components like `weekly-chart.tsx`, `productivity-pie-chart.tsx`, `daily-activity-timeline.tsx`) impact visualization capabilities and performance.
*   **AI Integration (Performance Coach):** The `PerformanceCoach` component relies on AI model capabilities to generate insights. This depends on the AI service's availability and the quality of its analysis.

### 12.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Data Aggregation & Calculation (`use-stats.ts`):** This hook should contain highly optimized functions for:
    *   **Filtering Data (Micro-function):** Efficiently filter raw activity data based on the selected `timeRange`.
    *   **KPI Calculation (Micro-functions):** Separate, pure functions for calculating each key performance indicator (e.g., `calculatePointsEarned`, `calculateTimeSpent`, `calculateCompletionRate`, `calculateStudyStreak`). These should be robust and handle edge cases like no data or incomplete data.
    *   **Chart Data Preparation (Micro-functions):** Functions to transform raw data into the specific formats required by each chart component (e.g., `prepareWeeklyChartData`, `preparePieChartData`, `prepareTimelineData`). These should ensure data integrity and correct scaling for visualization.
    *   **Example (Calculate Study Streak):**
        ```typescript
        interface ActivityLog {
            timestamp: string;
            // Define other properties of ActivityLog here
        }

        function calculateStudyStreak(activityLogs: ActivityLog[]): number {
            if (activityLogs.length === 0) {
                return 0;
            }

            let streak = 0;
            let lastDate: Date | null = null;

            // Sort logs by date in descending order to process chronologically
            const sortedLogs = [...activityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            for (const log of sortedLogs) {
                const currentDate = new Date(log.timestamp);
                currentDate.setHours(0, 0, 0, 0); // Normalize to start of day for consistent comparison

                if (!lastDate) {
                    streak = 1; // Start streak with the first log
                } else {
                    const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        streak++; // Consecutive day
                    } else if (diffDays > 1) {
                        break; // Gap in streak, break the loop
                    }
                    // If diffDays is 0, it's the same day, continue without incrementing streak
                }
                lastDate = currentDate;
            }
            return streak;
        }
        ```
*   **AI Insight Generation (within `PerformanceCoach` or a dedicated action):** Similar to the Daily Briefing, this should involve prompt engineering and Gemini API calls to generate performance insights and comparisons. It should handle the input of statistical data and the output of natural language insights, including edge cases where data might be insufficient for meaningful analysis.
*   **Component Reusability:** Chart components (`WeeklyChart`, `ProductivityPieChart`, `DailyActivityTimeline`) should be reusable and accept data as props, allowing them to be used across different pages or contexts without tight coupling.
*   **State Management:** `setTimeRange` should update the global or local state, triggering data recalculations and UI updates efficiently, potentially debouncing or throttling updates for performance.

### 12.6. Future Enhancements/Considerations

*   **Customizable Dashboards:** Allow users to create custom dashboards with specific charts and KPIs from the Stats page.
*   **Goal Tracking Integration:** Visualize progress towards specific user-defined goals directly on the Stats page, showing targets and current achievements.
*   **Comparative Analysis:** Allow users to compare their performance against previous periods (e.g., last week vs. this week) or anonymized aggregate data from other users.
*   **Exportable Reports:** Provide options to export statistical data or generated reports (e.g., PDF, CSV) for external use.
*   **Predictive Analytics:** AI-powered predictions on future performance or potential areas for improvement based on historical data and trends.
*   **Detailed Drill-down:** Enable users to click on chart segments or KPI cards to view more granular data.