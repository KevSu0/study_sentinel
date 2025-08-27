# Customizable Dashboard

The main dashboard (`app/page.tsx`) is a customizable space where users can arrange widgets to see the information that is most important to them.

- **Drag-and-Drop Interface**: Users can reorder widgets to their liking.
- **Widget Visibility**: Users can show or hide individual widgets.
- **Available Widgets**:
  - Daily Briefing / Quote
  - Statistics Overview
  - Badges Unlocked Today
  - Today's Routines & Plan
  - Today's Activity Feed
  - Achievement Countdown
  - Daily Active Productivity
- **Persistence**: The user's layout is saved to `localStorage`.

- **Implementation**:
  - **UI**: `app/page.tsx` uses `@dnd-kit/core` for drag-and-drop functionality.
  - **State Management**: The `hooks/use-dashboard-layout.tsx` hook manages the layout's state and persistence.