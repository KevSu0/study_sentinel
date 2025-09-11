## Objective
This test suite validates the `ManageBadgesPage` component, ensuring that users can view, create, edit, and delete custom badges, as well as interact with system badges.

## Scope
- **In Scope:** 
  - Rendering the list of all available badges.
  - Correctly sorting custom badges to appear before system badges.
  - Opening the `BadgeDialog` in "create" mode and "edit" mode.
  - Handling the empty state when no badges are available.
  - Invoking the correct `useGlobalState` functions (`updateBadge`, `addBadge`, `deleteBadge`) upon user interaction.
  - Navigating to the earned badges page.
- **Out of Scope:** 
  - `useGlobalState` hook (mocked).
  - The `BadgeDialog` component's internal implementation (mocked).
  - The `BadgeListItem` component's internal implementation.
  - The actual logic of the `updateBadge`, `addBadge`, and `deleteBadge` functions.

## Prerequisites
- The `useGlobalState` hook is mocked to provide a controlled state for `allBadges`, `earnedBadges`, and `isLoaded`.
- The `BadgeDialog` component is mocked to prevent its async loading and internal form logic from affecting the tests. The mock conditionally renders a single "Save" button to avoid ambiguity in tests.
- The `lucide-react` icons are mocked.

## Test Scenarios
1.  **Condition:** The global state contains a mix of custom and system badges.
    **Action:** The `ManageBadgesPage` is rendered.
    **Expected Outcome:** All badges are displayed, with the custom badges sorted to appear at the top of the list, covering the sorting logic in the component's `useMemo` hook.

2.  **Condition:** A user clicks the "Create Custom Badge" button.
    **Action:** The `BadgeDialog` is rendered in "create" mode. The user simulates filling out the form and clicks "Save".
    **Expected Outcome:** The `addBadge` function from `useGlobalState` is called with the new badge's data.

3.  **Condition:** A user clicks the "Edit" button on a custom badge.
    **Action:** The `BadgeDialog` is rendered in "edit" mode, pre-filled with the badge's data. The user simulates updating a field and clicks "Save".
    **Expected Outcome:** The `updateBadge` function is called with the badge's ID and the updated data.

4.  **Condition:** A user clicks the "Delete" button on a custom badge.
    **Action:** A confirmation is implicitly handled.
    **Expected Outcome:** The `deleteBadge` function is called with the correct badge ID.

## Rationale
- **Robust Selectors:** Initial tests were failing because they were querying for `<li>` or `listitem` roles, but the `BadgeListItem` component renders `<div>`s. The tests were updated to use more robust selectors, finding elements by text and then traversing to a parent container (`closest('div[class*="rounded-lg"]')`) or using `compareDocumentPosition` to verify DOM order, making the tests less brittle.
- **Improved Dialog Mock:** The mock for `BadgeDialog` was improved to conditionally render a single "Save" button. This resolved errors where `getByRole` would find multiple "Save" buttons (one for "create" and one for "edit") and fail.
- **Correcting Mock Data:** The initial tests failed due to TypeScript errors because the mock `Badge` objects did not match the `Badge` type definition in `src/lib/types.ts`. The fix involved reading the type definition and correcting the mock data to include the required `conditions` array, resolving the type errors.
- **Covering Sort Logic:** The coverage report indicated a gap in the `useMemo` sorting logic. A specific test was added to ensure that when the component renders, custom badges are sorted before system badges. This was validated by checking the order of rendered badge names, which directly tests the uncovered branch (`!a.isCustom && b.isCustom`) and brings coverage to 100%.