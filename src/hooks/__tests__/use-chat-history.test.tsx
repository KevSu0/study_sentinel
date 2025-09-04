import { renderHook, act } from '@testing-library/react';
import { useChatHistory, type ChatMessage } from '../use-chat-history';

const CHAT_HISTORY_KEY = 'studySentinelChatHistory_v1';
const MAX_HISTORY_LENGTH = 50;

const getInitialMessage = (): ChatMessage => ({
  role: 'model',
  content: "Hello! I'm your personal motivation coach. How can I help you on your journey today?",
});

describe('useChatHistory', () => {
  let initialMessage: ChatMessage;

  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    initialMessage = getInitialMessage();
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should initialize with the default message if localStorage is empty', () => {
    const { result } = renderHook(() => useChatHistory());

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.messages).toEqual([initialMessage]);
  });

  it('should load valid chat history from localStorage', () => {
    const storedMessages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'model', content: 'Hi there!' },
    ];
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(storedMessages));

    const { result } = renderHook(() => useChatHistory());

    expect(result.current.messages).toEqual(storedMessages);
  });

  it('should handle invalid data in localStorage by resetting to the initial message', () => {
    localStorage.setItem(CHAT_HISTORY_KEY, 'invalid-json');

    const { result } = renderHook(() => useChatHistory());

    expect(result.current.messages).toEqual([initialMessage]);
    expect(console.error).toHaveBeenCalledWith(
      'Failed to load or parse chat history, resetting.',
      expect.any(Error)
    );
  });
    
  it('should filter out invalid messages from localStorage', () => {
    const mixedData = [
      { role: 'user', content: 'Valid message' },
      { role: 'invalid', content: 'Invalid role' },
      { content: 'Missing role' },
      'just a string',
    ];
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(mixedData));

    const { result } = renderHook(() => useChatHistory());

    expect(result.current.messages).toEqual([{ role: 'user', content: 'Valid message' }]);
  });

  it('should initialize with the default message if localStorage contains an empty array', () => {
    localStorage.setItem(CHAT_HISTORY_KEY, '[]');
    const { result } = renderHook(() => useChatHistory());
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.messages).toEqual([initialMessage]);
  });

  it('should add a new message and save to localStorage', () => {
    const { result } = renderHook(() => useChatHistory());
    const newMessage: ChatMessage = { role: 'user', content: 'New message' };

    act(() => {
      result.current.addMessage(newMessage);
    });

    expect(result.current.messages).toEqual([initialMessage, newMessage]);
    expect(localStorage.getItem(CHAT_HISTORY_KEY)).toBe(
      JSON.stringify([initialMessage, newMessage])
    );
  });

  it('should not add an invalid message', () => {
    const { result } = renderHook(() => useChatHistory());
    const invalidMessage = { role: 'user' } as ChatMessage;

    act(() => {
      result.current.addMessage(invalidMessage);
    });

    expect(result.current.messages).toEqual([initialMessage]);
    expect(console.error).toHaveBeenCalledWith(
      'Attempted to add an invalid message to the chat history. Operation aborted.',
      invalidMessage
    );
  });

  it('should trim the history to MAX_HISTORY_LENGTH when adding a new message', () => {
    const initialHistory: ChatMessage[] = Array.from({ length: MAX_HISTORY_LENGTH }, (_, i) => ({
        role: 'user',
        content: `Message ${i}`,
    }));
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(initialHistory));

    const { result } = renderHook(() => useChatHistory());
    expect(result.current.messages.length).toBe(MAX_HISTORY_LENGTH);

    const newMessage: ChatMessage = { role: 'user', content: 'Overflow message' };
    act(() => {
        result.current.addMessage(newMessage);
    });

    expect(result.current.messages.length).toBe(MAX_HISTORY_LENGTH);
    expect(result.current.messages[0].content).toBe('Message 1');
    expect(result.current.messages[MAX_HISTORY_LENGTH - 1].content).toBe('Overflow message');
  });

  it('should update the last message content if it is from the model', () => {
    const { result } = renderHook(() => useChatHistory());
    
    act(() => {
        result.current.addMessage({ role: 'model', content: 'Initial' });
    });

    act(() => {
      result.current.updateLastMessage(' chunk');
    });

    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[1].content).toBe('Initial chunk');
  });

  it('should not update the last message if it is from the user', () => {
    const { result } = renderHook(() => useChatHistory());
    const userMessage: ChatMessage = { role: 'user', content: 'User message' };
    
    act(() => {
        result.current.addMessage(userMessage);
    });

    act(() => {
      result.current.updateLastMessage(' chunk');
    });

    expect(result.current.messages[1].content).toBe('User message');
  });

  it('should update the last message if it is a model message after clearing', () => {
    const { result } = renderHook(() => useChatHistory());
    
    act(() => {
        result.current.addMessage({role: 'user', content: 'a'});
        result.current.clearMessages(); // Resets to the initial model message
    });

    act(() => {
        result.current.updateLastMessage(' chunk');
    });
    
    // The last message is the initial message, which is 'model', so it should be updated.
    const expectedContent = getInitialMessage().content + ' chunk';
    expect(result.current.messages[0].content).toBe(expectedContent);
  });

  it('should clear all messages and reset to the initial message', () => {
    const { result } = renderHook(() => useChatHistory());
    act(() => {
      result.current.addMessage({ role: 'user', content: 'A message' });
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([initialMessage]);
    expect(localStorage.getItem(CHAT_HISTORY_KEY)).toBe(JSON.stringify([initialMessage]));
  });

  it('should handle localStorage.setItem failure gracefully when adding a message', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    const { result } = renderHook(() => useChatHistory());
    const newMessage: ChatMessage = { role: 'user', content: 'New message' };

    act(() => {
      result.current.addMessage(newMessage);
    });

    expect(console.error).toHaveBeenCalledWith(
      'Failed to save chat history',
      expect.any(Error)
    );
    setItemSpy.mockRestore();
  });

  it('should handle localStorage.setItem failure gracefully when clearing messages', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    const { result } = renderHook(() => useChatHistory());
    
    act(() => {
      result.current.clearMessages();
    });

    expect(console.error).toHaveBeenCalledWith(
      'Failed to save chat history',
      expect.any(Error)
    );
    setItemSpy.mockRestore();
  });
});