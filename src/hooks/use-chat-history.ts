'use client';

import {useState, useEffect, useCallback} from 'react';

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

const CHAT_HISTORY_KEY = 'studySentinelChatHistory';
const MAX_HISTORY_LENGTH = 50;

const initialMessage: ChatMessage = {
  role: 'model',
  content:
    "Hello! I'm your personal motivation coach. How can I help you on your journey today?",
};

// This is a robust type guard to check for a valid message.
const isValidMessage = (msg: any): msg is ChatMessage => {
  return (
    msg &&
    typeof msg === 'object' &&
    (msg.role === 'user' || msg.role === 'model') &&
    typeof msg.content === 'string' &&
    msg.content.trim() !== ''
  );
};

export function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // This effect runs only once on mount to load from localStorage.
    setIsLoaded(false);
    const loadedMessages: ChatMessage[] = [];
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          // Use a defensive loop to rebuild the array, ensuring no corrupted data gets through.
          for (const msg of parsed) {
            if (isValidMessage(msg)) {
              loadedMessages.push(msg);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load or parse chat history, resetting.', error);
      // If there's any error, we reset localStorage to a clean state.
      localStorage.removeItem(CHAT_HISTORY_KEY);
    }

    // Set the state with either the cleaned messages or the initial message.
    setMessages(loadedMessages.length > 0 ? loadedMessages : [initialMessage]);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    // This effect runs whenever 'messages' changes, to save to localStorage.
    if (isLoaded) {
      try {
        // Before saving, ensure the data is still clean. This is a final failsafe.
        const historyToSave = messages
          .filter(isValidMessage)
          .slice(-MAX_HISTORY_LENGTH);

        if (historyToSave.length > 0) {
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyToSave));
        } else {
          // If history somehow becomes empty/invalid, reset to a safe initial state.
          localStorage.setItem(
            CHAT_HISTORY_KEY,
            JSON.stringify([initialMessage])
          );
        }
      } catch (error) {
        console.error('Failed to save chat history', error);
      }
    }
  }, [messages, isLoaded]);

  const addMessage = useCallback((message: ChatMessage) => {
    // Validate the message before adding it to the state.
    if (!isValidMessage(message)) {
      console.error(
        'Attempted to add an invalid message to the chat history. Operation aborted.',
        message
      );
      return;
    }
    setMessages(prevMessages =>
      [...prevMessages, message].slice(-MAX_HISTORY_LENGTH)
    );
  }, []);

  const clearMessages = useCallback(() => {
    const newHistory = [initialMessage];
    setMessages(newHistory);
    // Also clear from local storage immediately.
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newHistory));
  }, []);

  return {messages, addMessage, clearMessages, isLoaded};
}
