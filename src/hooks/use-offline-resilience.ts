'use client';

import { useEffect, useState } from 'react';
import {
  getOfflineResilienceManager,
  type OfflineResilienceOptions,
  type QueuedRequest,
} from '@/lib/offline-resilience-manager';

export type { OfflineResilienceOptions, QueuedRequest } from '@/lib/offline-resilience-manager';

type QueueState = {
  queue: readonly QueuedRequest[];
  isRetrying: boolean;
};

export function useOfflineResilience(options: OfflineResilienceOptions = {}) {
  const { enableQueue, enableRetry, retryDelay, maxRetries } = options;

  const manager = getOfflineResilienceManager(options);

  const [isOnline, setIsOnline] = useState<boolean>(manager.getOnlineStatus());
  const [queueState, setQueueState] = useState<QueueState>(() => ({
    queue: manager.getQueueSnapshot(),
    isRetrying: manager.isRetryingQueue(),
  }));

  useEffect(() => {
    manager.configure({
      enableQueue,
      enableRetry,
      retryDelay,
      maxRetries,
    });
  }, [manager, enableQueue, enableRetry, retryDelay, maxRetries]);

  useEffect(() => {
    const unsubscribeStatus = manager.onStatusChange(setIsOnline);
    const unsubscribeQueue = manager.onQueueChange((queue, meta) => {
      setQueueState({ queue, isRetrying: meta.isRetrying });
    });

    return () => {
      unsubscribeStatus();
      unsubscribeQueue();
    };
  }, [manager]);

  return {
    isOnline,
    queue: queueState.queue,
    resilientFetch: (url: string, init: RequestInit = {}) =>
      manager.resilientFetch(url, init),
    clearQueue: () => manager.clearQueue(),
    getQueueStatus: () => manager.getQueueStatus(),
    isRetrying: queueState.isRetrying,
  };
}





