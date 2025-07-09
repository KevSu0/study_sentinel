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

// A validation function to ensure a message is in the correct format
const isValidMessage = (msg: any): msg is ChatMessage => {
    return msg && typeof msg.role === 'string' && typeof msg.content === 'string';
};


export function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
          // Robustly filter for valid message objects to prevent crashes
          const cleanHistory = parsedHistory.filter(isValidMessage);

          if (cleanHistory.length > 0) {
            setMessages(cleanHistory);
          } else {
            // If filtering removed everything, start fresh
            setMessages([initialMessage]);
          }
        } else {
          setMessages([initialMessage]);
        }
      } else {
        setMessages([initialMessage]);
      }
    } catch (error) {
      console.error('Failed to load or parse chat history, resetting.', error);
      // If parsing fails, clear the corrupted data to prevent app crashes
      localStorage.removeItem(CHAT_HISTORY_KEY);
      setMessages([initialMessage]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const addMessage = useCallback((newMessage: ChatMessage) => {
    // Aggressive validation guard: Do not allow invalid messages into the state.
    if (!isValidMessage(newMessage)) {
        console.error("useChatHistory: Attempted to add invalid message. The message was discarded.", newMessage);
        return;
    }

    setMessages(prevMessages => {
      let updatedMessages = [...prevMessages, newMessage];

      // Trim to max length, always keeping the first initial message
      if (updatedMessages.length > MAX_HISTORY_LENGTH) {
        const welcomeMessage = updatedMessages[0];
        const chat = updatedMessages.slice(1);
        const trimmedChat = chat.slice(
          chat.length - (MAX_HISTORY_LENGTH - 1)
        );
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
