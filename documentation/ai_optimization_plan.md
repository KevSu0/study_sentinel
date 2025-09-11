# AI Coach and Daily Briefing Optimization Plan

This document outlines the steps to optimize the AI Coach and Daily Briefing features. The changes are designed to be executed sequentially by an AI agent.

---

### 1. Implement Model Fallback and Centralized AI Logic

**Action:**
Create a new file to house the model fallback logic and centralize the AI generation calls. This will allow both the chatbot and the daily summary to use the same resilient AI generation logic. The model list should be easily configurable.

**Location:**
- **File to Create:** `src/ai/core.ts`

**Expected Change:**
- **Before:** The file does not exist.
- **After:** The file `src/ai/core.ts` will be created with the following content:

```typescript
import {generate, ModelArgument} from 'genkit/ai';
import {ModelReference} from '@genkit-ai/ai/model';

// List of models to try in sequence. The first model is the primary choice.
const GEMINI_LITE_MODELS: ModelReference[] = [
  'googleai/gemini-1.5-flash-latest',
  'googleai/gemini-1.5-pro-latest',
  // The following models are commented out as they may not be available in all regions.
  // 'googleai/gemma-2-27b-it',
  // 'googleai/gemma-2-9b-it',
];

/**
 * Generates a response from a series of models, falling back to the next on failure.
 * This function wraps the 'genkit/ai' generate function to add resilience.
 *
 * @param {...Parameters<typeof generate>} args - The original arguments for the generate function.
 * @returns {Promise<ReturnType<typeof generate>>} A promise that resolves with the generation result.
 * @throws {Error} If all models in the fallback list fail to generate a response.
 */
export async function generateWithFallback(
  ...args: Parameters<typeof generate>
): Promise<ReturnType<typeof generate>> {
  let lastError: any;
  for (const model of GEMINI_LITE_MODELS) {
    try {
      const [request] = args;
      // Attempt to generate content with the current model in the list.
      const result = await generate({...request, model});
      // If successful, return the result immediately.
      return result;
    } catch (error) {
      console.warn(
        `Model ${model.name} failed. Trying next model. Error:`,
        error
      );
      lastError = error;
    }
  }
  // If all models have failed, throw an error with the details of the last failure.
  throw new Error(
    `All AI models failed to generate a response. Last error: ${lastError?.message}`
  );
}
```

---

### 2. Refactor the Positive Psychologist Flow for Streaming

**Action:**
Update the `positive-psychologist-flow.ts` to use the new `generateWithFallback` function and to support streaming. The flow should be renamed to reflect its streaming nature.

**Location:**
- **File to Modify:** `src/ai/flows/positive-psychologist-flow.ts`

**Expected Change:**
- **Before:** The file contains the `getChatbotResponse` and `getChatbotResponseFlow` functions which do not support streaming or model fallback.
- **After:** The file will be completely replaced with the following code, which defines a new streaming flow `getChatbotResponseStream`.

```typescript
'use server';
/**
 * @fileOverview A streaming-first positive psychology chatbot flow.
 *
 * - getChatbotResponseStream - A flow that handles the chatbot conversation using streaming.
 */

import {ai} from '@/ai/genkit';
import {
  PositivePsychologistInputSchema,
  PositivePsychologistOutputSchema,
} from '@/lib/types';
import {generateWithFallback} from '@/ai/core';
import {MessageData} from 'genkit';

export const getChatbotResponseStream = ai.defineFlow(
  {
    name: 'getChatbotResponseStream',
    inputSchema: PositivePsychologistInputSchema,
    outputSchema: PositivePsychologistOutputSchema,
  },
  async (input) => {
    // 1. Sanitize the incoming chat history.
    const validHistory =
      input.chatHistory?.filter(
        (msg) => msg && msg.role && msg.content && msg.content.trim() !== ''
      ) || [];

    // If there's no valid history, return a default greeting.
    if (validHistory.length === 0) {
      return {response: 'Hello! How can I help you on your journey today?'};
    }

    // 2. Convert our app's chat format to the one Genkit requires.
    const messagesForApi: MessageData[] = validHistory.map((msg) => ({
      role: msg.role,
      content: [{text: msg.content}],
    }));

    // 3. Build the enhanced system prompt.
    const {profile, dailySummary} = input;
    const systemPrompt = `You are an AI assistant embodying the principles of a highly skilled positive psychologist and motivation coach. Your tone should be consistently warm, empathetic, encouraging, and supportive. Your primary goal is to help the user cultivate a positive mindset, build resilience, and stay motivated towards their goals.

You MUST follow these rules:
- NEVER be harsh, critical, or judgmental.
- ALWAYS be constructive and focus on solutions and forward momentum.
- Ask open-ended questions to encourage self-reflection.
- Use the user's provided context to personalize your responses.
- Keep your responses concise, easy to understand, and structured with markdown for readability.

Here is some context about the user:
- The user's name is ${profile?.name || 'not provided'}.
- They are working towards this dream: "${profile?.dream || 'not provided'}".
- Here is their performance evaluation from today: "${
      dailySummary?.evaluation || 'not available'
    }".
- Here is a motivational message they received today: "${
      dailySummary?.motivationalParagraph || 'not available'
    }".
