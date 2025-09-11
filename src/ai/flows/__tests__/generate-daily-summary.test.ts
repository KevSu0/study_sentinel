/**
 * @jest-environment node
 */
import { generateDailySummary } from '../generate-daily-summary';
import { generateWithFallback } from '@/ai/core';
import { DailySummaryInput } from '@/lib/types';

// Mock the core AI generation function
jest.mock('@/ai/core');

// Typecast the mocked function
const mockedGenerateWithFallback = generateWithFallback as jest.Mock;

describe('ai/flows/generateDailySummary', () => {
  const validInput: DailySummaryInput = {
    profile: {
      name: 'Alex',
      dream: 'become a world-class developer',
    },
    tasks: [{}, {}], // 2 tasks
    routines: [{}], // 1 routine
    logs: [{}, {}, {}], // 3 logs
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call generateWithFallback with a correctly formatted prompt', async () => {
    const mockResponse = 'EVALUATION: Test eval. MOTIVATION: Test motivation.';
    mockedGenerateWithFallback.mockResolvedValue({ text: mockResponse });

    await generateDailySummary(validInput);

    expect(mockedGenerateWithFallback).toHaveBeenCalledTimes(1);
    const calledWith = mockedGenerateWithFallback.mock.calls[0][0];
    expect(calledWith.prompt).toContain('Name: Alex');
    expect(calledWith.prompt).toContain('Dream: become a world-class developer');
    expect(calledWith.prompt).toContain('Completed Tasks: 2');
    expect(calledWith.prompt).toContain('Completed Routines: 1');
    expect(calledWith.prompt).toContain('Total Logs: 3');
  });

  it('should correctly parse a well-formatted response', async () => {
    const mockResponse =
      'EVALUATION: You had a very productive day! MOTIVATION: Keep pushing towards your dream!';
    mockedGenerateWithFallback.mockResolvedValue({ text: mockResponse });

    const result = await generateDailySummary.run(validInput);

    expect(result.result).toEqual({
      evaluation: 'You had a very productive day!',
      motivationalParagraph: 'Keep pushing towards your dream!',
    });
  });

  it('should handle extra whitespace in the response', async () => {
    const mockResponse =
      '   EVALUATION:    You did great.   \nMOTIVATION:   You are awesome.   ';
    mockedGenerateWithFallback.mockResolvedValue({ text: mockResponse });

    const result = await generateDailySummary.run(validInput);

    expect(result.result).toEqual({
      evaluation: 'You did great.',
      motivationalParagraph: 'You are awesome.',
    });
  });

  it('should provide a default evaluation if the keyword is missing', async () => {
    const mockResponse = 'MOTIVATION: Keep it up!';
    mockedGenerateWithFallback.mockResolvedValue({ text: mockResponse });

    const result = await generateDailySummary.run(validInput);

    expect(result.result).toEqual({
      evaluation: 'No evaluation generated.',
      motivationalParagraph: 'Keep it up!',
    });
  });

  it('should provide a default motivation if the keyword is missing', async () => {
    const mockResponse = 'EVALUATION: Good job today.';
    mockedGenerateWithFallback.mockResolvedValue({ text: mockResponse });

    const result = await generateDailySummary.run(validInput);

    expect(result.result).toEqual({
      evaluation: 'Good job today.',
      motivationalParagraph: 'Keep up the great work!',
    });
  });

  it('should provide defaults for both if the response is empty or malformed', async () => {
    const mockResponse = 'This is not the format you are looking for.';
    mockedGenerateWithFallback.mockResolvedValue({ text: mockResponse });

    const result = await generateDailySummary.run(validInput);

    expect(result.result).toEqual({
      evaluation: 'No evaluation generated.',
      motivationalParagraph: 'Keep up the great work!',
    });

    // Test with empty string
    mockedGenerateWithFallback.mockResolvedValue({ text: '' });
    const result2 = await generateDailySummary.run(validInput);
    expect(result2.result).toEqual({
        evaluation: 'No evaluation generated.',
        motivationalParagraph: 'Keep up the great work!',
      });
  });
});