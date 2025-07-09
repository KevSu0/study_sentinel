'use server';

import {
  generateDailySummary,
  type DailySummaryInput,
} from '@/ai/flows/generate-daily-summary';
import {getChatbotResponse as getChatbotResponseFlow} from '@/ai/flows/positive-psychologist-flow';
import {type PositivePsychologistInput} from '@/lib/types';

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
    // The validation is now handled by the flow itself.
    // We just pass the input directly.
    const result = await getChatbotResponseFlow(input);
    return result;
  } catch (error) {
    console.error('AI chat response failed:', error);
    if (error instanceof Error) {
      // The error might be a Zod validation error from the flow now.
      return {error: `AI chat failed: ${error.message}`};
    }
    return {
      error: 'An unknown error occurred during AI chat response generation.',
    };
  }
}
