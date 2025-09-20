/**
 * Sync Quotas and Batching Configuration
 * Implements client-side quotas, batching policies, and server guardrails
 */

import { useState, useEffect, useCallback } from 'react';
import { safeApiFetch } from '@/lib/remote-api-gate';
import { remoteApiPaths } from './remote-api-paths';

export interface SyncQuotaConfig {
  // Batch size limits
  maxBatchSizeBytes: number;        // 256 KB
  maxBatchSizeEvents: number;       // 512 events
  maxBatchAgeMs: number;            // 30 seconds active, 5 minutes idle
  
  // Client quotas
  dailyQuotaBytes: number;          // 5 MB per day
  maxQueueAgeMs: number;            // 7 days retention
  maxQueueSizeEvents: number;      // 10,000 events max
  
  // Backoff configuration
  backoffInitialMs: number;         // 1 second
  backoffMultiplier: number;        // 2x
  backoffMaxMs: number;             // 2 minutes
  backoffJitterMs: number;          // Â±100ms jitter
  
  // Flush triggers
  flushOnBackground: boolean;      // Flush when app backgrounds
  flushOnIdle: boolean;             // Flush when idle
  idleThresholdMs: number;          // 30 seconds to be considered idle
}

export interface ServerQuotaConfig {
  // Write limits
  maxWriteQPS: number;              // 50 QPS soft, 100 QPS hard
  maxPayloadBytes: number;          // 256 KB max payload
  maxEventsPerRequest: number;     // 512 events max
  
  // Rate limiting
  rateLimitWindowMs: number;        // 1 minute window
  rateLimitMaxRequests: number;     // 3000 requests per minute (50 QPS)
  
  // Duplicate detection
  idempotencyWindowMs: number;      // 24 hours for duplicate detection
  maxDuplicateRate: number;         // 0.5% max duplicate rate
  
  // Storage limits
  maxStoragePerTenantBytes: number;  // 1 GB per tenant
  maxStorageGrowthPerDayBytes: number; // 100 MB growth per day
}

export interface SyncMetrics {
  // Queue metrics
  queuedCount: number;
  queuedSizeBytes: number;
  sentCount: number;
  failedCount: number;
  duplicateCount: number;
  
  // Performance metrics
  lastSuccessTimestamp: number | null;
  avgBatchSize: number;
  avgBatchLatency: number;
  currentBackoffLevel: number;
  backoffReason: string | null;
  
  // Quota metrics
  dailyBytesUsed: number;
  dailyEventsSent: number;
  quotaResetTimestamp: number;
}

export interface SyncEvent {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  metadata?: {
    deviceId?: string;
    sessionId?: string;
    version?: string;
  };
}

export class SyncQuotaManager {
  private config: SyncQuotaConfig;
  private serverConfig: ServerQuotaConfig;
  private metrics: SyncMetrics;
  private eventQueue: SyncEvent[] = [];
  private backoffTimer: number | null = null;
  private flushTimer: number | null = null;
  private lastActivityTimestamp: number;
  private isBackgrounded: boolean = false;

  constructor(config: Partial<SyncQuotaConfig> = {}) {
    this.config = {
      maxBatchSizeBytes: 256 * 1024,      // 256 KB
      maxBatchSizeEvents: 512,
      maxBatchAgeMs: 30 * 1000,           // 30 seconds
      dailyQuotaBytes: 5 * 1024 * 1024,   // 5 MB
      maxQueueAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxQueueSizeEvents: 10000,
      backoffInitialMs: 1000,
      backoffMultiplier: 2,
      backoffMaxMs: 2 * 60 * 1000,       // 2 minutes
      backoffJitterMs: 100,
      flushOnBackground: true,
      flushOnIdle: true,
      idleThresholdMs: 30 * 1000,         // 30 seconds
      ...config
    };

    this.serverConfig = {
      maxWriteQPS: 50,
      maxPayloadBytes: 256 * 1024,
      maxEventsPerRequest: 512,
      rateLimitWindowMs: 60 * 1000,
      rateLimitMaxRequests: 3000,
      idempotencyWindowMs: 24 * 60 * 60 * 1000,
      maxDuplicateRate: 0.005, // 0.5%
      maxStoragePerTenantBytes: 1024 * 1024 * 1024, // 1 GB
      maxStorageGrowthPerDayBytes: 100 * 1024 * 1024, // 100 MB
    };

    this.metrics = this.initializeMetrics();
    this.lastActivityTimestamp = Date.now();
    
    this.setupActivityTracking();
    this.loadQueuedEvents();
  }

