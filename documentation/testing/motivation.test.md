## Objective
This test suite ensures that the motivational message system provides valid, non-empty messages and that the random selection function behaves predictably under controlled conditions.

## Scope
- **In Scope:**
  - `motivationalQuotes`: Validates the data integrity of the array.
  - `motivationalMessages`: Validates the data integrity of the array.
  - `getRandomMotivationalMessage()`: Validates the function's output, including edge cases.
- **Out of Scope:**
  - The native `Math.random()` implementation, which is mocked to allow for deterministic testing.
  - The UI components that display the motivational messages.

## Prerequisites
- No special prerequisites are required to run these tests. They are self-contained.

## Test Scenarios
1.  **Condition:** The `motivationalQuotes` and `motivationalMessages` arrays are inspected.
    **Action:** Check if they are arrays and contain non-empty strings.
    **Expected Outcome:** Both arrays are valid and contain usable data.

2.  **Condition:** `Math.random()` is mocked to return `0`.
    **Action:** The `getRandomMotivationalMessage()` function is called.
    **Expected Outcome:** The function returns the first message from the `motivationalMessages` array.

3.  **Condition:** `Math.random()` is mocked to return `0.999...`.
    **Action:** The `getRandomMotivationalMessage()` function is called.
    **Expected Outcome:** The function returns the last message from the `motivationalMessages` array.

4.  **Condition:** The `motivationalMessages` array is temporarily emptied.
    **Action:** The `getRandomMotivationalMessage()` function is called.
    **Expected Outcome:** The function returns `undefined` without throwing an error.

## Rationale
- **Deterministic Randomness:** The test for `getRandomMotivationalMessage` uses `jest.spyOn(Math, 'random')` to mock the behavior of `Math.random()`. This is a critical design choice to eliminate the flakiness of a probabilistic test. By controlling the "random" output, we can create deterministic tests that verify the function's logic for boundary conditions (first and last elements) and a median case, ensuring it works correctly without random failures.
- **In-Place Mocking:** The test for the empty array scenario directly modifies the imported `motivationalMessages` array. While not always ideal, it is a simple and effective way to test this specific edge case in Jest. The test cleans up after itself by restoring the original array, ensuring it does not interfere with other tests.