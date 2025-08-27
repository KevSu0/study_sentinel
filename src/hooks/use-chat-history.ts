'use client';

import {useState, useEffect, useCallback} from 'react';

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

const CHAT_HISTORY_KEY = 'studySentinelChatHistory_v1';
const MAX_HISTORY_LENGTH = 50;

const getInitialMessage = (): ChatMessage => ({
  role: 'model',
  content:
    "Hello! I'm your personal motivation coach. How can I help you on your journey today?",
});

// This is a robust type guard to check for a valid message.
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
    setIsLoaded(false);
    let loadedMessages: ChatMessage[] = [];
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const msg of parsed) {
            if (isValidMessage(msg)) {
              loadedMessages.push(msg);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load or parse chat history, resetting.', error);
      localStorage.removeItem(CHAT_HISTORY_KEY);
    }
    setMessages(loadedMessages.length > 0 ? loadedMessages : [getInitialMessage()]);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        const historyToSave = messages
          .filter(isValidMessage)
          .slice(-MAX_HISTORY_LENGTH);

        if (historyToSave.length > 0) {
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyToSave));
        } else {
          // If all messages are cleared, reset to the initial message.
          localStorage.setItem(
            CHAT_HISTORY_KEY,
            JSON.stringify([getInitialMessage()])
          );
        }
      } catch (error) {
        console.error('Failed to save chat history', error);
      }
    }
  }, [messages, isLoaded]);

  const addMessage = useCallback((message: ChatMessage) => {
    if (!isValidMessage(message)) {
      console.error(
        'Attempted to add an invalid message to the chat history. Operation aborted.',
        message
      );
      return;
    }
    setMessages(prevMessages =>
      [...prevMessages, message].slice(-MAX_HISTORY_LENGTH)
    );
  }, []);

  const updateLastMessage = useCallback((contentChunk: string) => {
    setMessages(prevMessages => {
        if(prevMessages.length === 0) return prevMessages;
        const newMessages = [...prevMessages];
        const lastMessage = newMessages[newMessages.length - 1];
        if(lastMessage.role === 'model'){
            lastMessage.content += contentChunk;
        }
        return newMessages;
    })
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([getInitialMessage()]);
  }, []);

  return {messages, addMessage, updateLastMessage, clearMessages, isLoaded};
}
