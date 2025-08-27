# Comprehensive Statistics and Analytics

The application provides a detailed statistics page (`app/stats/page.tsx`) for users to analyze their performance.

- **Time Range Filtering**: Users can view stats for different periods: Daily, Weekly, Monthly, and Overall.
- **Key Metrics**:
  - Total study hours, points earned, and sessions completed.
  - Task completion rate and average session duration.
  - **Focus Score**: A percentage representing productive time vs. paused time.
- **Data Visualizations**:
  - **Productivity Pie Chart**: Breaks down time spent on different tasks and routines for a given day.
  - **Activity Timeline**: A visual representation of study sessions throughout the day.
  - **Bar Charts**: Show study hours over the last 7 or 30 days, or monthly for the overall view.
  - **Performance Comparison**: Compares today's stats (duration, points, start/end times) with yesterday and historical averages.
- **Study Streak**: Tracks the number of consecutive days a user has studied.

- **Implementation**:
  - **UI**: `app/stats/page.tsx` and various components in `src/components/stats/`.
  - **Logic**: All calculations are performed in the `hooks/use-stats.tsx` hook, which queries data directly from the repositories.