`;

    // 4. Call the AI with the correctly structured request and enable streaming.
    const result = await generateWithFallback({
      system: systemPrompt,
      prompt: messagesForApi,
      stream: true,
    });

    // 5. Process the stream and aggregate the response.
    let finalResponse = '';
    for await (const chunk of result.stream()) {
      if (chunk.content) {
        finalResponse += chunk.content;
      }
    }
    return {response: finalResponse};
  }
);
```

---

### 3. Refactor the Daily Summary Flow

**Action:**
Update the `generate-daily-summary.ts` flow to use the new `generateWithFallback` function and improve the prompt for better, more structured output.

**Location:**
- **File to Modify:** `src/ai/flows/generate-daily-summary.ts`

**Expected Change:**
- **Before:** The file contains the `generateDailySummary` flow with a basic prompt and direct AI call.
- **After:** The file will be completely replaced with the following code, which uses the fallback mechanism and a more detailed prompt.

```typescript
'use server';
/**
 * @fileOverview A flow to generate a daily summary for the user.
 */

import {ai} from '@/ai/genkit';
import {
  DailySummaryInputSchema,
  DailySummaryOutputSchema,
} from '@/lib/types';
import {generateWithFallback} from '@/ai/core';

export const generateDailySummary = ai.defineFlow(
  {
    name: 'generateDailySummary',
    inputSchema: DailySummaryInputSchema,
    outputSchema: DailySummaryOutputSchema,
  },
  async (input) => {
    const {profile, tasks, routines, logs} = input;

    const prompt = `
      As an expert life coach and data analyst, your task is to provide a concise, motivational, and insightful daily summary for a user based on their activity.

      **User Profile:**
      - Name: ${profile.name}
      - Dream: ${profile.dream}

      **Today's Activity:**
      - Completed Tasks: ${tasks.length}
      - Completed Routines: ${routines.length}
      - Total Logs: ${logs.length}

      **Instructions:**
      Your response MUST be structured in two parts, separated by a specific delimiter.
      1.  **Evaluation:** Start with "EVALUATION:". Briefly evaluate the user's productivity and consistency. Highlight wins and areas for gentle improvement.
      2.  **Motivational Paragraph:** Start with "MOTIVATION:". Write a short, powerful, and personalized paragraph to inspire the user for tomorrow. Connect it to their dream.

      Example:
      EVALUATION: Great job on completing ${
        tasks.length
      } tasks today! Your focus is clear.
      MOTIVATION: Every step you take brings you closer to your dream of "${
        profile.dream
      }". Keep that vision in mind and let it fuel you.

      Keep the tone positive, encouraging, and empathetic.
    `;

    const result = await generateWithFallback({
      prompt,
    });

    const text = result.text();
    const evaluationMatch = text.match(/EVALUATION:(.*)/s);
    const motivationMatch = text.match(/MOTIVATION:(.*)/s);

    return {
      evaluation: evaluationMatch ? evaluationMatch[1].trim() : 'No evaluation generated.',
      motivationalParagraph: motivationMatch ? motivationMatch[1].trim() : 'Keep up the great work!',
    };
  }
);
```

---

### 4. Update Server Actions

**Action:**
Update `src/lib/actions.ts` to import and call the new `getChatbotResponseStream` flow instead of the old one.

**Location:**
- **File to Modify:** `src/lib/actions.ts`
- **Function:** `getChatbotResponse`
- **Line:** Around line 7 and 27.

**Expected Change:**
- **Before:**
  ```typescript
  import {getChatbotResponse as getChatbotResponseFlow} from '@/ai/flows/positive-psychologist-flow';
  // ...
  const result = await getChatbotResponseFlow(input);
  ```
- **After:**
  ```typescript
  import {getChatbotResponseStream} from '@/ai/flows/positive-psychologist-flow';
  // ...
  const result = await getChatbotResponseStream(input);
  ```

---

### 5. Update the Chat Page Frontend for Streaming

**Action:**
Modify the `ChatPage` component to handle streaming responses. This requires replacing the `useChatHistory` hook and the `handleSend` function with logic that can process a streaming response and update the UI in real-time.

**Location:**
- **File to Modify:** `src/app/chat/page.tsx`

**Expected Change:**
- **Before:** The component uses `useChatHistory` and a `handleSend` function that makes a simple async call.
- **After:** The component will be refactored to use a state management approach compatible with streaming. The `handleSend` function will be updated to handle the streaming response. Due to the complexity, this step might require further breakdown, but the high-level change is to replace the existing chat handling logic with a streaming-compatible version. A placeholder for the new `handleSend` is provided below.

```typescript
// This is a conceptual change for handleSend. The full implementation will depend
// on the chosen streaming library (e.g., Vercel AI SDK's useChat hook).

const handleSend = async () => {
  if (input.trim() === '') return;

  // Add user message to UI immediately
  // ...

  const response = await fetch('/api/chat', { // Assuming a new API route for streaming
    method: 'POST',
    body: JSON.stringify({
      messages: [...messages, {role: 'user', content: input}],
      // ... other context
    }),
  });

  // Handle the streaming response
  // ...
};
```
The current implementation of `page.tsx` does not use a separate API route, so this change will be more involved. The `getChatbotResponse` is a server action. We will need to adapt the frontend to handle the response from the server action in a streaming manner.

This plan is now ready for execution.