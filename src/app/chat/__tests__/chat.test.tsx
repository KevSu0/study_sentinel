import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatPage from '../page';
import { useChatHistory, type ChatMessage } from '@/hooks/use-chat-history';
import { useGlobalState } from '@/hooks/use-global-state';
import * as actions from '@/lib/actions';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';

// Mock dependencies
jest.mock('@/hooks/use-chat-history');
jest.mock('@/hooks/use-global-state');
jest.mock('@/lib/actions');
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

const mockUseChatHistory = useChatHistory as jest.Mock;
const mockUseGlobalState = useGlobalState as jest.Mock;
const mockGetChatbotResponse = actions.getChatbotResponse as jest.Mock;
const mockGetDailySummary = actions.getDailySummary as jest.Mock;

// Default mock data
const mockProfile = { name: 'Test User', dream: 'To be a tester' };
const upcomingTaskDate = new Date();
upcomingTaskDate.setDate(upcomingTaskDate.getDate() + 1);

const mockTasks = [
  { id: 't1', title: 'Upcoming Task', status: 'todo', date: upcomingTaskDate.toISOString() },
  { id: 't2', title: 'Completed Task', status: 'done', date: new Date().toISOString() },
];
const mockRoutines = [{ id: 'r1', title: 'Morning Routine' }];
const mockTodaysCompletedWork = [{ subjectId: 't2' }, { subjectId: 'r1' }];
const mockTodaysLogs = [{ id: 'l1', content: 'Logged something' }];
const mockDailySummary = { evaluation: 'A great day for testing!' };

