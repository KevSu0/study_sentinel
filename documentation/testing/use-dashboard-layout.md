## Objective
This test suite validates the `useDashboardLayout` hook and `DashboardLayoutProvider`, ensuring they correctly manage the user's dashboard widget layout, handle persistence to `localStorage`, and gracefully manage server-side rendering (SSR) and storage errors.

## Scope
- **In Scope:** 
  - `useDashboardLayout` hook
  - `DashboardLayoutProvider` component
- **Out of Scope:** 
  - `localStorage` API (mocked via spies).
  - React's core hooks (`useState`, `useEffect`, `useContext`, etc.).
  - Child components rendered within the provider.

## Prerequisites
- All tests using the `useDashboardLayout` hook must be wrapped in the `DashboardLayoutProvider`.
- `console.error` is mocked to prevent test noise and to assert that errors are logged correctly.
- `localStorage` is cleared before each test and spied on to simulate storage failures.

## Test Scenarios
1.  **Condition:** The hook is used outside of its provider.
    **Action:** `renderHook` is called on `useDashboardLayout` without the `wrapper`.
    **Expected Outcome:** The hook throws a specific error indicating it must be used within a `DashboardLayoutProvider`.

2.  **Condition:** A user has a layout saved in `localStorage` that is missing some of the newer default widgets.
    **Action:** The `DashboardLayoutProvider` initializes.
    **Expected Outcome:** The hook merges the saved layout with the default layout. The user's customizations and order are preserved, and any new widgets from the default layout are appended to the end.

3.  **Condition:** The application is rendered on the server (`window` is undefined).
    **Action:** The `DashboardLayoutProvider` initializes.
    **Expected Outcome:** The hook does not attempt to access `localStorage` and initializes with the default layout without crashing. The `isLoaded` state becomes `true`.

## Rationale
- **SSR Safety:** The test `should not fail if window is undefined (SSR)` is critical for Next.js applications. It ensures that the component's initial render on the server doesn't break by attempting to access browser-only APIs like `window` or `localStorage`. This is achieved by temporarily deleting `global.window`.
- **Layout Merging Logic:** The test for merging layouts is important for backward compatibility. When new widgets are added to the `DEFAULT_LAYOUT`, this test ensures that existing users' customized layouts are not overwritten, but are instead intelligently updated to include the new widgets.