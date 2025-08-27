## Objective
This test suite validates the behavior and correctness of various utility functions used throughout the application, including class name merging, ID generation, date calculations, and duration formatting.

## Scope
- **In Scope:**
  - `cn()`: Merging and conditional application of CSS classes.
  - `generateShortId()`: Format and uniqueness of generated IDs.
  - `getSessionDate()`, `getStudyDateForTimestamp()`, `getStudyDay()`: Logic for determining the "study day," which rolls over at 4 AM.
  - `getTimeSinceStudyDayStart()`: Calculation of milliseconds since the start of the study day.
  - `formatDuration()`: Formatting of seconds into a human-readable string (h, m, s).
- **Out of Scope:**
  - `clsx` and `tailwind-merge`: These underlying libraries are assumed to function correctly.
  - `date-fns`: This underlying library is assumed to function correctly.
  - The native `Math.random()` implementation, which is mocked for `generateShortId`.

## Prerequisites
- The "Study Day" function tests rely on a mocked system time set via `jest.setSystemTime()` to ensure consistent date-based calculations around the 4 AM rollover time.

## Test Scenarios
1.  **Condition:** The `cn` function is given conflicting Tailwind CSS classes (e.g., `p-4` and `p-2`).
    **Action:** The function is called.
    **Expected Outcome:** The function returns only the last conflicting class (`p-2`), demonstrating correct merging.

2.  **Condition:** The `getSessionDate` function is called when the mocked system time is before 4 AM.
    **Action:** The function is called.
    **Expected Outcome:** The function returns the date of the *previous* day.

3.  **Condition:** The `formatDuration` function receives a negative number of seconds.
    **Action:** The function is called.
    **Expected Outcome:** The function returns `'0s'`.

4.  **Condition:** The `formatDuration` function receives a value that should round up to the next minute (e.g., `59.9`).
    **Action:** The function is called.
    **Expected Outcome:** The function returns `'1m'`, not `'60s'`.

## Rationale
- **Time Mocking:** `jest.useFakeTimers()` and `jest.setSystemTime()` are essential for the date-related utility functions. They allow for precise testing of the 4 AM "study day" rollover logic without creating tests that are dependent on the actual time they are run.
- **Randomness in `generateShortId`:** The test for `generateShortId` validates the format and prefix but only checks that two subsequent calls do not produce the same ID. It does not test the quality of the randomness itself, as that is the responsibility of `Math.random()`.