describe('ChatPage', () => {
  const mockAddMessage = jest.fn();
  const mockClearMessages = jest.fn();
  let consoleErrorSpy: jest.SpyInstance;

  // A robust setup function
  const setup = (chatHistoryState: Partial<ReturnType<typeof useChatHistory>>, globalState: any) => {
    mockUseChatHistory.mockReturnValue({
      messages: [],
      addMessage: mockAddMessage,
      clearMessages: mockClearMessages,
      isLoaded: true,
      ...chatHistoryState,
    });

    mockUseGlobalState.mockReturnValue({
      state: {
        profile: mockProfile,
        tasks: mockTasks,
        routines: mockRoutines,
        todaysCompletedWork: mockTodaysCompletedWork,
        todaysLogs: mockTodaysLogs,
        ...globalState,
      },
    });

    // Mock the two-step API calls
    mockGetDailySummary.mockResolvedValue(mockDailySummary);
    mockGetChatbotResponse.mockResolvedValue({ response: 'Hello from the bot!' });

    return render(<ChatPage />, { wrapper: MemoryRouterProvider });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock scrollIntoView, which is not implemented in JSDOM
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should render the header and input form', () => {
    setup({}, {});
    expect(screen.getByText('AI Positive Psychologist')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask for encouragement or advice...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('should show skeleton loaders when chat history is not loaded', () => {
    setup({ isLoaded: false }, {});
    // We query by test ID because the underlying Skeleton component's role ('status')
    // is not reliably exposed in the JSDOM environment.
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('should render existing chat messages', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello AI' },
      { role: 'model', content: 'Hello User' },
    ];
    setup({ messages }, {});
    expect(screen.getByText('Hello AI')).toBeInTheDocument();
    expect(screen.getByText('Hello User')).toBeInTheDocument();
  });

  it('should send a message with full context and render AI response', async () => {
    const initialMessages: ChatMessage[] = [];
    setup({ messages: initialMessages }, {});

    const input = screen.getByPlaceholderText('Ask for encouragement or advice...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'How should I prepare?' } });
    fireEvent.click(sendButton);

    // 1. User message is added immediately
    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith({
        role: 'user',
        content: 'How should I prepare?',
      });
    });

    // 2. Shows "sending" state
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    expect(input).toBeDisabled();
    expect(screen.getByTestId('sending-indicator')).toBeInTheDocument();

    // 3. Fetches daily summary with correct context
    await waitFor(() => {
      expect(mockGetDailySummary).toHaveBeenCalledWith({
        profile: { name: mockProfile.name, dream: mockProfile.dream },
        tasks: mockTasks.filter(t => t.id === 't2'),
        routines: mockRoutines,
        logs: mockTodaysLogs,
      });
    });

    // 4. Fetches chatbot response with summary and history
    await waitFor(() => {
      const newUserMessage = { role: 'user', content: 'How should I prepare?' };
      expect(mockGetChatbotResponse).toHaveBeenCalledWith({
        profile: mockProfile,
        dailySummary: mockDailySummary,
        chatHistory: [...initialMessages, newUserMessage],
        upcomingTasks: mockTasks.filter(t => t.status === 'todo'),
      });
    });

    // 5. Adds the AI response to the chat
    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith({
        role: 'model',
        content: 'Hello from the bot!',
      });
    });

    // 6. Resets sending state
    await waitFor(() => {
      // The input should be re-enabled, indicating the sending process is complete.
      expect(input).not.toBeDisabled();
    });
    // The button remains disabled because the input is now empty.
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('should send a message by pressing Enter key without Shift', async () => {
    setup({}, {});
    const input = screen.getByPlaceholderText('Ask for encouragement or advice...');
    fireEvent.change(input, { target: { value: 'A keyboard message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith({
        role: 'user',
        content: 'A keyboard message',
      });
    });
    await waitFor(() => {
      expect(mockGetChatbotResponse).toHaveBeenCalled();
    });
  });
  
  it('should not send a message when pressing Enter key with Shift', () => {
    setup({}, {});
    const input = screen.getByPlaceholderText('Ask for encouragement or advice...');
    fireEvent.change(input, { target: { value: 'A multi-line message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });

    expect(mockAddMessage).not.toHaveBeenCalled();
    expect(mockGetChatbotResponse).not.toHaveBeenCalled();
  });

  it('should not send a message if input is empty or only whitespace', () => {
    setup({}, {});
    const input = screen.getByPlaceholderText('Ask for encouragement or advice...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(sendButton).toBeDisabled();
    fireEvent.change(input, { target: { value: '   ' } });
    expect(sendButton).toBeDisabled();

    fireEvent.click(sendButton);
    expect(mockGetChatbotResponse).not.toHaveBeenCalled();
  });

  it('should not send a message if already sending', async () => {
    setup({}, {});
    const input = screen.getByPlaceholderText('Ask for encouragement or advice...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'First message' } });
    fireEvent.click(sendButton);

    // At this point, isSending is true. Try to click again.
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);

    await waitFor(() => {
      // The API should only be called once for the first message.
      expect(mockGetChatbotResponse).toHaveBeenCalledTimes(1);
    });
  });

  it('should display a network error message if getChatbotResponse throws', async () => {
    setup({}, {});
    mockGetChatbotResponse.mockRejectedValue(new Error('Network Error'));

    fireEvent.change(screen.getByPlaceholderText('Ask for encouragement or advice...'), {
      target: { value: 'A message' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith({
        role: 'model',
        content: 'There was a network problem. Please check your connection and try again.',
      });
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Network error calling getChatbotResponse:', expect.any(Error));
  });

  it('should display an API error if response contains an error property', async () => {
    setup({}, {});
    const apiError = 'Invalid request';
    mockGetChatbotResponse.mockResolvedValue({ error: apiError }); // Malformed response

    fireEvent.change(screen.getByPlaceholderText('Ask for encouragement or advice...'), {
      target: { value: 'A message' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith({
        role: 'model',
        content: "I'm sorry, I encountered an error and couldn't process your request. Please try again later.",
      });
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Chatbot API error:', apiError);
  });

  it('should handle API errors with a completely unexpected structure', async () => {
    setup({}, {});
    mockGetChatbotResponse.mockResolvedValue({ someOtherProp: 'some value' }); // Neither 'response' nor 'error'

    fireEvent.change(screen.getByPlaceholderText('Ask for encouragement or advice...'), {
      target: { value: 'A message' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith({
        role: 'model',
        content: "I'm sorry, I encountered an error and couldn't process your request. Please try again later.",
      });
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Chatbot API error: Unexpected response structure');
  });

  it('should clear chat history when clear button is clicked', () => {
    setup({}, {});
    const clearButton = screen.getByRole('button', { name: /clear chat/i });
    fireEvent.click(clearButton);
    expect(mockClearMessages).toHaveBeenCalledTimes(1);
  });

  it('should render markdown in chat messages correctly', async () => {
    const messages: ChatMessage[] = [
      { role: 'model', content: '**Bold Text** and *Italic Text*' },
    ];
    setup({ messages }, {});

    const boldElement = screen.getByText('Bold Text');
    const italicElement = screen.getByText('Italic Text');

    expect(boldElement.tagName).toBe('STRONG');
    expect(italicElement.tagName).toBe('EM');
  });

  describe('Context Handling', () => {
    it('should provide default values for profile name and dream if they are missing', async () => {
      // Setup with an incomplete profile
      setup({}, { profile: {} });

      const input = screen.getByPlaceholderText('Ask for encouragement or advice...');
      fireEvent.change(input, { target: { value: 'A message' } });
      fireEvent.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(mockGetDailySummary).toHaveBeenCalledWith(
          expect.objectContaining({
            profile: { name: 'Anonymous', dream: 'Not specified' },
          })
        );
      });
    });
  });
});