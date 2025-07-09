'use server';

/**
 * @fileOverview AI-powered study progress analysis flow.
 *
 * - analyzeStudyProgress - Analyzes study progress for a given task.
 * - AnalyzeStudyProgressInput - Input type for analyzeStudyProgress.
 * - AnalyzeStudyProgressOutput - Output type for analyzeStudyProgress.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeStudyProgressInputSchema = z.object({
  task: z.string().describe('The study task to analyze.'),
  duration: z.number().describe('The time allocated for the task in minutes.'),
  progressDescription: z
    .string()
    .describe('A description of the progress made on the task.'),
});
export type AnalyzeStudyProgressInput = z.infer<
  typeof AnalyzeStudyProgressInputSchema
>;

const AnalyzeStudyProgressOutputSchema = z.object({
  isOnTrack: z.boolean().describe('Whether the user is on track or not.'),
  analysis: z.string().describe('The analysis of the study progress.'),
});
export type AnalyzeStudyProgressOutput = z.infer<
  typeof AnalyzeStudyProgressOutputSchema
>;

export async function analyzeStudyProgress(
  input: AnalyzeStudyProgressInput
): Promise<AnalyzeStudyProgressOutput> {
  return analyzeStudyProgressFlow(input);
}

const analyzeStudyProgressPrompt = ai.definePrompt({
  name: 'analyzeStudyProgressPrompt',
  input: {schema: AnalyzeStudyProgressInputSchema},
  output: {schema: AnalyzeStudyProgressOutputSchema},
  prompt: `You are a strict study monitor. Analyze the study progress for the given task and determine if the user is on track.

Task: {{{task}}}
Time Allocated: {{{duration}}} minutes
Progress Description: {{{progressDescription}}}

Based on the above information, determine if the user is on track with their studies. Provide a detailed analysis and set the isOnTrack output field appropriately.
`,
});

const analyzeStudyProgressFlow = ai.defineFlow(
  {
    name: 'analyzeStudyProgressFlow',
    inputSchema: AnalyzeStudyProgressInputSchema,
    outputSchema: AnalyzeStudyProgressOutputSchema,
  },
  async input => {
    const {output} = await analyzeStudyProgressPrompt(input);
    return output!;
  }
);
