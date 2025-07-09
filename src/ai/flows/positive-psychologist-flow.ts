'use server';
/**
 * @fileOverview A positive psychology chatbot flow.
 *
 * - getChatbotResponse - A function that handles the chatbot conversation.
 * - PositivePsychologistInput - The input type for the getChatbotResponse function.
 * - PositivePsychologistOutput - The return type for the getChatbotResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {MessageData} from 'genkit/ai';

const PositivePsychologistInputSchema = z.object({
  profile: z.any().optional(),
  dailySummary: z.any().optional(),
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.string(),
    })
  ),
});
export type PositivePsychologistInput = z.infer<
  typeof PositivePsychologistInputSchema
>;

const PositivePsychologistOutputSchema = z.object({
  response: z.string(),
});
export type PositivePsychologistOutput = z.infer<
  typeof PositivePsychologistOutputSchema
>;

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
  async input => {
    const {profile, dailySummary, history} = input;

    if (!history || history.length <= 1) {
      return {response: 'Hello! How can I help you today?'};
    }

    const profileContext = profile
      ? `
**User Profile:**
- Name: ${profile.name || 'Not provided'}
- Passion: ${profile.passion || 'Not provided'}
- Dream: ${profile.dream || 'Not provided'}
- Education: ${profile.education || 'Not provided'}
`
      : '**User Profile:** Not provided.';

    const summaryContext = dailySummary
      ? `
**Latest Daily Briefing:**
- Evaluation: ${dailySummary.evaluation}
- Motivation: ${dailySummary.motivationalParagraph}
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

    // The history from the client includes the initial model greeting.
    // We slice(1) to remove it, ensuring the history always starts with a user message.
    const conversation = history.slice(1);

    // The last message in the history is the user's current prompt.
    const lastMessage = conversation.pop();

    if (!lastMessage || lastMessage.role !== 'user') {
      return {
        response:
          "I'm sorry, something went wrong. Could you try sending your message again?",
      };
    }

    const userPrompt = lastMessage.content;

    // The rest of the conversation is the history for the model.
    const genkitHistory: MessageData[] = conversation.map(h => ({
      role: h.role,
      parts: [{text: h.content}],
    }));

    const response = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: userPrompt, // The actual prompt is the user's latest message.
      history: genkitHistory, // The preceding conversation.
      system: systemPrompt,
    });

    return {response: response.text};
  }
);
