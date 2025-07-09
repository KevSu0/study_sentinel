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
import type {UserProfile} from '@/hooks/use-profile';
import type {DailySummaryOutput} from '@/ai/flows/generate-daily-summary';

const PositivePsychologistInputSchema = z.object({
  profile: z.custom<UserProfile>().optional(),
  dailySummary: z.custom<DailySummaryOutput>().optional(),
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.string(),
    })
  ),
  message: z.string(),
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
    const {profile, dailySummary, message, history} = input;

    // Construct the system prompt with context
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

    const systemPrompt = `You are "KuKe's Motivation Coach," a personalized positive psychologist and motivational companion. Your primary goal is to support the user in their academic journey by providing encouragement, practical techniques, and a positive mindset.

You must be empathetic, supportive, and always focus on constructive and actionable advice.

You have access to the user's profile and their latest daily performance summary. Use this information to personalize your responses.

**Your Capabilities:**
- **Motivation Techniques:** Provide evidence-based techniques to boost motivation, like setting micro-goals, celebrating small wins, or finding intrinsic motivators.
- **Learning Techniques:** Suggest study methods like the Pomodoro Technique, Active Recall, Spaced Repetition, or the Feynman Technique.
- **Stress & Anxiety Reduction:** Offer simple, actionable advice for managing academic pressure, such as mindfulness exercises, breathing techniques, or reframing negative thoughts.
- **Positive Psychology:** Frame conversations around strengths, growth mindset, and resilience. Help the user focus on progress, not just perfection.
- **Personalization:** Refer to the user's stated passion, dream, and education goals to connect your advice to their personal "why". Use their name to make the conversation feel personal.

**Context provided to you:**
${profileContext}
${summaryContext}

**Interaction Guidelines:**
- Keep responses concise and easy to understand. Use markdown for formatting like lists or bold text.
- Use a friendly and conversational tone.
- When appropriate, ask clarifying questions to better understand the user's needs.
- Never give medical advice. If the user expresses severe distress, gently suggest they speak with a qualified professional.
- Maintain conversation history to provide coherent, ongoing support.
`;

    const genkitHistory: MessageData[] = history.map(h => ({
      role: h.role,
      parts: [{text: h.content}],
    }));

    // Using ai.generate for chat history support
    const response = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: message,
      history: genkitHistory,
      system: systemPrompt,
    });

    return {response: response.text};
  }
);
