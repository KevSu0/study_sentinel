# Test Suite: `StatsPage`

This document outlines the test suite for the `StatsPage` component, located in `src/app/stats/__tests__/stats.test.tsx`.

## Objective

The primary goal of this test suite is to ensure the `StatsPage` component renders correctly and all interactive elements function as expected. This includes testing different data states (loading, empty, and populated), view switching, and date navigation.

## Mocks

### `use-global-state`

The `use-global-state` hook is mocked to provide controlled state for testing various scenarios, such as:
-   Initial loading state.
-   State with no statistical data.
-   Populated state with sample data.

### `@radix-ui/react-tabs`

The Radix UI `Tabs` component is mocked to allow for testing the tab-switching functionality without relying on the actual implementation. The mock simulates the behavior of `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent`, enabling tests to verify that the correct content is displayed when a tab is selected.

### `lucide-react`

The `lucide-react` library is manually mocked in `__mocks__/lucide-react.js` to handle an ES Module issue with Jest. The mock replaces the actual icons with simple `div` elements containing a `data-testid` attribute, allowing tests to find and interact with icon-based controls (e.g., date navigation buttons).

## Test Scenarios

### 1. Initial Render States

-   **Loading State:** Verifies that loading skeletons are displayed when the global state is not yet loaded.
-   **Empty State:** Ensures the component handles cases where there are no stats to display, showing the appropriate message.

### 2. "Today" View

-   **Component Rendering:** Checks that all expected components for the "Today" view are rendered correctly with data.
-   **Calendar Interaction:** Simulates a date change using the calendar and verifies that the component updates to show data for the selected date.
-   **Date Navigation:**
    -   Tests the "previous day" button, ensuring the date updates correctly.
    -   Tests the "next day" button, ensuring the date updates correctly.
    -   Verifies that the correctly formatted date is displayed when the selected date is not today.

### 3. Other Time Range Views

-   **"Last 7 Days", "Last 30 Days", "Overall":** For each of these views, a test verifies that:
    -   The view renders the correct components.
    -   The `useStats` hook is called with the appropriate parameters for that time range.

This comprehensive suite ensures the reliability and correctness of the `StatsPage` component across its various states and functionalities.

---

## Test Results

The test suite was executed successfully with the following results:

-   **Test Suites:** 1 passed, 1 total
-   **Tests:** 10 passed, 10 total
-   **Coverage for `src/app/stats/page.tsx`:**
    -   **Statements:** 100%
    -   **Branches:** 100%
    -   **Functions:** 100%
    -   **Lines:** 100%

All tests passed, and 100% test coverage for the target component was achieved.