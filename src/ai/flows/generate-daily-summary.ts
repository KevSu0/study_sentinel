import { DailySummaryInput, DailySummaryOutput } from '@/lib/types';

/**
 * Mock implementation of daily summary generation
 * This is a placeholder for the actual AI flow implementation
 */
export async function generateDailySummary(input: DailySummaryInput): Promise<DailySummaryOutput> {
  // Mock implementation - replace with actual AI logic
  return {
    evaluation: 'Great progress today!',
    motivationalParagraph: 'Keep up the excellent work and stay focused on your goals.'
  };
}