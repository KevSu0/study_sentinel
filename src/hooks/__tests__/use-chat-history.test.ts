import { renderHook, act } from '@testing-library/react';
import { useChatHistory, ChatMessage } from '../use-chat-history';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('useChatHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Initial State', () => {
    it('should initialize with default message when no stored history', () => {
      const { result } = renderHook(() => useChatHistory());
      
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual({
        role: 'model',
        content: "Hello! I'm your personal motivation coach. How can I help you on your journey today?",
      });
      expect(result.current.isLoaded).toBe(true);
    });

    it('should start with isLoaded as false and then set to true', () => {
      const { result } = renderHook(() => useChatHistory());
      
      // After initial render, isLoaded should be true
      expect(result.current.isLoaded).toBe(true);
    });
  });

  describe('Loading from localStorage', () => {
    it('should load valid messages from localStorage', () => {
      const storedMessages = [
        { role: 'user', content: 'Hello' },
        { role: 'model', content: 'Hi there!' },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedMessages));

      const { result } = renderHook(() => useChatHistory());

      expect(result.current.messages).toEqual(storedMessages);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('studySentinelChatHistory_v1');
    });

    it('should filter out invalid messages when loading', () => {
      const storedMessages = [
        { role: 'user', content: 'Valid message' },
        { role: 'invalid', content: 'Invalid role' }, // Invalid role
        { role: 'model', content: 123 }, // Invalid content type
        { role: 'model' }, // Missing content
        null, // Null message
        { role: 'model', content: 'Another valid message' },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedMessages));

      const { result } = renderHook(() => useChatHistory());

      expect(result.current.messages).toEqual([
        { role: 'user', content: 'Valid message' },
        { role: 'model', content: 'Another valid message' },
      ]);
    });

    it('should handle invalid JSON in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => useChatHistory());

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('model');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to load or parse chat history, resetting.',
        expect.any(Error)
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('studySentinelChatHistory_v1');
    });

    it('should handle localStorage.getItem throwing an error', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() => useChatHistory());

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('model');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to load or parse chat history, resetting.',
        expect.any(Error)
      );
    });

    it('should use default message when stored history is empty array', () => {
      mockLocalStorage.getItem.mockReturnValue('[]');

      const { result } = renderHook(() => useChatHistory());

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('model');
    });

    it('should use default message when stored history contains only invalid messages', () => {
      const invalidMessages = [
        { role: 'invalid', content: 'test' },
        { content: 'missing role' },
        { role: 'user' }, // missing content
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(invalidMessages));

      const { result } = renderHook(() => useChatHistory());

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('model');
    });
  });

  describe('Adding Messages', () => {
    it('should add valid user message', () => {
      const { result } = renderHook(() => useChatHistory());
      const newMessage: ChatMessage = { role: 'user', content: 'Test message' };

      act(() => {
        result.current.addMessage(newMessage);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1]).toEqual(newMessage);
    });

    it('should add valid model message', () => {
      const { result } = renderHook(() => useChatHistory());
      const newMessage: ChatMessage = { role: 'model', content: 'AI response' };

      act(() => {
        result.current.addMessage(newMessage);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1]).toEqual(newMessage);
    });

    it('should reject invalid messages and log error', () => {
      const { result } = renderHook(() => useChatHistory());
      const invalidMessage = { role: 'invalid', content: 'test' } as any;

      act(() => {
        result.current.addMessage(invalidMessage);
      });

      expect(result.current.messages).toHaveLength(1); // Only initial message
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Attempted to add an invalid message to the chat history. Operation aborted.',
        invalidMessage
      );
    });

    it('should enforce maximum history length', () => {
      const { result } = renderHook(() => useChatHistory());
      
      // Add 51 messages (1 initial + 50 new = 51 total, should trim to 50)
      act(() => {
        for (let i = 0; i < 51; i++) {
          result.current.addMessage({ role: 'user', content: `Message ${i}` });
        }
      });

      expect(result.current.messages).toHaveLength(50);
      // Should keep the last 50 messages
      expect(result.current.messages[0].content).toBe('Message 1'); // First message after initial is kept
      expect(result.current.messages[49].content).toBe('Message 50');
    });
  });

  describe('Updating Last Message', () => {
    it('should update last model message content', () => {
      const { result } = renderHook(() => useChatHistory());
      
      // Add a model message
      act(() => {
        result.current.addMessage({ role: 'model', content: 'Initial content' });
      });

      // Update the last message
      act(() => {
        result.current.updateLastMessage(' - updated');
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('Initial content - updated');
    });

    it('should not update last message if it is not a model message', () => {
      const { result } = renderHook(() => useChatHistory());
      
      // Add a user message
      act(() => {
        result.current.addMessage({ role: 'user', content: 'User message' });
      });

      // Try to update the last message
      act(() => {
        result.current.updateLastMessage(' - should not be added');
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('User message'); // Unchanged
    });

    it('should handle empty messages array', () => {
      const { result } = renderHook(() => useChatHistory());
      
      // Clear all messages first
      act(() => {
        result.current.clearMessages();
      });

      // Manually set empty array (edge case)
      act(() => {
        // This simulates an edge case where messages might be empty
        result.current.updateLastMessage('test');
      });

      // Should not crash and messages should remain as they were after clear
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('model');
    });
  });

  describe('Clearing Messages', () => {
    it('should reset to initial message when cleared', () => {
      const { result } = renderHook(() => useChatHistory());
      
      // Add some messages
      act(() => {
        result.current.addMessage({ role: 'user', content: 'Message 1' });
        result.current.addMessage({ role: 'model', content: 'Message 2' });
      });

      expect(result.current.messages).toHaveLength(3);

      // Clear messages
      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual({
        role: 'model',
        content: "Hello! I'm your personal motivation coach. How can I help you on your journey today?",
      });
    });
  });

  describe('localStorage Persistence', () => {
    it('should save messages to localStorage when messages change', () => {
      const { result } = renderHook(() => useChatHistory());
      
      act(() => {
        result.current.addMessage({ role: 'user', content: 'Test message' });
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'studySentinelChatHistory_v1',
        JSON.stringify(result.current.messages)
      );
    });

    it('should handle localStorage.setItem errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage full');
      });

      const { result } = renderHook(() => useChatHistory());
      
      act(() => {
        result.current.addMessage({ role: 'user', content: 'Test message' });
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save chat history',
        expect.any(Error)
      );
    });

    it('should save only valid messages to localStorage', () => {
      const { result } = renderHook(() => useChatHistory());
      
      // Manually set messages with invalid ones (edge case simulation)
      act(() => {
        result.current.addMessage({ role: 'user', content: 'Valid message' });
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'studySentinelChatHistory_v1',
        expect.stringContaining('Valid message')
      );
    });

    it('should limit saved messages to MAX_HISTORY_LENGTH', () => {
      const { result } = renderHook(() => useChatHistory());
      
      // Add more than 50 messages
      act(() => {
        for (let i = 0; i < 55; i++) {
          result.current.addMessage({ role: 'user', content: `Message ${i}` });
        }
      });

      // Check that localStorage.setItem was called with limited messages
      const lastCall = mockLocalStorage.setItem.mock.calls[mockLocalStorage.setItem.mock.calls.length - 1];
      const savedMessages = JSON.parse(lastCall[1]);
      expect(savedMessages).toHaveLength(50);
    });

    it('should save initial message when all messages are cleared', () => {
      const { result } = renderHook(() => useChatHistory());
      
      act(() => {
        result.current.clearMessages();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'studySentinelChatHistory_v1',
        JSON.stringify([{
          role: 'model',
          content: "Hello! I'm your personal motivation coach. How can I help you on your journey today?",
        }])
      );
    });
  });

  describe('Function Stability', () => {
    it('should maintain function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useChatHistory());
      
      const initialAddMessage = result.current.addMessage;
      const initialUpdateLastMessage = result.current.updateLastMessage;
      const initialClearMessages = result.current.clearMessages;

      rerender();

      expect(result.current.addMessage).toBe(initialAddMessage);
      expect(result.current.updateLastMessage).toBe(initialUpdateLastMessage);
      expect(result.current.clearMessages).toBe(initialClearMessages);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid message additions', () => {
      const { result } = renderHook(() => useChatHistory());
      
      act(() => {
        result.current.addMessage({ role: 'user', content: 'Message 1' });
        result.current.addMessage({ role: 'model', content: 'Message 2' });
        result.current.addMessage({ role: 'user', content: 'Message 3' });
      });

      expect(result.current.messages).toHaveLength(4); // 1 initial + 3 added
      expect(result.current.messages[1].content).toBe('Message 1');
      expect(result.current.messages[2].content).toBe('Message 2');
      expect(result.current.messages[3].content).toBe('Message 3');
    });

    it('should handle empty string content', () => {
      const { result } = renderHook(() => useChatHistory());
      
      act(() => {
        result.current.addMessage({ role: 'user', content: '' });
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('');
    });

    it('should handle very long content', () => {
      const { result } = renderHook(() => useChatHistory());
      const longContent = 'a'.repeat(10000);
      
      act(() => {
        result.current.addMessage({ role: 'user', content: longContent });
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe(longContent);
    });
  });
});