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

const isValidMessage = (msg: any): msg is ChatMessage => {
  return (
    !!msg &&
    typeof msg === 'object' &&
    !Array.isArray(msg) &&
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
          // Use a robust reduce to filter and map simultaneously, creating a guaranteed-clean array.
          const cleanHistory = parsed.reduce((acc: ChatMessage[], msg: any) => {
            if (isValidMessage(msg)) {
              acc.push({ role: msg.role, content: msg.content });
            }
            return acc;
          }, []);

          if (cleanHistory.length > 0) {
            setInternalMessages(cleanHistory);
          } else {
            // If the saved history was entirely corrupt, start fresh.
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
        const historyToSave = messages.slice(-MAX_HISTORY_LENGTH);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyToSave));
      } catch (error) {
        console.error('Failed to save chat history', error);
      }
    }
  }, [messages, isLoaded]);

  const addMessage = useCallback((message: ChatMessage) => {
    if (!isValidMessage(message)) {
      console.error(
        'CRITICAL: Attempted to add invalid message. Operation aborted.',
        message
      );
      return;
    }
    setInternalMessages(prevMessages => {
      return [...prevMessages, message].slice(-MAX_HISTORY_LENGTH);
    });
  }, []);

  const clearMessages = useCallback(() => {
    setInternalMessages([initialMessage]);
    // Also clear from local storage immediately.
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify([initialMessage]));
  }, []);

  return {messages, addMessage, clearMessages, isLoaded};
}
