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

// Simplified and direct validation function
const isValidMessage = (msg: any): msg is ChatMessage => {
  return (
    msg &&
    typeof msg === 'object' &&
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
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          // Filter the parsed array to ensure all messages are valid
          const cleanHistory = parsed.filter(isValidMessage);

          if (cleanHistory.length > 0) {
            setInternalMessages(cleanHistory);
          } else {
            // If saved history was entirely corrupt, start fresh
            setInternalMessages([initialMessage]);
          }
        } else {
          // If saved data is not an array, it's corrupt. Start fresh.
          setInternalMessages([initialMessage]);
        }
      } else {
        // No history found, start fresh.
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

  useEffect(() => {
    if (isLoaded) {
      try {
        // Ensure we only save valid messages
        const historyToSave = messages
          .filter(isValidMessage)
          .slice(-MAX_HISTORY_LENGTH);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyToSave));
      } catch (error) {
        console.error('Failed to save chat history', error);
      }
    }
  }, [messages, isLoaded]);

  const addMessage = useCallback((message: ChatMessage) => {
    // Validate the message before adding it to state
    if (!isValidMessage(message)) {
      console.error(
        'Attempted to add invalid message. Operation aborted.',
        message
      );
      return;
    }
    setInternalMessages(prevMessages => {
      // Double-check previous messages just in case, before adding the new one
      const cleanPrevMessages = prevMessages.filter(isValidMessage);
      return [...cleanPrevMessages, message].slice(-MAX_HISTORY_LENGTH);
    });
  }, []);

  const clearMessages = useCallback(() => {
    setInternalMessages([initialMessage]);
    // Also clear from local storage immediately.
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify([initialMessage]));
  }, []);

  return {messages, addMessage, clearMessages, isLoaded};
}
