'use server';

import {
  generateDailySummary,
  type DailySummaryInput,
} from '@/ai/flows/generate-daily-summary';
import {getChatbotResponse as getChatbotResponseFlow} from '@/ai/flows/positive-psychologist-flow';
import {
  type PositivePsychologistInput,
  PositivePsychologistInputSchema,
} from '@/lib/types';

export async function getDailySummary(input: DailySummaryInput) {
  try {
    const result = await generateDailySummary(input);
    return result;
  } catch (error) {
    console.error('AI summary generation failed:', error);
    if (error instanceof Error) {
      return {error: `AI summary failed: ${error.message}`};
    }
    return {error: 'An unknown error occurred during AI summary generation.'};
  }
}

export async function getChatbotResponse(input: PositivePsychologistInput) {
  try {
    // Perform strict, runtime validation at the server boundary.
    // This prevents any malformed data from the client from crashing the flow.
    const validatedInput = PositivePsychologistInputSchema.parse(input);
    const result = await getChatbotResponseFlow(validatedInput);
    return result;
  } catch (error) {
    console.error('AI chat response failed:', error);
    if (error instanceof Error) {
      return {error: `AI chat failed: ${error.message}`};
    }
    return {
      error: 'An unknown error occurred during AI chat response generation.',
    };
  }
}
