// Offline/static build stubs to replace server actions
// This file is used when NEXT_PUBLIC_MOBILE_STATIC=true

import type { DailySummaryInput, PositivePsychologistInput } from '@/lib/types';

export async function getDailySummary(_input: DailySummaryInput) {
  return {
    evaluation:
      'Offline build: Daily summary generation requires online AI service. Showing placeholder.',
    motivationalParagraph:
      'Stay consistent and kind to yourself today. Your effort compounds over time.'
  };
}

export async function getChatbotResponse(_input: PositivePsychologistInput) {
  return { error: 'Offline build: AI chat is unavailable.' } as const;
}

