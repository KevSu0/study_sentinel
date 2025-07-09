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

// This is the most robust way to check for a valid message.
const isValidMessage = (msg: any): msg is ChatMessage => {
  return (
    msg &&
    typeof msg === 'object' &&
    (msg.role === 'user' || msg.role === 'model') &&
    typeof msg.content === 'string'
  );
};

export function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Use an imperative loop to build a clean history array.
        const cleanHistory: ChatMessage[] = [];
        if (Array.isArray(parsed)) {
          for (const msg of parsed) {
            if (isValidMessage(msg)) {
              cleanHistory.push(msg);
            }
          }
        }
        
        if (cleanHistory.length > 0) {
          setMessages(cleanHistory);
        } else {
          setMessages([initialMessage]);
        }
      } else {
        setMessages([initialMessage]);
      }
    } catch (error) {
      console.error('Failed to load or parse chat history, resetting.', error);
      localStorage.removeItem(CHAT_HISTORY_KEY);
      setMessages([initialMessage]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && messages.length > 0) {
      try {
        // Filter one last time before saving to ensure data integrity.
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
    if (!isValidMessage(message)) {
      console.error(
        'Attempted to add invalid message. Operation aborted.',
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
