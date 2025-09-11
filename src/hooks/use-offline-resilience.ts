'use client';

import { useState, useEffect } from 'react';

interface OfflineResilienceOptions {
  enableRetry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
  enableQueue?: boolean;
}

interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
  retryCount: number;
}

export function useOfflineResilience(options: OfflineResilienceOptions = {}) {
  const {
    enableRetry = true,
    retryDelay = 5000,
    maxRetries = 3,
    enableQueue = true
  } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedRequest[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (enableQueue && queue.length > 0) {
        processQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queue, enableQueue]);

  const processQueue = async () => {
    if (!isOnline || isRetrying || queue.length === 0) return;

    setIsRetrying(true);
    
    for (const request of [...queue]) {
      try {
        const response = await fetch(request.url, request.options);
        if (response.ok) {
          setQueue(prev => prev.filter(q => q.id !== request.id));
        }
      } catch (error) {
        console.error(`Failed to process queued request ${request.id}:`, error);
        
        if (request.retryCount >= maxRetries) {
          setQueue(prev => prev.filter(q => q.id !== request.id));
        } else {
          setQueue(prev => prev.map(q => 
            q.id === request.id 
              ? { ...q, retryCount: q.retryCount + 1 }
              : q
          ));
        }
      }
    }

    setIsRetrying(false);
  };

  const resilientFetch = async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    if (isOnline) {
      try {
        return await fetch(url, options);
      } catch (error) {
        console.error('Network request failed:', error);
        
        if (enableQueue) {
          const id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const queuedRequest: QueuedRequest = {
            id,
            url,
            options,
            timestamp: Date.now(),
            retryCount: 0
          };
          
          setQueue(prev => [...prev, queuedRequest]);
          throw new Error('Request queued for retry when online');
        } else {
          throw error;
        }
      }
    } else {
      if (enableQueue) {
        const id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const queuedRequest: QueuedRequest = {
          id,
          url,
          options,
          timestamp: Date.now(),
          retryCount: 0
        };
        
        setQueue(prev => [...prev, queuedRequest]);
        throw new Error('Request queued for retry when online');
      } else {
        throw new Error('Device is offline');
      }
    }
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const getQueueStatus = () => ({
    length: queue.length,
    oldestRequest: queue.length > 0 ? Math.min(...queue.map(q => q.timestamp)) : null,
    newestRequest: queue.length > 0 ? Math.max(...queue.map(q => q.timestamp)) : null,
    isRetrying
  });

  return {
    isOnline,
    queue,
    resilientFetch,
    clearQueue,
    getQueueStatus,
    isRetrying
  };
}

// Hook for offline data persistence
export function useOfflinePersistence<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    
    try {
      const item = localStorage.getItem(`offline_${key}`);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading from localStorage:`, error);
      return initialValue;
    }
  });

  const setOfflineValue = (newValue: T | ((prev: T) => T)) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(`offline_${key}`, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error writing to localStorage:`, error);
    }
  };

  const clearOfflineValue = () => {
    try {
      setValue(initialValue);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`offline_${key}`);
      }
    } catch (error) {
      console.error(`Error clearing localStorage:`, error);
    }
  };

  return [value, setOfflineValue, clearOfflineValue] as const;
}