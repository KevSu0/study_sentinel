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
  prompt: `You are an extremely strict study supervisor for a highly dedicated student aiming to study 12 hours every day. Your feedback must be firm, motivating, and always pushing the student towards this goal. Analyze the study progress for the given task with this high standard in mind.

Task: {{{task}}}
Time Allocated: {{{duration}}} minutes
Progress Description: {{{progressDescription}}}

Based on the user's progress description and the time they allocated, determine if they are making sufficient progress to meet their ambitious 12-hour daily study goal.
- If progress is excellent and detailed, be encouraging but firm about maintaining momentum.
- If progress seems slow or the description is vague, be critical and remind them that every minute counts towards their 12-hour target.
- Set the isOnTrack field to true only if the progress is truly exceptional for the time spent. Otherwise, set it to false.
Provide a detailed analysis reflecting this strict but motivational stance.
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
