# Timer Page

The Timer page provides a fullscreen, immersive experience for focused work sessions. It is automatically displayed when a timer is started for a task or routine.

### 14.1. Core Functionality

*   **Fullscreen Display:** Minimizes distractions by taking over the entire screen.
*   **Wake Lock:** Prevents the screen from sleeping while the timer is active.
*   **Interactive Controls:** Provides a full set of controls for managing the active timer.

### 14.2. Features & Sub-features

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Header** | Displays controls for muting the timer and exiting the fullscreen view. | - | - [`src/app/timer/page.tsx`](src/app/timer/page.tsx): `TimerPage` (line 55)<br>- [`src/hooks/use-global-state.ts`](src/hooks/use-global-state.ts): `toggleMute` |
| **Timer Display** | Shows the title of the active task or routine and the remaining time. | - **Overtime Indicator:** The timer turns red and starts counting up if the session goes over the allotted time. | - [`src/app/timer/page.tsx`](src/app/timer/page.tsx)<br>- [`src/hooks/use-global-state.ts`](src/hooks/use-global-state.ts): `timeDisplay`, `isOvertime` |
| **Hourglass Animation** | A visual representation of the timer's progress. | - | - [`src/app/timer/page.tsx`](src/app/timer/page.tsx): `Hourglass` (line 16)<br>- [`src/hooks/use-global-state.ts`](src/hooks/use-global-state.ts): `timerProgress` |
| **Timer Controls** | A set of buttons for managing the timer session. | - **Pause/Resume:** Toggles the timer's paused state.<br>- **Complete:** Marks the task as complete.<br>- **Stop:** Opens a dialog to stop the timer and provide a reason. | - [`src/app/timer/page.tsx`](src/app/timer/page.tsx)<br>- [`src/components/tasks/timer-controls.tsx`](src/components/tasks/timer-controls.tsx): `TimerControls` (line 14)<br>- [`src/hooks/use-global-state.ts`](src/hooks/use-global-state.ts): `togglePause`, `completeTimer`, `stopTimer`<br>- [`src/components/tasks/stop-timer-dialog.tsx`](src/components/tasks/stop-timer-dialog.tsx): `StopTimerDialog` |
| **Motivational Quote** | Displays a motivational quote to inspire the user. | - | - [`src/app/timer/page.tsx`](src/app/timer/page.tsx)<br>- [`src/components/shared/motivational-quote.tsx`](src/components/shared/motivational-quote.tsx): `MotivationalQuote` |

### 14.3. Inter-component and Feature Element References

*   `TimerPage` is the main container, pulling timer-related state (`timeDisplay`, `isOvertime`, `timerProgress`) and actions (`toggleMute`, `togglePause`, `completeTimer`, `stopTimer`) from `use-global-state.ts`.
*   It integrates `Hourglass` for visual feedback, `TimerControls` for user interaction, `StopTimerDialog` for stopping with a reason, and `MotivationalQuote` for inspiration.
*   `TimerControls` itself uses the timer actions from `use-global-state.ts`.

### 14.4. Impacting and Dependent Factors

*   **Global Timer State:** The entire page's functionality is dependent on the active timer's state (running, paused, remaining time, overtime status). Any inconsistencies in this state will directly affect the Timer page.
*   **Wake Lock API:** Browser support for Wake Lock is crucial for preventing screen sleep during long sessions. If not supported, the user experience might be degraded.
*   **Sound Settings:** The `toggleMute` function impacts audio feedback (timer ticks, alarms). This depends on the settings configured in the Settings page.
*   **`StopTimerDialog` Input:** The ability to stop a timer and provide a reason impacts the logging of incomplete sessions and subsequent statistical analysis.

### 14.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Timer Logic (within `use-global-state.ts`):** This hook should encapsulate all core timer logic:
    *   **Start/Stop/Pause/Resume (Micro-functions):** Manage the timer's lifecycle, including setting up and clearing intervals/timeouts. These should be idempotent.
    *   **Time Calculation (Micro-function):** Continuously calculate `timeDisplay`, `isOvertime`, and `timerProgress` based on the elapsed time and total duration. This should be highly optimized to prevent UI jank.
    *   **Wake Lock Management (Sub-micro function):** Acquire and release wake lock using the browser's Wake Lock API, ensuring the screen stays on only when necessary.
    *   **Sound Playback (Sub-micro function):** Play timer tick and alarm sounds based on user settings, handling audio loading and playback errors.
    *   **Session Logging:** Log timer start, pause, resume, stop, and completion events to the activity log, including relevant metadata (e.g., task ID, duration).
*   **UI Updates:** Functions should efficiently update the UI based on timer state changes, using reactive patterns (e.g., React state updates).
*   **Dialog Management:** `stopTimer` should trigger the `StopTimerDialog` and handle the reason for stopping, ensuring the reason is captured and associated with the logged event.
*   **Motivational Quote Selection:** `MotivationalQuote` component should have a mechanism to fetch or select quotes, potentially from a predefined list or an external API, and display them dynamically.

### 14.6. Future Enhancements/Considerations

*   **Customizable Timer Sounds:** Allow users to select from a wider range of timer tick and alarm sounds.
*   **Visual Themes:** Offer different visual themes or backgrounds for the fullscreen timer.
*   **Pomodoro Integration:** Implement built-in Pomodoro timer functionality with configurable work/break intervals.
*   **Task Switching:** Allow users to switch between active tasks directly from the Timer page.
*   **Distraction Blocking:** Integrate with browser APIs to block distracting websites during active timer sessions.
*   **Haptic Feedback:** Provide haptic feedback on timer events for mobile devices.