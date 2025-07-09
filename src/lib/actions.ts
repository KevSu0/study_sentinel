'use server';

import {
  analyzeStudyProgress,
  type AnalyzeStudyProgressInput,
} from '@/ai/flows/analyze-study-progress';
import {
  generateDailySummary,
  type DailySummaryInput,
} from '@/ai/flows/generate-daily-summary';

export async function performAnalysis(input: AnalyzeStudyProgressInput) {
  try {
    const result = await analyzeStudyProgress(input);
    return result;
  } catch (error) {
    console.error('AI analysis failed:', error);
    if (error instanceof Error) {
        return { error: `AI analysis failed: ${error.message}` };
    }
    return {error: 'An unknown error occurred during AI analysis.'};
  }
}

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
