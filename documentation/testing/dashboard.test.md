# Test Documentation: `dashboard.test.tsx`

This document outlines the test suite for the `DashboardPage` component, located in `src/app/__tests__/dashboard.test.tsx`.

## Objective

The primary objective of this test suite is to ensure the `DashboardPage` component renders correctly under various conditions and that all user interactions function as expected. The suite aims for 100% test coverage.

## Test Environment Setup

The test environment is configured with the following mocks to isolate the `DashboardPage` component and control its dependencies:

-   **Hooks:** `useGlobalState` and `useDashboardLayout` are mocked to provide controlled state and layout data to the component.
-   **`@dnd-kit/core`:** The drag-and-drop context is mocked to allow for testing of widget reordering without a full DOM implementation.
-   **Child Widgets:** All dashboard widgets (e.g., `DailyBriefingWidget`, `StatsOverviewWidget`) are replaced with simple `div` elements to simplify the test and focus on the dashboard's layout logic.
-   **`lucide-react`:** All icons are mocked to prevent rendering errors in the test environment.
-   **`window.matchMedia`:** This browser API is mocked as it is not available in JSDOM.
-   **`AddItemDialog`:** This complex component is mocked to simplify the test and avoid rendering its extensive dependency tree.

## Test Cases

The following test cases are covered in this suite:

1.  **`should render visible widgets with their actual content`**
    -   **Purpose:** Verifies that all widgets marked as `isVisible: true` in the layout configuration are rendered correctly.
    -   **Assertions:** Checks for the presence of the mocked widget content.

2.  **`should not render widgets that are marked as not visible`**
    -   **Purpose:** Ensures that widgets with `isVisible: false` are not rendered to the DOM.
    -   **Assertions:** Confirms that the content of the hidden widget is not present.

3.  **`should open and close the customize dialog`**
    -   **Purpose:** Tests the functionality of the "Customize" button and the subsequent opening and closing of the `CustomizeDialog`.
    -   **Assertions:**
        -   Checks for the dialog's title when opened.
        -   Simulates an "Escape" key press to close the dialog.
        -   Verifies that the dialog's title is no longer present after closing.

4.  **`should open the add item dialog`**
    -   **Purpose:** Ensures that the "Add Item" button is present and functional.
    -   **Assertions:** Verifies the presence of the "Add Item" button.

5.  **`should show the empty state and a link to plans when no content exists`**
    -   **Purpose:** Tests the component's behavior when there are no tasks or routines to display.
    -   **Assertions:**
        -   Checks for the empty state message.
        -   Verifies that the link to the `/plans` page is present and has the correct `href` attribute.

6.  **`should show loading skeletons when data is not loaded`**
    -   **Purpose:** Verifies that the component displays a loading state when its data has not yet been loaded.
    -   **Assertions:** Checks that the main content is not rendered, implying the loading skeletons are visible.

7.  **`should reorder widgets on drag and drop`**
    - **Purpose:** Tests the drag-and-drop functionality for reordering widgets.
    - **Assertions:**
        -   Simulates a `dragEnd` event.
        -   Verifies that the `setLayout` function is called with the correctly reordered layout.

---

### `CustomizeDialog` Component Tests

#### Objective
This suite validates the `CustomizeDialog` component, which allows users to show or hide dashboard widgets.

#### Scope
- **In Scope:**
  - Toggling the visibility of widgets.
  - Disabling the drag-and-drop functionality for the "Today's Plan" widget.
- **Out of Scope:**
  - The actual reordering of widgets, which is handled by the main dashboard component.

#### Test Scenarios
1.  **Condition:** The user clicks the toggle switch for a widget.
    **Action:** The `onLayoutChange` function is called.
    **Expected Outcome:** The `onLayoutChange` function is called with the updated layout, reflecting the new visibility state of the widget.

2.  **Condition:** The "Today's Plan" widget is rendered in the dialog.
    **Action:** The component renders.
    **Expected Outcome:** The drag handle for the "Today's Plan" widget is disabled, preventing it from being reordered.