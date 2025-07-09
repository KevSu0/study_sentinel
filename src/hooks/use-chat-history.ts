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

// A robust validation function to ensure a message is in the correct format
const isValidMessage = (msg: any): msg is ChatMessage => {
  return (
    msg &&
    typeof msg === 'object' && // Ensure it's an object
    !Array.isArray(msg) && // Ensure it's not an array
    typeof msg.role === 'string' &&
    (msg.role === 'user' || msg.role === 'model') &&
    typeof msg.content === 'string'
  );
};

export function useChatHistory() {
  const [messages, setInternalMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory) {
        let parsedHistory;
        try {
          parsedHistory = JSON.parse(savedHistory);
        } catch {
          // If JSON is invalid, reset.
          localStorage.removeItem(CHAT_HISTORY_KEY);
          setInternalMessages([initialMessage]);
          setIsLoaded(true);
          return;
        }

        if (!Array.isArray(parsedHistory)) {
          // If stored data is not an array, reset.
          localStorage.removeItem(CHAT_HISTORY_KEY);
          setInternalMessages([initialMessage]);
          setIsLoaded(true);
          return;
        }

        const cleanHistory = parsedHistory.filter(isValidMessage);

        // If the cleaning process removed any items, update localStorage
        if (cleanHistory.length !== parsedHistory.length) {
          localStorage.setItem(
            CHAT_HISTORY_KEY,
            JSON.stringify(cleanHistory)
          );
        }

        if (cleanHistory.length > 0) {
          setInternalMessages(cleanHistory);
        } else {
          // If all messages were invalid, reset to initial.
          setInternalMessages([initialMessage]);
        }
      } else {
        setInternalMessages([initialMessage]);
      }
    } catch (error) {
      console.error('Failed to load or parse chat history, resetting.', error);
      localStorage.removeItem(CHAT_HISTORY_KEY);
      setInternalMessages([initialMessage]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    // Validate message before adding
    if (!isValidMessage(message)) {
      console.error('Attempted to add invalid message:', message);
      return;
    }

    setInternalMessages(prevMessages => {
      const newMessages = [...prevMessages, message].slice(-MAX_HISTORY_LENGTH);
      try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newMessages));
      } catch (error) {
        console.error('Failed to save chat history', error);
      }
      return newMessages;
    });
  }, []);

  const clearMessages = useCallback(() => {
    try {
      localStorage.removeItem(CHAT_HISTORY_KEY);
      setInternalMessages([initialMessage]);
    } catch (error) {
      console.error('Failed to clear chat history', error);
    }
  }, []);

  return {messages, addMessage, clearMessages, isLoaded};
}
