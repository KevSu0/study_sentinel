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
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Use filter with a type guard to create a guaranteed-clean history array.
        if (Array.isArray(parsed)) {
          const cleanHistory = parsed.filter(isValidMessage);
          setMessages(cleanHistory.length > 0 ? cleanHistory : [initialMessage]);
        } else {
          // If the stored value is not an array, reset to the initial state.
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
    if (isLoaded) {
      try {
        // Filter one last time before saving to ensure data integrity.
        const historyToSave = messages
          .filter(isValidMessage)
          .slice(-MAX_HISTORY_LENGTH);
        
        // Only save if there's something valid to save, otherwise reset to initial.
        if (historyToSave.length > 0) {
           localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyToSave));
        } else {
           localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify([initialMessage]));
        }
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
