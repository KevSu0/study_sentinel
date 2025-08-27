## Objective
This test suite provides comprehensive validation for the `useGlobalState` hook and its provider, which together form the core state management system for the application. The tests ensure reliable state initialization, manipulation, persistence, and derivation under a wide variety of conditions and user interactions.

## Scope
- **In Scope:** 
  - `GlobalStateProvider` component, including all its internal logic.
  - `useGlobalState` hook.
  - All state actions (e.g., `addTask`, `startTimer`, `updateProfile`).
  - Derivation of state (e.g., `todaysPoints`, `todaysActivity`).
- **Out of Scope:** 
  - `localStorage` API (mocked).
  - `react-hot-toast` (mocked).
  - `useConfetti` hook (mocked).
  - Implementations of `checkBadge` and `getRandomMotivationalMessage` (mocked).
  - The browser's `Audio` API (mocked).

## Prerequisites
- The test environment uses `jest.useFakeTimers()` to control time-based events like the timer countdown and milestone checks.
- `localStorage` is mocked to provide a clean, controllable storage environment for each test.
- All external dependencies and providers are mocked to isolate the `useGlobalState` hook's logic.
- `crypto.randomUUID` is mocked to provide predictable IDs for new items.

## Test Scenarios
1.  **Condition:** `localStorage` contains corrupted or invalid JSON for one of the state keys.
    **Action:** The `GlobalStateProvider` initializes.
    **Expected Outcome:** The provider catches the parsing error, logs it, clears *all* related storage keys to prevent a cascading failure state, and initializes with a default, empty state.

2.  **Condition:** An infinity timer is running for a task.
    **Action:** The `completeTimer` function is called.
    **Expected Outcome:** The task is marked as 'completed'. The points are calculated based on the elapsed time and the task's priority, not the pre-set points value. A success toast is shown, and confetti is fired.

3.  **Condition:** A log entry exists for a task or routine that has since been deleted from the main state.
    **Action:** The `todaysActivity` derived state is calculated.
    **Expected Outcome:** The activity feed item is still generated based on the log, but the associated `task` or `routine` data within that item is `undefined`. The application does not crash.

## Rationale & Corrections
- **Error Resilience:** The test for corrupted `localStorage` is critical. It validates that a single piece of bad data doesn't corrupt the entire user session. The strategy to wipe all related keys on failure is a deliberate choice to favor a clean slate over a potentially broken, partially-loaded state.
- **Infinity Timer Point Calculation:** Testing the point calculation for infinity timers ensures that users are rewarded correctly for open-ended study sessions, a key feature of the timer system. It validates that the logic correctly uses elapsed time and priority multipliers.
- **State Derivation from Logs:** The `todaysActivity` feed is derived from logs, not just the current task list. The test for a deleted task's log ensures the history remains accurate and the UI doesn't crash, even if the source data changes. This makes the activity feed a more robust "source of truth" for past events.
- **Asynchronous State Updates:** Several tests were failing due to race conditions where assertions were made before asynchronous state updates had completed. These were fixed by wrapping the assertions in `waitFor` blocks from `@testing-library/react`, ensuring the tests wait for the UI and state to settle.
- **Correct Task Object Reference:** Tests for updating and completing tasks were failing because they were using stale task objects from the initial test setup. The fix involved retrieving the newly created task object from the hook's state *after* the `addTask` action, ensuring that subsequent actions like `updateTask` were performed on the correct, state-managed object.
- **Sound Initialization:** A bug was fixed where tick sound URLs were missing from the `soundFiles` constant in the hook's source. This prevented the `Audio` object from being created correctly, causing the sound-related test to fail. Adding the correct URLs resolved the issue.