
'use server';
/**
 * @fileOverview A streaming-first positive psychology chatbot flow.
 *
 * - generateChatbotResponse - A flow that handles the chatbot conversation.
 */

import {ai} from '@/ai/genkit';
import {
  PositivePsychologistInputSchema,
  PositivePsychologistOutputSchema,
} from '@/lib/types';
import {MessageData} from 'genkit';

export const generateChatbotResponse = ai.defineFlow(
  {
    name: 'generateChatbotResponse',
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
    // Ensure the history starts with a user message.
    const firstUserMessageIndex = validHistory.findIndex(msg => msg.role === 'user');

    if (firstUserMessageIndex === -1) {
        // If no user messages exist, we can't proceed.
        // This case should ideally not happen in a normal flow.
        // We'll return a generic greeting, similar to empty history.
        return { response: "It looks like we're starting a new conversation. What's on your mind?" };
    }

    const processedHistory = validHistory.slice(firstUserMessageIndex);
    
    // Ensure the last message is from the user to avoid model responding to itself
    const lastMessage = processedHistory[processedHistory.length - 1];
    const promptMessage = lastMessage.role === 'user' ? lastMessage : { role: 'user', content: 'Please continue.' };
    
    // 2. Convert our app's chat format to the one Genkit requires.
    const messagesForApi: MessageData[] = processedHistory.map((msg) => ({
      role: msg.role,
      content: [{text: msg.content}],
    }));


    // 3. Build the enhanced system prompt.
    const {profile, dailySummary, upcomingTasks, weeklyStats} = input;
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
- Upcoming tasks for today: ${
      upcomingTasks?.map(t => t.title).join(', ') || 'None'
    }.
- Weekly stats: Total hours studied: ${
      weeklyStats?.totalHours || 0
    }, Tasks completed: ${weeklyStats?.completedCount || 0}.
`;

    // 4. Call the AI with the correctly structured request.
    const response = await ai.generate({
      system: systemPrompt,
      messages: messagesForApi,
    });

    // 5. Return the generated response.
    return {response: response.text};
  }
);
