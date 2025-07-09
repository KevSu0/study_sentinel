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
    // ULTIMATE DEBUGGING STEP:
    // This is a minimal, hardcoded call to the AI to test the core functionality.
    // All dynamic data processing has been removed.
    try {
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        history: [{role: 'user', parts: [{text: 'Hello'}]}],
      });

      return {response: response.text};
    } catch (e: any) {
      console.error('Gemini API call failed with minimal, hardcoded data:', e);
      throw new Error(
        `The AI model failed to respond. Please try again. Details: ${e.message}`
      );
    }
  }
);
