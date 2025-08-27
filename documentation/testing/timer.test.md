# Testing Documentation: Timer Page (`/timer`)

**Test File:** `src/app/timer/__tests__/timer.test.tsx`

## Overview

The test suite for the `TimerPage` component is designed to be comprehensive, ensuring 100% test coverage of all functionalities, user interactions, and visual states. This document outlines the testing strategy, mocking approach, and the specific scenarios covered.

## Testing Strategy

The strategy focuses on isolating the `TimerPage` as a unit while verifying its integration with key hooks and child components. This is achieved through a robust mocking strategy that allows for precise control over the component's environment and props.

### Mocking Approach

-   **Child Components (`MotivationalQuote`, `TimerControls`, `StopTimerDialog`):** These are mocked as simple functional components. This approach prevents the tests from breaking due to implementation changes in child components and allows for direct assertions on the props they receive (e.g., `isPaused`) and the callbacks they trigger (`onComplete`, `onStop`).

-   **`lucide-react` Icons:** All icons are replaced with simple `<div>` elements containing a `data-testid`. This significantly improves test performance and avoids errors related to rendering complex SVG paths in a JSDOM environment.

-   **`useWakeLock` Hook:** This hook is custom-mocked to spy on its lifecycle. The mock uses a `useEffect` to call a `mockRequestWakeLock` function on mount and a `mockReleaseWakeLock` function on unmount, allowing the tests to assert that the component correctly manages the screen wake lock.

-   **Core Hooks (`useGlobalState`, `useRouter`):** These hooks are mocked to provide a controlled environment. `useGlobalState` supplies the necessary state (e.g., `activeItem`, `isPaused`, `isMuted`) for each test case, while `useRouter` provides mock `back` and `replace` functions to test navigation logic.

## Covered Test Scenarios

The test suite is organized into `describe` blocks to cover all aspects of the component's behavior:

1.  **Initial Render:**
    -   Verifies that the active item's title, the time display, and the motivational quote are rendered correctly.
    -   Confirms that the page redirects to the homepage (`/`) if no `activeItem` is present in the global state.

2.  **Lifecycle and Hooks:**
    -   Asserts that the `useWakeLock` hook is called to request a wake lock on mount and release it on unmount.

3.  **User Interactions:**
    -   **Pause/Resume:** Tests that the main control button correctly displays "Pause" or "Resume" based on the `isPaused` state and calls `togglePause` on click.
    -   **Complete:** Ensures that clicking the "Complete" button calls both `completeTimer` and `router.back`.
    -   **Stop:** Fully tests the `StopTimerDialog` flow, including:
        -   Pausing the timer if it was running when "Stop" was clicked.
        -   Opening the dialog.
        -   Confirming the stop action, which should call `stopTimer` with a reason and `router.back`.
        -   Canceling the dialog.
    -   **Mute/Unmute:** Confirms the mute button toggles correctly and calls `toggleMute`.
    -   **Exit Fullscreen:** Verifies that the shrink button calls `router.back`.

4.  **Visual States:**
    -   **Overtime:** Checks that the timer display receives the correct `text-destructive` class when `isOvertime` is true.
    -   **Star Count & Animation:**
        -   Asserts that the star count and icon are displayed only when `starCount > 0`.
        -   Asserts that the star animation element is rendered when `showStarAnimation` is true.
    -   **Dynamic Font Size:** Verifies that the correct CSS class is applied to the time display based on the length of the time string.