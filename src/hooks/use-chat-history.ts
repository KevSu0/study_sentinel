'use client';

import {useState, useEffect, useCallback} from 'react';

const CHAT_HISTORY_KEY = 'studySentinelChatHistory';
const MAX_HISTORY_LENGTH = 50;

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

const initialMessage: ChatMessage = {
  role: 'model',
  content:
    "Hello! I'm your personal motivation coach. How can I help you on your journey today?",
};

export function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory && JSON.parse(savedHistory).length > 0) {
        setMessages(JSON.parse(savedHistory));
      } else {
        setMessages([initialMessage]);
      }
    } catch (error) {
      console.error('Failed to load chat history', error);
      setMessages([initialMessage]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const addMessage = useCallback((newMessage: ChatMessage) => {
    setMessages(prevMessages => {
      let updatedMessages = [...prevMessages, newMessage];

      // Trim to max length, always keeping the first initial message
      if (updatedMessages.length > MAX_HISTORY_LENGTH) {
        const welcomeMessage = updatedMessages[0];
        const chat = updatedMessages.slice(1);
        const trimmedChat = chat.slice(chat.length - (MAX_HISTORY_LENGTH - 1));
        updatedMessages = [welcomeMessage, ...trimmedChat];
      }

      try {
        localStorage.setItem(
          CHAT_HISTORY_KEY,
          JSON.stringify(updatedMessages)
        );
      } catch (error) {
        console.error('Failed to save chat history', error);
      }

      return updatedMessages;
    });
  }, []);

  return {messages, addMessage, isLoaded};
}
