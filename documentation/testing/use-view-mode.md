# Test Suite Documentation: `useViewMode`

## Overview

This document outlines the test suite for the `useViewMode` custom hook, which is responsible for managing and persisting the view preference for task displays (either 'card' or 'list'). The hook leverages React Context to provide the view mode state and a setter function to its consumers, while using the browser's `localStorage` to ensure the user's preference is remembered across sessions.

The test suite is designed to be comprehensive, ensuring the hook is robust, reliable, and handles edge cases gracefully. It uses `@testing-library/react` for rendering the hook within a test environment and `jest` for mocking and assertions.

## Test Setup (`beforeEach` / `afterEach`)

To ensure test isolation and a clean environment for each test case, the following setup is performed:

-   **`beforeEach`**:
    -   A spy is placed on `console.error` to prevent expected error messages from cluttering the test output and to allow for assertions on error logging.
    -   `localStorage.clear()` is called to remove any stored data from previous tests, guaranteeing that each test starts with a predictable storage state.
-   **`afterEach`**:
    -   The `console.error` spy is restored to its original implementation.
    -   `jest.clearAllMocks()` is called to reset all mocks, spies, and stubs.

## Test Cases

### 1. Context Provider Enforcement

-   **`it('should throw an error if used outside of a ViewModeProvider')`**
    -   **Purpose**: To ensure the hook cannot be used without being wrapped in its corresponding `ViewModeProvider`.
    -   **Method**: The test attempts to render `useViewMode` without the provider wrapper.
    -   **Assertion**: It asserts that this action throws an `Error` with the specific message: `"useViewMode must be used within a ViewModeProvider"`.

### 2. Initialization and Default State

-   **`it('should initialize with "card" as the default viewMode and isLoaded as true')`**
    -   **Purpose**: To verify the hook's initial state when no data is present in `localStorage`.
    -   **Method**: The hook is rendered within the `ViewModeProvider`.
    -   **Assertion**: It checks that `result.current.viewMode` defaults to `'card'` and that `result.current.isLoaded` is `true` after the initial `useEffect` completes.

### 3. `localStorage` Integration

-   **`it('should load the viewMode from localStorage if it exists')`**
    -   **Purpose**: To confirm that the hook correctly retrieves and applies a valid, saved preference from `localStorage`.
    -   **Method**: `'list'` is pre-emptively saved to `localStorage` under the `VIEW_MODE_KEY`. The hook is then rendered.
    -   **Assertion**: It asserts that `result.current.viewMode` is `'list'`.

-   **`it('should ignore invalid values in localStorage and use the default')`**
    -   **Purpose**: To test the hook's resilience against corrupted or unexpected data in storage.
    -   **Method**: An invalid string (`'invalid-mode'`) is saved to `localStorage`.
    -   **Assertion**: It asserts that the hook ignores the invalid value and `result.current.viewMode` falls back to the default of `'card'`.

### 4. State Modification

-   **`it('should allow setting the view mode')`**
    -   **Purpose**: To verify that the `setViewMode` function correctly updates the state and persists the new value to `localStorage`.
    -   **Method**: The `setViewMode` function is called with `'list'` inside an `act()` block.
    -   **Assertion**: It asserts that `result.current.viewMode` becomes `'list'` and that `localStorage.getItem(VIEW_MODE_KEY)` also returns `'list'`.

### 5. Graceful Error Handling (Storage Failures)

-   **`it('should handle localStorage.getItem failure gracefully')`**
    -   **Purpose**: To ensure the application does not crash if reading from `localStorage` fails on initialization.
    -   **Method**: `Storage.prototype.getItem` is mocked to throw an error.
    -   **Assertion**: It asserts that the hook falls back to the default `'card'` view mode, `isLoaded` becomes `true`, and that the error is logged to the console.

-   **`it('should handle localStorage.setItem failure gracefully')`**
    -   **Purpose**: To ensure the application does not crash if writing to `localStorage` fails.
    -   **Method**: `Storage.prototype.setItem` is mocked to throw an error. The `setViewMode` function is then called.
    -   **Assertion**: It asserts that the in-memory state is still updated to `'list'` and that the storage-related error is logged to the console.

## Conclusion

The test suite for `useViewMode` validates all aspects of its functionality, from initial rendering and state management to persistence and error handling. The tests confirm that the hook is a stable and reliable component for managing user interface preferences.