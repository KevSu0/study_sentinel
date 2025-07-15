
'use server';
/**
 * @fileOverview A positive psychology chatbot flow.
 *
 * - getChatbotResponse - A flow that handles the chatbot conversation.
 */

import {ai} from '@/ai/genkit';
import {
  PositivePsychologistInput,
  PositivePsychologistInputSchema,
  PositivePsychologistOutput,
  PositivePsychologistOutputSchema,
} from '@/lib/types';
import {MessageData} from 'genkit';

export const getChatbotResponse = ai.defineFlow(
  {
    name: 'getChatbotResponse',
    inputSchema: PositivePsychologistInputSchema,
    outputSchema: PositivePsychologistOutputSchema,
  },
  async (input: PositivePsychologistInput) => {
    // 1. Sanitize the incoming chat history to remove any malformed messages.
    const validHistory =
      input.chatHistory?.filter(
        msg => msg && msg.role && msg.content && msg.content.trim() !== ''
      ) || [];

    if (validHistory.length === 0) {
      throw new Error('Chat history is empty or invalid.');
    }

    // 2. The last message is the user's current prompt. The rest is history.
    const lastMessage = validHistory[validHistory.length - 1];
    const history = validHistory.slice(0, -1);

    // The AI can only respond to a user message.
    if (lastMessage.role !== 'user') {
      return {response: 'I see. Please tell me more.'};
    }

    const prompt = lastMessage.content;

    // 3. Convert our app's chat format to the one Genkit requires.
    const historyForApi: MessageData[] = history.map(msg => ({
      role: msg.role,
      content: [{text: msg.content}],
    }));

    // 4. Build the system prompt to define the AI's personality and context.
    const {profile, dailySummary} = input;
    const safeProfile = profile || {};
    const safeSummary = dailySummary || {};

    let systemPrompt = `You are an AI assistant embodying the principles of a highly skilled positive psychologist and motivation coach. Your tone should be consistently warm, empathetic, encouraging, and supportive. Your primary goal is to help the user cultivate a positive mindset, build resilience, and stay motivated towards their goals.

You MUST follow these rules:
- NEVER be harsh, critical, or judgmental.
- ALWAYS be constructive and focus on solutions and forward momentum.
- Ask open-ended questions to encourage self-reflection.
- Use the user's provided context to personalize your responses.
- Keep your responses concise and easy to understand.
`;

    const contextParts = [];
    if (safeProfile.name) {
      contextParts.push(`The user's name is ${safeProfile.name}.`);
    }
    if (safeProfile.dream) {
      contextParts.push(
        `They are working towards this dream: "${safeProfile.dream}".`
      );
    }
    if (safeSummary.evaluation) {
      contextParts.push(
        `Here is their performance evaluation from yesterday: "${safeSummary.evaluation}".`
      );
    }
    if (safeSummary.motivationalParagraph) {
      contextParts.push(
        `Here is a motivational message they received today: "${safeSummary.motivationalParagraph}".`
      );
    }

    if (contextParts.length > 0) {
      systemPrompt += `\nHere is some context about the user:\n- ${contextParts.join(
        '\n- '
      )}`;
    }

    // 5. Call the AI with the correctly structured request.
    try {
      const {text} = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        system: systemPrompt,
        prompt: prompt,
        history: historyForApi,
      });

      return {response: text};
    } catch (e: any) {
      console.error('Gemini API call failed:', e);
      throw new Error(
        `The AI model failed to respond. Please try again. Details: ${e.message}`
      );
    }
  }
);
