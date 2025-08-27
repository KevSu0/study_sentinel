## Objective
This test suite validates the functionality of the `ChatPage` component, ensuring users can interact with the AI Positive Psychologist, send messages, receive responses, and manage their chat history.

## Scope
- **In Scope:** 
  - `ChatPage` component rendering and user interactions.
  - State management during message sending (e.g., disabling inputs, showing sending indicators).
  - Handling of successful API responses, network errors, and malformed API responses.
  - Clearing chat history.
- **Out of Scope:** 
  - `useGlobalState` hook (mocked).
  - `useChatHistory` hook (mocked).
  - `getDailySummary` and `getChatbotResponse` API actions (mocked).
  - `react-markdown` and `remark-gfm` rendering logic.

## Prerequisites
- The `getDailySummary` action must be mocked to return a valid summary object.
- The `getChatbotResponse` action must be mocked to return different structures to test success, error, and unexpected response scenarios.
- The `Skeleton` component from `@/components/ui/skeleton` is mocked to render a simple `div` with a `data-testid`. This is necessary because JSDOM does not reliably expose the component's `status` role.
- `window.HTMLElement.prototype.scrollIntoView` is mocked as it is not implemented in JSDOM.
- `console.error` is spied on to verify that specific error messages are logged during API failure tests.

## Test Scenarios
1.  **Condition:** The user types a message in the text area.
    **Action:** The user clicks the "Send" button.
    **Expected Outcome:** The user's message is immediately added to the chat, a "sending" indicator appears, the `getDailySummary` and `getChatbotResponse` actions are called with the correct context, the AI's response is added to the chat, and the input form is reset and re-enabled.

2.  **Condition:** The `getChatbotResponse` API call fails due to a network issue (promise rejects).
    **Action:** The user sends a message.
    **Expected Outcome:** A user-friendly network error message is added to the chat, and the technical error is logged to the console.

3.  **Condition:** The `getChatbotResponse` API returns a response that does not contain the expected `response` or `error` properties (e.g., `{}`).
    **Action:** The user sends a message.
    **Expected Outcome:** A generic "I'm sorry" error message is added to the chat, and a specific "Unexpected response structure" error is logged to the console, ensuring 100% branch coverage for error handling.

4.  **Condition:** The user has a chat history.
    **Action:** The user clicks the "Clear Chat" button.
    **Expected Outcome:** The `clearMessages` function from the `useChatHistory` hook is called exactly once.

## Rationale
- **Reliable Skeleton Testing:** The test for the loading state was failing because it relied on class-based queries to find skeleton loaders. This was fixed by mocking the `Skeleton` component to include a `data-testid="skeleton"`, providing a reliable and implementation-independent way to query for the loaders.
- **Mocking Strategy:** All external dependencies, including hooks and server actions, are mocked. This isolates the `ChatPage` component, allowing tests to focus solely on its logic and UI behavior without making real API calls or depending on other parts of the application state.
- **Error Handling:** The tests for error handling are crucial. We cover three distinct failure modes: a rejected promise (network error), a resolved promise with a known error structure (`{error: '...'}`), and a resolved promise with an unknown structure (`{}`). This ensures the component is resilient and provides appropriate user feedback for different failure scenarios. The test for the unknown structure was specifically added to cover line 114 and achieve 100% line and branch coverage.
- **Asynchronous Testing:** `async/await` and `waitFor` are used extensively to handle the asynchronous nature of sending messages and receiving responses. This ensures that assertions are made only after the UI has updated in response to state changes.