## Objective
This test suite validates the `ProfilePage` component, ensuring users can view and update their personal information and notification settings. The tests cover form rendering, validation, submission, and interaction with sound settings.

## Scope
- **In Scope:** 
  - Rendering the profile form with data from `useGlobalState`.
  - Displaying loading skeletons when data is not yet loaded.
  - Form validation based on the `zod` schema for all fields.
  - Submitting the form and calling the `updateProfile` function.
  - Updating the notification interval and calling the `setSoundSettings` function.
  - Handling an empty initial profile state without crashing.
- **Out of Scope:** 
  - `useGlobalState` hook (mocked).
  - The actual implementation of `updateProfile` and `setSoundSettings`.
  - `react-hot-toast` notifications (mocked).
  - The UI components from `@/components/ui` (e.g., `Input`, `Select`).

## Prerequisites
- The `useGlobalState` hook is mocked to provide a controlled state for `profile`, `soundSettings`, and `isLoaded`.
- `react-hot-toast` is mocked to prevent actual toast notifications during tests and to verify that success toasts are called on successful form submission.
- `user-event` is used for simulating user interactions with the `Select` component, as `fireEvent` is not sufficient to trigger its `onValueChange` handler.

## Test Scenarios
1.  **Condition:** The `isLoaded` state is `false`.
    **Action:** The `ProfilePage` is rendered.
    **Expected Outcome:** The page displays a loading skeleton UI instead of the form.

2.  **Condition:** The form is loaded with valid data. A user enters invalid data into several fields (e.g., an empty name, an invalid email).
    **Action:** The user clicks the "Save Changes" button.
    **Expected Outcome:** Validation error messages are displayed for each invalid field, and the `updateProfile` function is not called.

3.  **Condition:** The form is loaded. A user modifies a field with valid data.
    **Action:** The user clicks the "Save Changes" button.
    **Expected Outcome:** The `updateProfile` function is called with the updated profile data, and a success toast is shown.

4.  **Condition:** The form is loaded.
    **Action:** The user clicks the "Motivational Reminder Interval" dropdown and selects a new value.
    **Expected Outcome:** The `setSoundSettings` function is called with the newly selected interval value. This test was updated to use `user-event` to properly simulate the interaction and cover the `onValueChange` handler.

5.  **Condition:** The `useGlobalState` hook returns an empty object for the user's profile.
    **Action:** The `ProfilePage` is rendered.
    **Expected Outcome:** The component renders without crashing, and the form fields are empty, gracefully handling the missing data.

## Rationale
- **Using `user-event` for Complex Components:** The original test for the notification interval `Select` component used `fireEvent`, which failed to trigger the `onValueChange` callback and left a coverage gap. The test was refactored to use `@testing-library/user-event`, which more accurately simulates a full user interaction (click to open, click to select). This successfully covered the `onValueChange` handler (line 265) and brought test coverage to 100%.
- **Handling Empty State:** A test was added to ensure the component remains stable and renders correctly even if the initial `profile` object from the global state is empty. This is a crucial robustness check to prevent crashes from unexpected or uninitialized data.