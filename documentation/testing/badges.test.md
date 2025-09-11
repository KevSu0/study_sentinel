## Objective
This test suite validates that the badge earning logic correctly evaluates user data against a badge's conditions to determine if it has been earned.

## Scope
- **In Scope:**
  - `checkBadge(badge, data)`: The primary function for evaluating a single badge.
  - `getAllCompletedWork(tasks, logs)`: The internal helper function that aggregates all study-related activities.
- **Out of Scope:**
  - The actual database or state management from which tasks and logs are fetched.
  - The UI components that display the badges.
  - The `date-fns` library functions, which are assumed to work correctly.

## Prerequisites
- Tests rely on a mocked system time set via `jest.setSystemTime()` to ensure consistent date-based calculations (e.g., 'DAY', 'WEEK', 'MONTH').

## Test Scenarios
1.  **Condition:** A badge is marked as `isEnabled: false`.
    **Action:** The `checkBadge` function is called with any user data.
    **Expected Outcome:** The function immediately returns `false`.

2.  **Condition:** A badge has multiple conditions, such as completing 2 tasks and studying for 60 minutes in a day.
    **Action:** The `checkBadge` function is called with data that satisfies all conditions.
    **Expected Outcome:** The function returns `true`.

3.  **Condition:** A badge has multiple conditions, but the user data only satisfies one of them.
    **Action:** The `checkBadge` function is called.
    **Expected Outcome:** The function returns `false`.

4.  **Condition:** A badge requires a 3-day study streak. The user has logged activity for the last 3 consecutive days.
    **Action:** The `checkBadge` function is called.
    **Expected Outcome:** The function returns `true`.

5.  **Condition:** A badge requires completing all tasks on a given day. The user has two tasks for yesterday, one 'completed' and one 'todo'.
    **Action:** The `checkBadge` function is called.
    **Expected Outcome:** The function returns `false` because not all of yesterday's tasks were completed.

## Rationale
- **Mock Data:** The suite uses helper functions (`createTask`, `createLog`) to generate consistent mock data for tasks and logs. This isolates the tests from external data sources and makes them predictable.
- **Time Mocking:** `jest.useFakeTimers()` and `jest.setSystemTime()` are used to control the "current" date. This is critical for testing time-sensitive conditions like 'DAY', 'WEEK', and 'DAY_STREAK' without the tests breaking as time passes.
- **Implicit Helper Testing:** The `getAllCompletedWork` helper function is not tested directly. Instead, its logic is implicitly validated by the tests for conditions like `TOTAL_STUDY_TIME`, which rely on its output. This approach focuses on the externally visible behavior of the `checkBadge` function.

---

### `BadgeDialog` Component Tests

#### Objective
This suite validates the `BadgeDialog` component, which is responsible for creating and editing badges.

#### Scope
- **In Scope:**
  - Rendering in "create" and "edit" modes.
  - Form submission for creating and updating badges.
  - Form validation and error handling.
  - UI interactions, such as switching condition types.
- **Out of Scope:**
  - The `IconPicker` and `DurationInput` components, which are mocked.
  - The `react-hot-toast` notification system, which is mocked.

#### Test Scenarios
1.  **Condition:** The dialog is opened without a `badgeToEdit` prop.
    **Action:** The component renders.
    **Expected Outcome:** The dialog displays in "create" mode with a title of "Create a new badge" and empty form fields.

2.  **Condition:** The dialog is opened with a `badgeToEdit` prop.
    **Action:** The component renders.
    **Expected Outcome:** The dialog displays in "edit" mode with the title "Edit badge" and the form fields are populated with the badge's data.

3.  **Condition:** The user fills out the form in "create" mode with valid data and submits.
    **Action:** The `onAddBadge` function is called.
    **Expected Outcome:** The `onAddBadge` function is called with the correct new badge data.

4.  **Condition:** The user edits the form in "edit" mode with valid data and submits.
    **Action:** The `onUpdateBadge` function is called.
    **Expected Outcome:** The `onUpdateBadge` function is called with the badge's ID and the updated data.

5.  **Condition:** The user submits the form with invalid data (e.g., name too short).
    **Action:** Validation errors are displayed.
    **Expected Outcome:** The component displays the appropriate validation error messages.

6.  **Condition:** The user changes the "Condition Type" dropdown to "Total Study Time".
    **Action:** The UI updates.
    **Expected Outcome:** The `DurationInput` component is rendered, and the standard "Target (Count)" input is removed.