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
        const parsedHistory = JSON.parse(savedHistory);

        const cleanHistory = Array.isArray(parsedHistory)
          ? parsedHistory.filter(isValidMessage)
          : [];

        if (cleanHistory.length > 0) {
          setInternalMessages(cleanHistory);
        } else {
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

  const setMessages = useCallback((newMessages: ChatMessage[]) => {
    // Trim to max length
    const updatedMessages = newMessages.slice(-MAX_HISTORY_LENGTH);

    setInternalMessages(updatedMessages);
    try {
      localStorage.setItem(
        CHAT_HISTORY_KEY,
        JSON.stringify(updatedMessages)
      );
    } catch (error) {
      console.error('Failed to save chat history', error);
    }
  }, []);

  return {messages, setMessages, isLoaded};
}