  private initializeMetrics(): SyncMetrics {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    return {
      queuedCount: 0,
      queuedSizeBytes: 0,
      sentCount: 0,
      failedCount: 0,
      duplicateCount: 0,
      lastSuccessTimestamp: null,
      avgBatchSize: 0,
      avgBatchLatency: 0,
      currentBackoffLevel: 0,
      backoffReason: null,
      dailyBytesUsed: 0,
      dailyEventsSent: 0,
      quotaResetTimestamp: startOfDay.getTime(),
    };
  }

  private setupActivityTracking() {
    // Track user activity for idle detection
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => {
      this.lastActivityTimestamp = Date.now();
    };
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Set up idle flush timer
    setInterval(() => {
      if (this.config.flushOnIdle && this.isIdle()) {
        this.flush();
      }
    }, 5000);

    // Set up periodic flush timer
    setInterval(() => {
      if (this.shouldFlushBasedOnAge()) {
        this.flush();
      }
    }, 10000);
  }

  private isIdle(): boolean {
    return Date.now() - this.lastActivityTimestamp > this.config.idleThresholdMs;
  }

  private shouldFlushBasedOnAge(): boolean {
    if (this.eventQueue.length === 0) return false;
    
    const oldestEvent = this.eventQueue[0];
    const age = Date.now() - oldestEvent.timestamp;
    
    return age > this.config.maxBatchAgeMs;
  }

  async addEvent(event: Omit<SyncEvent, 'id' | 'timestamp'>): Promise<boolean> {
    const fullEvent: SyncEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now()
    };

    // Check quotas
    if (!this.checkQuotas(fullEvent)) {
      return false;
    }

    // Add to queue
    this.eventQueue.push(fullEvent);
    this.updateQueueMetrics();

    // Trigger immediate flush if needed
    if (this.shouldFlushImmediately()) {
      this.flush();
    }

    return true;
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkQuotas(event: SyncEvent): boolean {
    // Check daily quota
    if (this.metrics.dailyBytesUsed >= this.config.dailyQuotaBytes) {
      console.warn('Daily quota exceeded');
      return false;
    }

    // Check queue size limits
    if (this.eventQueue.length >= this.config.maxQueueSizeEvents) {
      console.warn('Queue size limit exceeded');
      return false;
    }

    // Check event age (don't queue events older than retention period)
    const oldestAllowed = Date.now() - this.config.maxQueueAgeMs;
    if (event.timestamp < oldestAllowed) {
      console.warn('Event too old to queue');
      return false;
    }

    return true;
  }

  private shouldFlushImmediately(): boolean {
    if (this.eventQueue.length === 0) return false;

    // Check batch size
    const batchSize = this.calculateBatchSize(this.eventQueue);
    if (batchSize.sizeBytes >= this.config.maxBatchSizeBytes ||
        batchSize.eventCount >= this.config.maxBatchSizeEvents) {
      return true;
    }

    return false;
  }

  private calculateBatchSize(events: SyncEvent[]): { sizeBytes: number; eventCount: number } {
    const serialized = JSON.stringify(events);
    return {
      sizeBytes: new Blob([serialized]).size,
      eventCount: events.length
    };
  }

  private updateQueueMetrics() {
    this.metrics.queuedCount = this.eventQueue.length;
    this.metrics.queuedSizeBytes = this.calculateBatchSize(this.eventQueue).sizeBytes;
    this.saveQueuedEvents();
  }

  async flush(): Promise<boolean> {
    if (this.eventQueue.length === 0) {
      return true;
    }

    if (this.backoffTimer) {
      return false; // Currently in backoff
    }

    // Prepare batch
    const batch = this.prepareBatch();
    if (!batch) {
      return false;
    }

    try {
      const startTime = Date.now();
      
      // Send to server
      const result = await this.sendToServer(batch);
      
      if (result.success) {
        // Remove sent events from queue
        this.eventQueue = this.eventQueue.filter(event => 
          !batch.events.some(sentEvent => sentEvent.id === event.id)
        );
        
        // Update metrics
        this.metrics.sentCount += batch.events.length;
        this.metrics.lastSuccessTimestamp = Date.now();
        this.metrics.avgBatchSize = 
          (this.metrics.avgBatchSize * (this.metrics.sentCount - batch.events.length) + batch.events.length) / 
          this.metrics.sentCount;
        this.metrics.avgBatchLatency = 
          (this.metrics.avgBatchLatency * (this.metrics.sentCount - batch.events.length) + (Date.now() - startTime)) / 
          this.metrics.sentCount;
        this.metrics.dailyBytesUsed += batch.sizeBytes;
        this.metrics.dailyEventsSent += batch.events.length;
        
        // Reset backoff
        this.metrics.currentBackoffLevel = 0;
        this.metrics.backoffReason = null;
        
        this.updateQueueMetrics();
        return true;
      } else {
        // Handle failure
        await this.handleFlushFailure(result.error);
        return false;
      }
    } catch (error) {
      await this.handleFlushFailure(error);
      return false;
    }
  }

