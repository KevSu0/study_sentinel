'use server';
/**
 * @fileOverview Generates a daily motivational summary based on the previous day's activity log.
 *
 * - generateDailySummary - A function that analyzes yesterday's logs and provides a motivational summary.
 * - DailySummaryInput - The input type for the generateDailySummary function.
 * - DailySummaryOutput - The return type for the generateDailySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define Zod schema for a single LogEvent
const LogEventSchema = z.object({
  id: z.string(),
  timestamp: z.string().describe('The ISO 8601 timestamp of the event.'),
  type: z.string().describe('The type of event that occurred.'),
  payload: z
    .record(z.any())
    .describe('A payload containing event-specific data.'),
});

const DailySummaryInputSchema = z.object({
  logs: z
    .array(LogEventSchema)
    .describe(
      "An array of user activity logs from the previous day (4 AM to 4 AM)."
    ),
});
export type DailySummaryInput = z.infer<typeof DailySummaryInputSchema>;

const DailySummaryOutputSchema = z.object({
  evaluation: z
    .string()
    .describe(
      "A detailed evaluation of the previous day's performance, mentioning total study time and tasks completed."
    ),
  motivationalParagraph: z
    .string()
    .describe(
      'An inspiring and motivating paragraph for the student for the upcoming day.'
    ),
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
  prompt: `You are an extremely strict but fair study supervisor and productivity coach for a highly dedicated student aiming to study 12 hours every day. Your feedback must be firm, motivating, and always pushing the student towards excellence.

Today is a new day. Your task is to analyze the student's performance from yesterday based on their detailed activity log and provide them with a motivational message for the day ahead.

Here is the student's activity log from yesterday:
{{#if logs}}
{{#each logs}}
- [{{timestamp}}] Event: {{type}} - Details: {{JSONstringify payload}}
{{/each}}
{{else}}
The student had no recorded activity yesterday.
{{/if}}

Based on this detailed log, your response MUST be in two parts:
1.  **Evaluation**: Provide a detailed evaluation of their performance. Calculate the total study time from completed tasks (if any). Analyze their patterns: When did they start? Did they complete what they started? Did they get distracted (look for TIMER_STOP events and their reasons)? Were they productive? Be critical but constructive. If they did well, acknowledge it, but challenge them to do even better. If they fell short, point out where things went wrong and be firm.
2.  **Motivational Paragraph**: Write a powerful, motivating paragraph for the upcoming day. Use insights from your evaluation to make it personal and impactful. If they were distracted, give them a strategy to stay focused. If they were consistent, inspire them to maintain their momentum. Remind them that every action contributes to their 12-hour/day goal. Do not be generic.
`,
  // A custom Handlebars helper to stringify the payload object
  custom: {
    JSONstringify: (obj: any) => JSON.stringify(obj),
  },
});

const generateDailySummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySummaryFlow',
    inputSchema: DailySummaryInputSchema,
    outputSchema: DailySummaryOutputSchema,
  },
  async input => {
    // If there are no logs, return a default encouraging message
    if (!input.logs || input.logs.length === 0) {
      return {
        evaluation:
          'There was no activity logged yesterday. A fresh start awaits!',
        motivationalParagraph:
          "Today is a blank canvas. It's a new opportunity to build the habits that will lead to your success. Plan your day, commit to your tasks, and make today count. Your 12-hour goal is achieved one focused session at a time. Let's begin.",
      };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
