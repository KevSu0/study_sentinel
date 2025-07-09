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
    // This is the definitive, robust history processing logic.
    // It builds a clean history from scratch, enforcing all API rules.

    const rawHistory = input.chatHistory || [];
    const cleanHistory: MessageData[] = [];

    // Rule 1: Find the first valid message from a 'user'.
    const firstUserIndex = rawHistory.findIndex(
      msg =>
        msg &&
        msg.role === 'user' &&
        typeof msg.content === 'string' &&
        msg.content.trim() !== ''
    );

    // If no user message exists, we cannot start a conversation.
    if (firstUserIndex === -1) {
      return {response: "I'm ready to listen. What's on your mind?"};
    }

    // Rule 2: Iterate from the first user message and build a valid history.
    for (let i = firstUserIndex; i < rawHistory.length; i++) {
      const msg = rawHistory[i];

      // Skip any message that is null, malformed, or has empty content.
      if (
        !msg ||
        (msg.role !== 'user' && msg.role !== 'model') ||
        typeof msg.content !== 'string' ||
        msg.content.trim() === ''
      ) {
        continue;
      }

      // The message is valid, add it to our clean history.
      cleanHistory.push({
        role: msg.role,
        parts: [{text: msg.content}],
      });
    }

    // Use dummy objects to prevent any potential errors from null/undefined context.
    const safeProfile = input.profile || {
      name: 'User',
      passion: 'learning and growing',
      dream: 'achieving their full potential',
      education: 'their current studies',
    };
    const safeSummary = input.dailySummary || {
      evaluation: 'No activity was logged for the previous day.',
      motivationalParagraph:
        'Every day is a new opportunity to make progress. Focus on your goals for today!',
    };

    const profileContext = `
**User Profile:**
- Name: ${safeProfile.name || 'Not provided'}
- Passion: ${safeProfile.passion || 'Not provided'}
- Dream: ${safeProfile.dream || 'Not provided'}
- Education: ${safeProfile.education || 'Not provided'}
`;

    const summaryContext = `
**Latest Daily Briefing:**
- Evaluation: ${safeSummary.evaluation}
- Motivation: ${safeSummary.motivationalParagraph}
`;

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

    try {
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        history: cleanHistory,
        system: systemPrompt,
      });

      return {response: response.text};
    } catch (e: any) {
      console.error('Gemini API call failed:', e);
      // Re-throw the error with a user-friendly message to be caught by the action.
      throw new Error(
        `The AI model failed to respond. Please try again. Details: ${e.message}`
      );
    }
  }
);
