import { getDailySummary, getChatbotResponse } from '../actions';
import { generateDailySummary } from '@/ai/flows/generate-daily-summary';
import { generateChatbotResponse } from '@/ai/flows/positive-psychologist-flow';
import { DailySummaryInput, PositivePsychologistInput } from '@/lib/types';

// Mock the AI flow modules
jest.mock('@/ai/flows/generate-daily-summary');
jest.mock('@/ai/flows/positive-psychologist-flow');

// Typecast the mocked functions correctly by first casting to 'unknown'
const mockedGenerateDailySummary = generateDailySummary as unknown as jest.Mock;
const mockedGenerateChatbotResponse = generateChatbotResponse as unknown as jest.Mock;

describe('lib/actions', () => {
  // Mock console.error to avoid polluting test output
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('getDailySummary', () => {
    const validInput: DailySummaryInput = {
      profile: {
        name: 'Tester',
        dream: 'To write perfect tests',
      },
      tasks: [],
      routines: [],
      logs: [],
    };

    it('should return the summary result on successful generation', async () => {
      const mockResult = { evaluation: 'Good job!', motivationalParagraph: 'Keep it up!' };
      mockedGenerateDailySummary.mockResolvedValue(mockResult);

      const result = await getDailySummary(validInput);

      expect(result).toEqual(mockResult);
      expect(mockedGenerateDailySummary).toHaveBeenCalledWith(validInput);
      expect(mockedGenerateDailySummary).toHaveBeenCalledTimes(1);
    });

    it('should return an error object if summary generation fails with an Error instance', async () => {
      const errorMessage = 'AI model is on vacation';
      const mockError = new Error(errorMessage);
      mockedGenerateDailySummary.mockRejectedValue(mockError);

      const result = await getDailySummary(validInput);

      expect(result).toEqual({ error: `AI summary failed: ${errorMessage}` });
      expect(consoleErrorSpy).toHaveBeenCalledWith('AI summary generation failed:', mockError);
    });

    it('should return a generic error object if summary generation fails with an unknown error', async () => {
      const mockError = 'a string error';
      mockedGenerateDailySummary.mockRejectedValue(mockError);

      const result = await getDailySummary(validInput);

      expect(result).toEqual({ error: 'An unknown error occurred during AI summary generation.' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('AI summary generation failed:', mockError);
    });
  });

  describe('getChatbotResponse', () => {
    const validInput: PositivePsychologistInput = {
      profile: {
        name: 'Tester',
      },
      chatHistory: [{ role: 'user', content: 'I feel down today' }],
    };

    it('should return the chatbot response on successful generation', async () => {
      const mockResult = { response: 'Chin up!' };
      mockedGenerateChatbotResponse.mockResolvedValue(mockResult);

      const result = await getChatbotResponse(validInput);

      expect(result).toEqual(mockResult);
      expect(mockedGenerateChatbotResponse).toHaveBeenCalledWith(validInput);
      expect(mockedGenerateChatbotResponse).toHaveBeenCalledTimes(1);
    });

    it('should return an error object if chat response generation fails with an Error instance', async () => {
      const errorMessage = 'AI is busy chatting with someone else';
      const mockError = new Error(errorMessage);
      mockedGenerateChatbotResponse.mockRejectedValue(mockError);

      const result = await getChatbotResponse(validInput);

      expect(result).toEqual({ error: `AI chat failed: ${errorMessage}` });
      expect(consoleErrorSpy).toHaveBeenCalledWith('AI chat response failed:', mockError);
    });

    it('should return a generic error object if chat response generation fails with an unknown error', async () => {
      const mockError = { code: 500, message: 'Internal Server Error' };
      mockedGenerateChatbotResponse.mockRejectedValue(mockError);

      const result = await getChatbotResponse(validInput);

      expect(result).toEqual({ error: 'An unknown error occurred during AI chat response generation.' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('AI chat response failed:', mockError);
    });
  });
});