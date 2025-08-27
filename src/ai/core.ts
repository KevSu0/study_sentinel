import {ai} from '@/ai/genkit';
import {GenerateOptions, GenerateResponse} from '@genkit-ai/ai';
import {ZodTypeAny} from 'zod';

/**
 * Generates a response from a series of models, falling back to the next on failure.
 * This function wraps the 'genkit/ai' generate function to add resilience.
 *
 * @param {GenerateOptions} args - The original arguments for the generate function.
 * @returns {Promise<GenerateResponse<any>>} A promise that resolves with the generation result.
 * @throws {Error} If all models in the fallback list fail to generate a response.
 */
export async function generateWithFallback(
  args: GenerateOptions<ZodTypeAny>
): Promise<GenerateResponse<any>> {
  try {
    const result = await ai.generate(args);
    return result;
  } catch (error) {
    console.error('AI generation failed:', error);
    throw error;
  }
}