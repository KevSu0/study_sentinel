import { thirdPartyGate } from '@/lib/third-party/third-party-gate';

export interface OfflineResilienceOptions {
  enableRetry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
  enableQueue?: boolean;
}

export interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
  retryCount: number;
}

type StatusListener = (isOnline: boolean) => void;
type QueueListener = (queue: readonly QueuedRequest[], meta: { isRetrying: boolean }) => void;

const DEFAULT_OPTIONS: Required<OfflineResilienceOptions> = {
  enableRetry: true,
  retryDelay: 5000,
  maxRetries: 3,
  enableQueue: true,
};

const noop = () => {
  // intentional no-op
};

export function generateRequestId() {
  const randomPart = Math.random().toString(36).slice(2);
  return `req-${Date.now()}-${randomPart}`;
}

export class OfflineResilienceManager {
  private options: Required<OfflineResilienceOptions>;
  private queue: QueuedRequest[] = [];
  private retrying = false;
  private onlineFallback: boolean;
  private readonly statusListeners = new Set<StatusListener>();
  private readonly queueListeners = new Set<QueueListener>();
  private disposed = false;

  constructor(options: OfflineResilienceOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.onlineFallback = typeof navigator === 'undefined' ? true : navigator.onLine;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  configure(options: OfflineResilienceOptions = {}) {
    this.options = { ...this.options, ...options };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }

    this.statusListeners.clear();
    this.queueListeners.clear();
    this.queue = [];
  }

  getQueueSnapshot(): QueuedRequest[] {
    return this.queue.map(item => ({ ...item, options: { ...item.options } }));
  }

  isRetryingQueue() {
    return this.retrying;
  }

  getOnlineStatus() {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return this.onlineFallback;
  }

  setOnlineStatus(isOnline: boolean) {
    this.setOnline(isOnline);
    if (isOnline && this.options.enableQueue) {
      void this.processQueue();
    }
  }

  onStatusChange(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.getOnlineStatus());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  onQueueChange(listener: QueueListener) {
    this.queueListeners.add(listener);
    listener(this.getQueueSnapshot(), { isRetrying: this.retrying });
    return () => {
      this.queueListeners.delete(listener);
    };
  }

  clearQueue() {
    if (this.queue.length === 0) return;
    this.queue = [];
    this.emitQueueChange();
  }

  getQueueStatus() {
    const timestamps = this.queue.map(item => item.timestamp);
    return {
      length: this.queue.length,
      oldestRequest: timestamps.length ? Math.min(...timestamps) : null,
      newestRequest: timestamps.length ? Math.max(...timestamps) : null,
      isRetrying: this.retrying,
    } as const;
  }

  async resilientFetch(url: string, options: RequestInit = {}) {
    if (this.getOnlineStatus()) {
      try {
        if (typeof url === 'string' && /^https?:\/\//.test(url)) {
          return await thirdPartyGate.fetchRaw(url, options);
        }
        return await thirdPartyGate.fetchRaw(url, options) /* TODO: consider thirdPartyGate.fetchJson if response is JSON */;
      } catch (error) {
        if (!this.options.enableQueue) {
          throw error;
        }
        this.enqueueRequest(url, options);
        throw new Error('Request queued for retry when online');
      }
    }

    if (!this.options.enableQueue) {
      throw new Error('Device is offline');
    }

    this.enqueueRequest(url, options);
    throw new Error('Request queued for retry when online');
  }

  async processQueue() {
    if (!this.options.enableQueue || this.retrying || this.queue.length === 0) {
      return;
    }

    if (!this.getOnlineStatus()) {
      return;
    }

    this.setRetrying(true);

    for (const request of [...this.queue]) {
      if (!this.getOnlineStatus()) {
        break;
      }

      try {
        const isAbs = typeof request.url === 'string' && /^https?:\/\//.test(request.url);
        const response = await (isAbs ? thirdPartyGate.fetchRaw(request.url, request.options) : thirdPartyGate.fetchRaw(request.url, request.options) /* TODO: consider thirdPartyGate.fetchJson if response is JSON */);
        if (response.ok) {
          this.removeFromQueue(request.id);
        } else {
          this.handleFailedAttempt(request.id);
          if (this.options.retryDelay > 0) {
            await this.delay(this.options.retryDelay);
          }
        }
      } catch (error) {
        this.handleFailedAttempt(request.id);
        if (this.options.retryDelay > 0) {
          await this.delay(this.options.retryDelay);
        }
      }
    }

    this.setRetrying(false);
  }

  private handleOnline = () => {
    this.setOnline(true);
    if (this.options.enableQueue && this.queue.length > 0) {
      void this.processQueue();
    }
  };

  private handleOffline = () => {
    this.setOnline(false);
  };

  private setOnline(isOnline: boolean) {
    this.onlineFallback = isOnline;
    this.emitStatusChange();
  }

  private enqueueRequest(url: string, options: RequestInit) {
    const request: QueuedRequest = {
      id: generateRequestId(),
      url,
      options,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue = [...this.queue, request];
    this.emitQueueChange();
  }

  private removeFromQueue(id: string) {
    const originalLength = this.queue.length;
    this.queue = this.queue.filter(item => item.id !== id);
    if (this.queue.length !== originalLength) {
      this.emitQueueChange();
    }
  }

  private handleFailedAttempt(id: string) {
    if (!this.options.enableRetry) {
      this.removeFromQueue(id);
      return;
    }

    this.queue = this.queue.map(item => {
      if (item.id !== id) return item;
      return { ...item, retryCount: item.retryCount + 1 };
    });
    this.emitQueueChange();

    const current = this.queue.find(item => item.id === id);
    if (!current) return;

    if (current.retryCount > this.options.maxRetries) {
      this.removeFromQueue(id);
    }
  }

  private setRetrying(value: boolean) {
    if (this.retrying === value) return;
    this.retrying = value;
    this.emitQueueChange();
  }

  private emitStatusChange() {
    for (const listener of this.statusListeners) {
      try {
        listener(this.getOnlineStatus());
      } catch (error) {
        noop();
      }
    }
  }

  private emitQueueChange() {
    const snapshot = this.getQueueSnapshot();
    const meta = { isRetrying: this.retrying };
    for (const listener of this.queueListeners) {
      try {
        listener(snapshot, meta);
      } catch (error) {
        noop();
      }
    }
  }

  private async delay(ms: number) {
    return new Promise<void>(resolve => {
      setTimeout(resolve, ms);
    });
  }
}

let defaultManager: OfflineResilienceManager | null = null;

export function getOfflineResilienceManager(options: OfflineResilienceOptions = {}) {
  if (!defaultManager) {
    defaultManager = new OfflineResilienceManager(options);
    return defaultManager;
  }

  if (options) {
    defaultManager.configure(options);
  }

  return defaultManager;
}

export function createOfflineResilienceManager(options: OfflineResilienceOptions = {}) {
  return new OfflineResilienceManager(options);
}
