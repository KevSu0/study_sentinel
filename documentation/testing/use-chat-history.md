## Objective
This test suite validates the functionality of the `useChatHistory` hook, ensuring it correctly manages the chat message history, persists it to `localStorage`, and handles various edge cases and error conditions.

## Scope
- **In Scope:** 
  - The `useChatHistory` hook.
- **Out of Scope:** 
  - `localStorage` API (mocked via spies).
  - React's `useState`, `useEffect`, and `useCallback` hooks (assumed to work as per React's implementation).

## Prerequisites
- The `console.error` function is mocked using `jest.spyOn` to prevent test logs from being polluted and to allow assertions on its calls.
- `localStorage` is cleared before each test to ensure a clean state and is spied on to simulate storage errors.
- A `getInitialMessage()` function is used in the test setup to provide a fresh, un-mutated copy of the initial message object for each test, preventing cross-test contamination.

## Test Scenarios
1.  **Condition:** The chat history in `localStorage` has reached its maximum configured length (`MAX_HISTORY_LENGTH`).
    **Action:** A new message is added using the `addMessage` function.
    **Expected Outcome:** The oldest message in the history is removed, and the new message is appended, keeping the total history size at `MAX_HISTORY_LENGTH`.

2.  **Condition:** `localStorage` contains a string that is not valid JSON.
    **Action:** The `useChatHistory` hook is initialized.
    **Expected Outcome:** The hook gracefully handles the `JSON.parse` error, logs a console error, and initializes the chat history with the default system message.

3.  **Condition:** The `localStorage.setItem` function throws an error (e.g., storage is full).
    **Action:** A new message is added via `addMessage` or messages are cleared via `clearMessages`.
    **Expected Outcome:** The application does not crash. The error is caught, and a message is logged to `console.error`.

## Rationale
- **History Trimming:** The test `should trim the history to MAX_HISTORY_LENGTH` is crucial for ensuring the application does not consume excessive browser storage over time. It validates the `slice(-MAX_HISTORY_LENGTH)` logic, which is a key feature for maintaining performance and stability.
- **State Isolation:** The `initialMessage` constant was refactored into a `getInitialMessage()` function in both the hook's source and the test file. This was a critical fix to prevent state mutation across tests. Previously, a test that modified the initial message object (e.g., the `updateLastMessage` test) would cause subsequent tests that relied on the original, unmodified message to fail. Using a function to generate a new object for each test ensures test independence and reliability.