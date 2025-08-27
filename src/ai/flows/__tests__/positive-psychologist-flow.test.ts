import { generateChatbotResponse } from '../positive-psychologist-flow';
import { ai } from '@/ai/genkit';
import { PositivePsychologistInput } from '@/lib/types';

// Mock the genkit ai module
jest.mock('@/ai/genkit', () => ({
  ai: {
    generate: jest.fn(),
    defineFlow: jest.fn((config, fn) => ({
      run: fn,
    })),
  },
}));

// Typecast the mocked function
const mockedAiGenerate = ai.generate as jest.Mock;

describe('ai/flows/generateChatbotResponse', () => {
  const baseInput: PositivePsychologistInput = {
    profile: {
      name: 'Jordan',
      dream: 'to launch a startup',
    },
    dailySummary: {
      evaluation: 'Good progress on tasks.',
      motivationalParagraph: 'Keep going!',
    },
    upcomingTasks: [{ title: 'Finish pitch deck' }],
    weeklyStats: {
      totalHours: 10,
      completedCount: 5,
    },
    chatHistory: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAiGenerate.mockResolvedValue({ text: 'This is a mock response.' });
  });

  describe('History Sanitization', () => {
    it('should return a default greeting if chatHistory is empty', async () => {
      const result = await generateChatbotResponse.run({ ...baseInput, chatHistory: [] });
      expect(result).toEqual({ response: 'Hello! How can I help you on your journey today?' });
      expect(mockedAiGenerate).not.toHaveBeenCalled();
    });

    it('should return a default greeting if chatHistory is undefined', async () => {
      const input = { ...baseInput };
      delete (input as any).chatHistory;
      const result = await generateChatbotResponse.run(input);
      expect(result).toEqual({ response: 'Hello! How can I help you on your journey today?' });
      expect(mockedAiGenerate).not.toHaveBeenCalled();
    });

    it('should return a greeting if history contains no user messages', async () => {
        const input: PositivePsychologistInput = {
            ...baseInput,
            chatHistory: [{ role: 'model', content: 'Hello there!' }],
        };
        const result = await generateChatbotResponse.run(input);
        expect(result).toEqual({ response: "It looks like we're starting a new conversation. What's on your mind?" });
        expect(mockedAiGenerate).not.toHaveBeenCalled();
    });

    it('should filter out invalid messages from history', async () => {
      const input: PositivePsychologistInput = {
        ...baseInput,
        chatHistory: [
          { role: 'user', content: '  ' }, // Invalid
          { role: 'user', content: 'This is valid.' },
          { role: 'model', content: '' }, // Invalid
          null as any, // Invalid
          { role: 'model', content: 'So is this.' },
        ],
      };
      await generateChatbotResponse.run(input);
      expect(mockedAiGenerate).toHaveBeenCalledTimes(1);
      const calledWith = mockedAiGenerate.mock.calls[0][0];
      expect(calledWith.messages).toHaveLength(2);
      expect(calledWith.messages[0].content).toEqual([{ text: 'This is valid.' }]);
    });

    it('should slice history to start with the first user message', async () => {
        const input: PositivePsychologistInput = {
          ...baseInput,
          chatHistory: [
            { role: 'model', content: 'Welcome back.' },
            { role: 'user', content: 'I have a question.' },
            { role: 'model', content: 'What is it?' },
          ],
        };
        await generateChatbotResponse.run(input);
        expect(mockedAiGenerate).toHaveBeenCalledTimes(1);
        const calledWith = mockedAiGenerate.mock.calls[0][0];
        expect(calledWith.messages).toHaveLength(2);
        expect(calledWith.messages[0].role).toBe('user');
      });
  });

  describe('Prompt Construction', () => {
    it('should build a system prompt with all available context', async () => {
      const input: PositivePsychologistInput = {
        ...baseInput,
        chatHistory: [{ role: 'user', content: 'Tell me about my day.' }],
      };
      await generateChatbotResponse.run(input);
      const calledWith = mockedAiGenerate.mock.calls[0][0];
      const systemPrompt = calledWith.system;

      expect(systemPrompt).toContain('name is Jordan');
      expect(systemPrompt).toContain('dream: "to launch a startup"');
      expect(systemPrompt).toContain('evaluation from today: "Good progress on tasks."');
      expect(systemPrompt).toContain('motivational message they received today: "Keep going!"');
      expect(systemPrompt).toContain('Upcoming tasks for today: Finish pitch deck');
      expect(systemPrompt).toContain('Total hours studied: 10');
      expect(systemPrompt).toContain('Tasks completed: 5');
    });

    it('should handle missing optional context gracefully', async () => {
      const input: PositivePsychologistInput = {
        profile: {},
        chatHistory: [{ role: 'user', content: 'I am new here.' }],
      };
      await generateChatbotResponse.run(input);
      const calledWith = mockedAiGenerate.mock.calls[0][0];
      const systemPrompt = calledWith.system;

      expect(systemPrompt).toContain('name is not provided');
      expect(systemPrompt).toContain('dream: "not provided"');
      expect(systemPrompt).toContain('evaluation from today: "not available"');
      expect(systemPrompt).toContain('motivational message they received today: "not available"');
      expect(systemPrompt).toContain('Upcoming tasks for today: None');
      expect(systemPrompt).toContain('Total hours studied: 0');
      expect(systemPrompt).toContain('Tasks completed: 0');
    });
  });

  describe('AI Call and Response', () => {
    it('should call ai.generate and return its text response', async () => {
      const input: PositivePsychologistInput = {
        ...baseInput,
        chatHistory: [{ role: 'user', content: 'How am I doing?' }],
      };
      const mockText = 'You are doing great, Jordan!';
      mockedAiGenerate.mockResolvedValue({ text: mockText });

      const result = await generateChatbotResponse.run(input);

      expect(mockedAiGenerate).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ response: mockText });
    });
  });
});