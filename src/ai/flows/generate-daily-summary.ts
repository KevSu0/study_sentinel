'use server';
/**
 * @fileOverview Generates a daily motivational summary based on the previous day's activity log and user profile.
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

// Define Zod schema for the user's profile
const UserProfileSchema = z.object({
  name: z.string().optional().describe("The user's name."),
  passion: z
    .string()
    .optional()
    .describe('The subjects the user is passionate about.'),
  dream: z
    .string()
    .optional()
    .describe("The user's long-term dream or goal."),
  education: z
    .string()
    .optional()
    .describe("The user's current education qualification."),
  reasonForUsing: z
    .string()
    .optional()
    .describe('Why the user is using this application.'),
});

const DailySummaryInputSchema = z.object({
  logs: z
    .array(LogEventSchema)
    .describe(
      "An array of user activity logs from the previous day (4 AM to 4 AM)."
    ),
  profile: UserProfileSchema.describe(
    "The user's profile information."
  ).optional(),
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
  prompt: `You are an extremely strict but fair study supervisor and productivity coach. Your feedback must be firm, motivating, and always pushing the student towards excellence.

Your task is to synthesize information from two key sources: the student's personal profile and their detailed activity log from yesterday. Use this combined context to generate a personalized daily briefing.

**1. Student Profile:**
This information provides the "why" behind their efforts.
{{#if profile.name}}
- **Name:** {{profile.name}}
{{/if}}
{{#if profile.passion}}
- **Passion:** {{profile.passion}}
{{/if}}
{{#if profile.dream}}
- **Dream Goal:** {{profile.dream}}
{{/if}}
{{#if profile.education}}
- **Currently Studying:** {{profile.education}}
{{/if}}
{{#if profile.reasonForUsing}}
- **Reason for Using App:** {{profile.reasonForUsing}}
{{/if}}

**2. Student's Activity Log from Yesterday:**
This data shows the "what" and "how" of their actions.
{{#if logs}}
{{#each logs}}
- [{{timestamp}}] Event: {{type}} - Details: {{JSONstringify payload}}
{{/each}}
{{else}}
The student had no recorded activity yesterday.
{{/if}}

**Your Response (MUST be in two parts):**

1.  **Evaluation**: Based *only on the activity log*, provide a detailed evaluation of their performance. Calculate the total study time from completed tasks. Analyze their patterns: When did they start? Did they complete what they started? Did they get distracted (look for TIMER_STOP events and their reasons)? Were they productive? Be critical but constructive. If they did well, acknowledge it, but challenge them to do even better.

2.  **Motivational Paragraph**: This is where you connect the "what" with the "why". Write a powerful, motivating paragraph for the upcoming day. Use insights from your evaluation and *explicitly connect them to the student's stated dream and passion from their profile*. If they were distracted, frame a strategy to stay focused as a necessary step towards their goal. If they were consistent, inspire them to maintain momentum. Address the user by name if they provided one. Your motivation must be deeply personal and directly reference their profile information.
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
