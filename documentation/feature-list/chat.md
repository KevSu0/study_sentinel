# AI Chat Page

The AI Chat page provides a conversational interface for users to interact with an AI-powered positive psychologist for motivation and advice.

### 6.1. Core Functionality

*   **Conversational Interface:** Allows users to send and receive messages from the AI chatbot.
*   **Context-Aware Responses:** The chatbot's responses are informed by the user's profile, daily summary, and upcoming tasks.
*   **Markdown Support:** Renders chatbot responses in Markdown for enhanced readability.

### 6.2. Features & Sub-features

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Header** | Displays the page title and a button to clear the chat history. | - | - [`src/app/chat/page.tsx`](src/app/chat/page.tsx): `ChatPage` (line 47)<br>- [`src/hooks/use-chat-history.ts`](src/hooks/use-chat-history.ts): `clearMessages` |
| **Message Display** | Shows the conversation history between the user and the chatbot. | - **User & Model Bubbles:** Differentiates between user and chatbot messages. | - [`src/app/chat/page.tsx`](src/app/chat/page.tsx): `MessageBubble` (line 16)<br>- [`src/hooks/use-chat-history.ts`](src/hooks/use-chat-history.ts): `messages`<br>- `react-markdown` (external library) |
| **Message Input** | A textarea for users to compose and send messages to the chatbot. | - **Send Button:** Submits the message.<br>- **Enter to Send:** Allows sending messages by pressing the Enter key. | - [`src/app/chat/page.tsx`](src/app/chat/page.tsx): `input` (state, line 50), `handleSend` (line 63)<br>- [`src/lib/actions.ts`](src/lib/actions.ts): `getChatbotResponse` |

### 6.3. Inter-component and Feature Element References

*   `ChatPage` manages the `input` state and calls `handleSend` on message submission.
*   `use-chat-history.ts` provides `messages` for `Message Display` and `clearMessages` for the Header.
*   `Message Display` uses `MessageBubble` for individual messages and `react-markdown` for rendering.
*   `handleSend` calls `getChatbotResponse` from [`src/lib/actions.ts`](src/lib/actions.ts).

### 6.4. Impacting and Dependent Factors

*   **AI Model Responsiveness:** The user experience is heavily dependent on the AI model's latency and quality of responses. Slow responses can degrade the conversational experience.
*   **Contextual Data:** The effectiveness of the "positive psychologist" persona relies on accurate and timely access to user profile, daily summary, and upcoming task data. Inaccurate or outdated context can lead to irrelevant AI responses.
*   **`use-chat-history.ts`:** This hook is crucial for maintaining the conversation history. Any issues with its state management could lead to lost messages or incorrect context.
*   **`getChatbotResponse`:** This function is the core integration point with the AI model. Its reliability and error handling are paramount for a stable chat experience.

### 6.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Chat History Management (`use-chat-history.ts`):** This hook should provide functions for adding messages, clearing history, and potentially loading/saving history from persistent storage (e.g., local storage or a backend). It should also manage the scroll-to-bottom behavior for new messages.
*   **AI Response Generation (`getChatbotResponse` in `src/lib/actions.ts`):** This function should:
    *   **Contextual Data Retrieval (Micro-function):** Efficiently fetch relevant user data (profile, daily summary, upcoming tasks) from the global state or a data service. This function should handle cases where some contextual data might be unavailable.
    *   **Prompt Construction (Micro-function):** Dynamically build the AI prompt, incorporating the user's message and all relevant contextual data. This is a critical step for ensuring context-aware and personalized responses.
    *   **Gemini API Call (Sub-micro function):** Interact with the Google GenAI SDK. This involves:
        *   Initializing the client: `from google import genai; client = genai.Client()`.
        *   Creating a chat session: `chat = client.chats.create(model="gemini-2.5-flash")`.
        *   Sending messages: `response = chat.send_message(user_message_with_context)`.
        *   Handling streaming responses: `for chunk in response: print(chunk.text, end="")`.
        *   Implementing robust error handling for API errors (`from google.genai.errors import APIError`).
    *   **Response Parsing (Micro-function):** Parses the AI model's response, which might be streamed. It should handle Markdown content and ensure it's correctly formatted for display.
*   **UI Event Handlers:** `handleSend` should manage the input state, call the AI response function, and update the chat history. It should also provide visual feedback to the user (e.g., loading indicators) while waiting for the AI response.
*   **Message Rendering:** `MessageBubble` should be a simple presentational component, responsible for displaying message content, differentiating roles (user/model), and rendering Markdown using `react-markdown`.

### 6.6. Future Enhancements/Considerations

*   **Speech-to-Text Input:** Allow users to speak their messages instead of typing.
*   **Text-to-Speech Output:** Enable the chatbot to respond verbally.
*   **Pre-defined Prompts/Topics:** Offer quick-start prompts or topic suggestions to guide the conversation.
*   **Chat History Persistence:** Implement a more robust solution for saving and loading chat history across sessions (e.g., backend database).
*   **AI Model Configuration:** Allow users to adjust certain AI parameters (e.g., creativity, verbosity) if exposed by the API.