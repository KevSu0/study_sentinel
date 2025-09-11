# Confetti Provider Test Suite

**## Objective**
This test suite validates that the ConfettiProvider correctly manages and renders a confetti animation effect in response to user actions, ensuring a rewarding user experience.

**## Scope**
- **In Scope:**
  - `ConfettiProvider`: The main context provider component.
  - `useConfetti`: The hook used to access the confetti context.
  - Firing the confetti animation via the `fire` function.
  - Hiding the confetti after the animation completes.
  - Responsive behavior to window resize events.
  - Cleanup of event listeners on component unmount.
- **Out of Scope:**
  - The `react-confetti` library, which is mocked to simulate its behavior without rendering actual confetti.
  - The visual appearance of the confetti animation itself.

**## Prerequisites**
- The test environment is configured with Jest and React Testing Library.
- The `jest.mock` function is used to provide a mock implementation of the `react-confetti` library.

**## Test Scenarios**

1.  **Condition:** The `useConfetti` hook is called from a component that is not a descendant of `ConfettiProvider`.
    **Action:** The component is rendered.
    **Expected Outcome:** The hook throws an error with the message "useConfetti must be used within a ConfettiProvider".

2.  **Condition:** The `ConfettiProvider` is rendered with child components.
    **Action:** The component tree is rendered.
    **Expected Outcome:** The child components are visible in the DOM.

3.  **Condition:** The `ConfettiProvider` is rendered, and the window has a valid size.
    **Action:** The `fire` function is called from a consumer component.
    **Expected Outcome:** The mock confetti component is rendered in the DOM.

4.  **Condition:** The confetti animation is active.
    **Action:** The `onConfettiComplete` callback is invoked by the mock `react-confetti` component.
    **Expected Outcome:** The mock confetti component is removed from the DOM.

5.  **Condition:** The `ConfettiProvider` is rendered, and the initial window size is zero.
    **Action:** The window is resized to a valid size, and the `fire` function is called.
    **Expected Outcome:** The mock confetti component is rendered in the DOM.

6.  **Condition:** The `ConfettiProvider` is mounted.
    **Action:** The component is unmounted.
    **Expected Outcome:** The 'resize' event listener is removed from the window object to prevent memory leaks.

**## Rationale**
- **Mocking `react-confetti`:** The `react-confetti` library is mocked to isolate the tests to the `ConfettiProvider`'s logic. The mock captures the `onConfettiComplete` callback, allowing tests to simulate the end of the confetti animation and verify that the provider correctly hides the component.
- **Global Error Suppression:** `console.error` is temporarily suppressed in the `beforeEach` block to prevent Jest from logging the expected error when testing the `useConfetti` hook's error-throwing behavior. This keeps the test output clean.
- **Window Resizing:** The tests for window resizing explicitly use `act` to set the window dimensions and dispatch a 'resize' event. This ensures that React processes the state updates triggered by the event before assertions are made, accurately simulating the component's responsive behavior.