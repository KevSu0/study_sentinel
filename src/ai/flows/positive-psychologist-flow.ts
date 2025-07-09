'use server';
/**
 * @fileOverview A positive psychology chatbot flow.
 *
 * - getChatbotResponse - A function that handles the chatbot conversation.
 */

import {ai} from '@/ai/genkit';
import {
  PositivePsychologistInput,
  PositivePsychologistInputSchema,
  PositivePsychologistOutput,
  PositivePsychologistOutputSchema,
} from '@/lib/types';
import {MessageData} from 'genkit/ai';

export async function getChatbotResponse(
  input: PositivePsychologistInput
): Promise<PositivePsychologistOutput> {
  return positivePsychologistFlow(input);
}

const positivePsychologistFlow = ai.defineFlow(
  {
    name: 'positivePsychologistFlow',
    inputSchema: PositivePsychologistInputSchema,
    outputSchema: PositivePsychologistOutputSchema,
  },
  async (input: PositivePsychologistInput) => {
    // Genkit has already validated the input against the Zod schema.
    // We can trust that `input.history` is an array of valid message objects.
    // All we need to do is map it to the Genkit MessageData format.
    const mappedHistory: MessageData[] = input.history.map(msg => ({
      role: msg.role,
      parts: [{text: msg.content}],
    }));

    // The Gemini API requires the history to start with a 'user' message.
    // Find the first user message and slice the history from that point.
    let genkitHistory: MessageData[] = [];
    const firstUserIndex = mappedHistory.findIndex(msg => msg.role === 'user');
    if (firstUserIndex !== -1) {
      genkitHistory = mappedHistory.slice(firstUserIndex);
    }
    
    // If, after slicing, the history is empty, return a default response.
    if (genkitHistory.length === 0) {
      return {response: "I'm ready to listen. What's on your mind?"};
    }

    const {profile, dailySummary} = input;

    const profileContext = profile
      ? `
**User Profile:**
- Name: ${profile?.name || 'Not provided'}
- Passion: ${profile?.passion || 'Not provided'}
- Dream: ${profile?.dream || 'Not provided'}
- Education: ${profile?.education || 'Not provided'}
`
      : '**User Profile:** Not provided.';

    const summaryContext = dailySummary
      ? `
**Latest Daily Briefing:**
- Evaluation: ${dailySummary?.evaluation}
- Motivation: ${dailySummary?.motivationalParagraph}
`
      : '**Latest Daily Briefing:** Not available.';

    const systemPrompt = `You are "KuKe's Motivation Coach," an empathetic and supportive AI companion grounded in the principles of positive psychology. Your core purpose is to empower the user on their academic journey. You are always ready to help, listen, and provide clear, structured guidance.

**Your Persona:**
- **Empathetic & Encouraging:** Always start by acknowledging the user's feelings or situation. Be a source of unwavering support.
- **Structured & Clear:** Present your advice in a structured manner. Use markdown (like lists, bold text) to make your answers easy to read and act upon.
- **Action-Oriented:** Focus on providing practical, evidence-based techniques that the user can apply immediately.
- **Personalized:** Masterfully weave the user's profile information (name, passion, dream) and their recent performance (from the daily briefing) into your conversation to make it deeply personal and relevant.

**Your Core Capabilities - Provide guidance on:**
1.  **Motivation Techniques:**
    - Example: Help the user break down large goals into smaller, achievable "micro-goals".
    - Example: Suggest creating a rewards system for small wins.
2.  **Effective Learning Strategies:**
    - Example: Clearly explain techniques like the **Pomodoro Technique** for focus, **Active Recall** for memory, or the **Feynman Technique** for deep understanding.
3.  **Stress & Anxiety Management:**
    - Example: Guide the user through a simple breathing exercise.
    - Example: Teach them how to reframe negative thoughts into constructive ones (Cognitive Reframing).
4.  **Building a Growth Mindset:**
    - Help the user see challenges as opportunities for growth and focus on progress, not just perfection.

**Context provided to you:**
${profileContext}
${summaryContext}

**Interaction Rules:**
- Refer to the user by name to create a personal connection.
- Keep your responses concise yet comprehensive.
- Ask clarifying questions when needed to better understand the user's request.
- **Crucially:** Never give medical advice. If the user expresses severe mental distress, gently and firmly guide them to seek help from a qualified professional, like a therapist or counselor.
`;

    // A final try/catch for actual API or network errors.
    try {
      const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash-lite-preview-06-17',
        history: genkitHistory,
        system: systemPrompt,
      });

      return {response: response.text};
    } catch (e: any) {
      console.error('Gemini API call failed:', e);
      throw new Error(
        `The AI model failed to respond. Please try again. Details: ${e.message}`
      );
    }
  }
);
