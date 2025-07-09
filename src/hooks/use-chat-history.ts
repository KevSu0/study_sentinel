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

// A simple, direct validation function.
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

  // This effect runs only once on component mount to load and clean data from localStorage.
  useEffect(() => {
    let loadedMessages: ChatMessage[] = [initialMessage];
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          // Filter the array aggressively, keeping only valid messages.
          const cleanHistory = parsedHistory.filter(isValidMessage);
          if (cleanHistory.length > 0) {
            loadedMessages = cleanHistory;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load or parse chat history, resetting.', error);
      // Ensure we start fresh if parsing fails.
      loadedMessages = [initialMessage];
    }
    setInternalMessages(loadedMessages);
    setIsLoaded(true);
  }, []);

  // This effect runs whenever messages change to save the clean state back to localStorage.
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
    // Re-validate here to be absolutely sure we're not adding bad data.
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
  }, []);

  return {messages, addMessage, clearMessages, isLoaded};
}
