'use server';
/**
 * @fileOverview A flow to generate a daily summary for the user.
 */

import {ai} from '@/ai/genkit';
import {
  DailySummaryInputSchema,
  DailySummaryOutputSchema,
} from '@/lib/types';
import {generateWithFallback} from '@/ai/core';

export const generateDailySummary = ai.defineFlow(
  {
    name: 'generateDailySummary',
    inputSchema: DailySummaryInputSchema,
    outputSchema: DailySummaryOutputSchema,
  },
  async (input) => {
    const {profile, tasks, routines, logs} = input;

    const prompt = `
      As an expert life coach and data analyst, your task is to provide a concise, motivational, and insightful daily summary for a user based on their activity.

      **User Profile:**
      - Name: ${profile.name}
      - Dream: ${profile.dream}

      **Today's Activity:**
      - Completed Tasks: ${tasks.length}
      - Completed Routines: ${routines.length}
      - Total Logs: ${logs.length}

      **Instructions:**
      Your response MUST be structured in two parts, separated by a specific delimiter.
      1.  **Evaluation:** Start with "EVALUATION:". Briefly evaluate the user's productivity and consistency. Highlight wins and areas for gentle improvement.
      2.  **Motivational Paragraph:** Start with "MOTIVATION:". Write a short, powerful, and personalized paragraph to inspire the user for tomorrow. Connect it to their dream.

      Example:
      EVALUATION: Great job on completing ${
        tasks.length
      } tasks today! Your focus is clear.
      MOTIVATION: Every step you take brings you closer to your dream of "${
        profile.dream
      }". Keep that vision in mind and let it fuel you.

      Keep the tone positive, encouraging, and empathetic.
    `;

    const result = await generateWithFallback({
      prompt,
    });

    const text = result.text;
    const evaluationMatch = text.match(/EVALUATION:([\s\S]*?)(?=MOTIVATION:|$)/);
    const motivationMatch = text.match(/MOTIVATION:([\s\S]*)/);

    return {
      evaluation: evaluationMatch ? evaluationMatch[1].trim() : 'No evaluation generated.',
      motivationalParagraph: motivationMatch ? motivationMatch[1].trim() : 'Keep up the great work!',
    };
  }
);
