# Interactive Timer

The application features a robust, interactive timer for tracking study sessions.

- **Fullscreen Timer Page**: A dedicated, distraction-free timer view (`app/timer/page.tsx`) with a large time display and an animated hourglass SVG.
- **Timer Controls**: Users can start, pause, resume, and stop the timer.
- **Motivational Elements**: Displays random motivational quotes during sessions to keep users engaged.
- **Milestone Rewards**:
  - **Stars**: Users earn stars for every 30 minutes of focused work.
  - **Notifications**: Provides periodic notifications to maintain focus.
- **Screen Wake Lock**: Utilizes the Screen Wake Lock API (`hooks/use-wake-lock.ts`) to prevent the screen from sleeping during active sessions.

- **Implementation**:
  - **UI**: `app/timer/page.tsx`, `components/hourglass.tsx`.
  - **Logic**: All timer state and logic are managed in `hooks/use-global-state.tsx`.