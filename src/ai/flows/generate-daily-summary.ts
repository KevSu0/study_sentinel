'use server';
/**
 * @fileOverview Generates a daily motivational summary based on the previous day's completed tasks.
 *
 * - generateDailySummary - A function that analyzes yesterday's tasks and provides a motivational summary.
 * - DailySummaryInput - The input type for the generateDailySummary function.
 * - DailySummaryOutput - The return type for the generateDailySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskInfoSchema = z.object({
  title: z.string().describe('The title of the study task.'),
  description: z.string().optional().describe('The description of the task.'),
  duration: z.number().describe('The time spent on the task in minutes.'),
});

const DailySummaryInputSchema = z.object({
  tasks: z
    .array(TaskInfoSchema)
    .describe("An array of tasks completed on the previous day."),
});
export type DailySummaryInput = z.infer<typeof DailySummaryInputSchema>;

const DailySummaryOutputSchema = z.object({
  evaluation: z.string().describe("A detailed evaluation of the previous day's performance, mentioning total study time and tasks completed."),
  motivationalParagraph: z
    .string()
    .describe('An inspiring and motivating paragraph for the student for the upcoming day.'),
});
export type DailySummaryOutput = z.infer<typeof DailySummaryOutputSchema>;

export async function generateDailySummary(
  input: DailySummaryInput
): Promise<DailySummaryOutput> {
  return generateDailySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDailySummaryPrompt',
  input: {schema: DailySummaryInputSchema},
  output: {schema: DailySummaryOutputSchema},
  prompt: `You are an extremely strict but fair study supervisor for a highly dedicated student aiming to study 12 hours every day. Your feedback must be firm, motivating, and always pushing the student towards excellence.

Today is a new day. Your task is to analyze the student's performance from yesterday based on the tasks they completed and provide them with a motivational message for the day ahead.

Here are the tasks the student completed yesterday:
{{#if tasks}}
{{#each tasks}}
- Task: {{{title}}}
  - Description: {{#if description}}{{{description}}}{{else}}N/A{{/if}}
  - Duration: {{{duration}}} minutes
{{/each}}
{{else}}
The student did not complete any tasks yesterday.
{{/if}}

Your response MUST be in two parts:
1.  **Evaluation**: Provide a detailed evaluation of their performance. Calculate the total study time in hours and minutes. Acknowledge the number of tasks completed. Be critical if the total time is low (e.g., less than a few hours) and encouraging if it's high. Frame it constructively.
2.  **Motivational Paragraph**: Write a powerful, motivating paragraph for the upcoming day. Inspire them to either continue their great work or to step up their game if they fell short. Remind them that consistency is key to achieving their 12-hour/day goal. Do not be generic; make it personal and impactful.
`,
});

const generateDailySummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySummaryFlow',
    inputSchema: DailySummaryInputSchema,
    outputSchema: DailySummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
