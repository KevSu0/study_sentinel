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
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
    return false;
  }
  if (
    typeof msg.role !== 'string' ||
    (msg.role !== 'user' && msg.role !== 'model')
  ) {
    return false;
  }
  if (typeof msg.content !== 'string') {
    return false;
  }
  return true;
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
          localStorage.removeItem(CHAT_HISTORY_KEY);
          setInternalMessages([initialMessage]);
          setIsLoaded(true);
          return;
        }

        if (Array.isArray(parsedHistory)) {
          // Explicitly build a new, guaranteed-clean array.
          const validatedHistory: ChatMessage[] = [];
          for (const msg of parsedHistory) {
            if (isValidMessage(msg)) {
              validatedHistory.push(msg);
            }
          }

          if (validatedHistory.length !== parsedHistory.length) {
            // If anything was cleaned, update localStorage immediately with the clean version.
            localStorage.setItem(
              CHAT_HISTORY_KEY,
              JSON.stringify(validatedHistory)
            );
          }

          setInternalMessages(
            validatedHistory.length > 0 ? validatedHistory : [initialMessage]
          );
        } else {
          // If stored data is not an array, reset.
          localStorage.removeItem(CHAT_HISTORY_KEY);
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
    // Re-validate here to be absolutely sure we're not adding bad data.
    if (!isValidMessage(message)) {
      console.error(
        'CRITICAL: Attempted to add invalid message. Operation aborted.',
        message
      );
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
