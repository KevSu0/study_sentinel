import { generateWithFallback } from '../core';
import { ai } from '@/ai/genkit';
import { GenerateOptions } from '@genkit-ai/ai';
import { z } from 'zod';

// Mock the genkit ai module
jest.mock('@/ai/genkit', () => ({
  ai: {
    generate: jest.fn(),
  },
}));

// Typecast the mocked function
const mockedAiGenerate = ai.generate as jest.Mock;

describe('ai/core', () => {
  // Mock console.error to avoid polluting test output
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const mockArgs: GenerateOptions<z.ZodAny> = {
    prompt: 'Test prompt',
    model: 'gemini-pro',
    output: {
      schema: z.any(),
    },
  };

  it('should return the result from ai.generate on success', async () => {
    const mockResponse = {
      candidates: [
        {
          message: {
            content: 'This is a test response.',
          },
        },
      ],
    };
    mockedAiGenerate.mockResolvedValue(mockResponse);

    const result = await generateWithFallback(mockArgs);

    expect(result).toEqual(mockResponse);
    expect(mockedAiGenerate).toHaveBeenCalledWith(mockArgs);
    expect(mockedAiGenerate).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if ai.generate fails', async () => {
    const mockError = new Error('AI model unavailable');
    mockedAiGenerate.mockRejectedValue(mockError);

    // We expect the function to throw, so we wrap it in a promise rejection test
    await expect(generateWithFallback(mockArgs)).rejects.toThrow(mockError);

    expect(mockedAiGenerate).toHaveBeenCalledWith(mockArgs);
    expect(mockedAiGenerate).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('AI generation failed:', mockError);
  });
});