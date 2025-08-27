# Test Documentation: `useGlobalState`

**## Objective**
This test suite validates the core application state management logic within the `useGlobalState` hook, ensuring reliable state transitions and side effects for tasks, routines, timers, and user profile data.

**## Scope**
- **In Scope:**
  - `GlobalStateProvider` initialization and state loading from `localStorage`.
  - All exported actions from `useGlobalState`, including:
    - Task management (add, update, archive, unarchive, push).
    - Routine management (add, update, delete).
    - Timer lifecycle (start, pause, resume, stop, complete, manual completion).
    - Profile, Badge, and Log management.
    - Sound settings and mute functionality.
  - Correct derivation of state (e.g., `todaysPoints`, `todaysBadges`).
  - Side effects like toast notifications and confetti.

- **Out of Scope:**
  - The React components that consume the hook (they are only used for rendering the provider).
  - The actual implementation of `localStorage`.
  - The UI of `react-hot-toast` notifications.
  - The visual effect of the `confetti-provider`.
  - Implementations of library functions from `@/lib/badges` and `@/lib/motivation`, which are mocked.
  - The browser's `Audio` API.

**## Prerequisites**
- **Jest Environment:** The tests must be run in a Jest environment configured for React, typically using `npm test`.
- **Mocked `localStorage`:** A global mock of `window.localStorage` is set up to isolate tests from the actual browser storage and ensure predictable state.
- **Mocked Modules:** `react-hot-toast`, `confetti-provider`, and other utility libraries are mocked to prevent external side effects and focus on the hook's logic.

**## Test Scenarios**

1.  **Scenario: Adding a new task**
    *   **Condition:** The application state is initialized.
    *   **Action:** The `addTask` action is called with valid new task data.
    *   **Expected Outcome:** The task count in the global state increases by one, and the new task is persisted to the mocked `localStorage`.

2.  **Scenario: Starting and completing a countdown timer for a task**
    *   **Condition:** A task exists in the state.
    *   **Action:** The `startTimer` action is called with the task, time is advanced with `jest.advanceTimersByTime`, and then `completeTimer` is called.
    *   **Expected Outcome:** The `activeItem` in the state is set and then cleared, the task's status is updated to 'completed', points are awarded via a toast notification, and the confetti effect is fired.

3.  **Scenario: Unlocking a badge**
    *   **Condition:** The `checkBadge` utility is mocked to return `true`, and a user action (like completing a task) that triggers a badge check is performed.
    *   **Action:** The `completeTimer` action is called.
    *   **Expected Outcome:** A "Badge Unlocked" toast notification is displayed, the confetti effect is fired, and the badge's ID is added to the `earnedBadges` map in both the state and `localStorage`.

**## Rationale**
- **`renderHookWithProvider`:** The `useGlobalState` hook is a "headless" component, meaning it contains logic but no UI. To test it in isolation, we use `renderHook` from React Testing Library. This allows us to call its actions and assert on its state directly without needing to render a full component tree for every test. The custom `renderHookWithProvider` helper ensures the hook is always wrapped within the necessary `GlobalStateProvider` and `ConfettiProvider`.
- **`act()` Wrapper:** State updates in React are asynchronous. To ensure that our tests wait for these updates to be processed before making assertions, all calls to the hook's actions are wrapped in `act()`. This simulates the React event loop and prevents race conditions in the tests.
- **State Assertion Strategy:** Initial tests attempted to verify state changes by checking the UI of a `TestConsumer` component. This proved brittle because the component rendered by `render` and the hook rendered by `renderHook` did not share the same state instance. The tests were refactored to assert directly on the `result.current.state` object returned by `renderHook`, leading to more robust and direct tests.