  private prepareBatch(): { events: SyncEvent[]; sizeBytes: number } | null {
    let batch: SyncEvent[] = [];
    let batchSize = 0;

    for (const event of this.eventQueue) {
      const eventSize = JSON.stringify(event).length;
      
      if (batch.length >= this.config.maxBatchSizeEvents ||
          batchSize + eventSize >= this.config.maxBatchSizeBytes) {
        break;
      }
      
      batch.push(event);
      batchSize += eventSize;
    }

    if (batch.length === 0) {
      return null;
    }

    return { events: batch, sizeBytes: batchSize };
  }

  private async sendToServer(batch: { events: SyncEvent[]; sizeBytes: number }): Promise<{ success: boolean; error?: any }> {
    // Simulate server call - replace with actual implementation
    try {
      const response = await safeApiFetch(remoteApiPaths.syncUplink(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Count': batch.events.length.toString(),
          'X-Batch-Size': batch.sizeBytes.toString()
        },
        body: JSON.stringify({
          events: batch.events,
          metadata: {
            batchSize: batch.sizeBytes,
            eventCount: batch.events.length,
            timestamp: Date.now()
          }
        })
      });

      if (response.ok) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: await response.text() 
        };
      }
    } catch (error) {
      return { success: false, error };
    }
  }

  private async handleFlushFailure(error: any): Promise<void> {
    this.metrics.failedCount++;
    
    // Implement exponential backoff
    const backoffDelay = Math.min(
      this.config.backoffInitialMs * Math.pow(this.config.backoffMultiplier, this.metrics.currentBackoffLevel),
      this.config.backoffMaxMs
    );
    
    // Add jitter
    const jitter = (Math.random() - 0.5) * this.config.backoffJitterMs;
    const finalDelay = Math.max(0, backoffDelay + jitter);
    
    this.metrics.currentBackoffLevel++;
    this.metrics.backoffReason = error?.message || 'Unknown error';
    
    console.warn(`Sync flush failed, backing off for ${finalDelay}ms`, error);
    
    this.backoffTimer = window.setTimeout(() => {
      this.backoffTimer = null;
      this.flush();
    }, finalDelay);
  }

  private loadQueuedEvents(): void {
    try {
      const stored = localStorage.getItem('sync_event_queue');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.eventQueue = parsed.events || [];
        this.updateQueueMetrics();
      }
    } catch (error) {
      console.error('Failed to load queued events:', error);
    }
  }

  private saveQueuedEvents(): void {
    try {
      const data = {
        events: this.eventQueue,
        version: '1.0',
        timestamp: Date.now()
      };
      localStorage.setItem('sync_event_queue', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save queued events:', error);
    }
  }

  // Public API
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  getConfig(): SyncQuotaConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<SyncQuotaConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async clearQueue(): Promise<void> {
    this.eventQueue = [];
    this.updateQueueMetrics();
    this.saveQueuedEvents();
  }

  async forceFlush(): Promise<boolean> {
    return this.flush();
  }

  setInBackground(backgrounded: boolean): void {
    this.isBackgrounded = backgrounded;
    if (backgrounded && this.config.flushOnBackground) {
      this.flush();
    }
  }
}

// React hook for sync quota management
export function useSyncQuotas() {
  const [quotaManager] = useState(() => new SyncQuotaManager());
  const [metrics, setMetrics] = useState<SyncMetrics>(quotaManager.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(quotaManager.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [quotaManager]);

  useEffect(() => {
    // Handle app visibility changes
    const handleVisibilityChange = () => {
      quotaManager.setInBackground(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [quotaManager]);

  return {
    metrics,
    config: quotaManager.getConfig(),
    addEvent: (event: Omit<SyncEvent, 'id' | 'timestamp'>) => quotaManager.addEvent(event),
    forceFlush: () => quotaManager.forceFlush(),
    clearQueue: () => quotaManager.clearQueue(),
    updateConfig: (newConfig: Partial<SyncQuotaConfig>) => quotaManager.updateConfig(newConfig)
  };
}

