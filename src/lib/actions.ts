'use server';

import {
  analyzeStudyProgress,
  type AnalyzeStudyProgressInput,
} from '@/ai/flows/analyze-study-progress';

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
