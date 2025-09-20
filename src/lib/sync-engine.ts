import { remoteApiPaths } from '@/lib/remote-api-paths';
import { thirdPartyGate } from '@/lib/third-party/third-party-gate';
import { db, OutboxEvent, SyncCheckpoint, AppEvent, TaskEvent } from './database';
import { getDeviceId } from './event-sourcing';

// Sync engine implementation
export class SyncEngine {
  private deviceId: string;
  private isOnline: boolean;
  private syncInProgress: boolean;
  private retryInterval: number = 5000; // 5 seconds
  private maxRetries: number = 3;
  private baseUrl: string;
  private syncInterval?: NodeJS.Timeout;

  constructor(baseUrl: string = remoteApiPaths.syncBase()) {
    this.deviceId = getDeviceId();
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.baseUrl = baseUrl;
    
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.startPeriodicSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.stopPeriodicSync();
    });

    // Start periodic sync if online
    if (this.isOnline) {
      this.startPeriodicSync();
    }
  }

  // Start periodic sync when online
  private startPeriodicSync(): void {
    this.stopPeriodicSync(); // Clear any existing interval
    
    this.syncInterval = setInterval(async () => {
      await this.sync();
    }, 30000); // Sync every 30 seconds
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  // Main sync method
  async sync(): Promise<SyncResult> {
    if (!this.isOnline || this.syncInProgress) {
      return { success: false, error: 'Offline or sync in progress' };
    }

    this.syncInProgress = true;
    
    try {
      // Get current checkpoint
      const checkpoint = await this.getCurrentCheckpoint();
      
      // Upload pending events (uplink)
      const uploadResult = await this.uploadPendingEvents();
      
      if (!uploadResult.success) {
        return uploadResult;
      }

      // Download new events (downlink)
      const downloadResult = await this.downloadNewEvents(checkpoint);
      
      if (!downloadResult.success) {
        return downloadResult;
      }

      // Update checkpoint on successful sync
      if (uploadResult.uploadedCount > 0 || (downloadResult.downloadedCount || 0) > 0) {
        const lastEventId = downloadResult.lastEventId || checkpoint?.lastSyncedEventId;
        if (lastEventId) {
          await this.updateCheckpoint(lastEventId);
        }
      }

      return {
        success: true,
        uploadedCount: uploadResult.uploadedCount,
        downloadedCount: downloadResult.downloadedCount
      };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Upload pending events to server
  private async uploadPendingEvents(): Promise<UploadResult> {
    const pendingEvents = await db.outbox
      .where('status')
      .equals('pending')
      .toArray();

    if (pendingEvents.length === 0) {
      return { success: true, uploadedCount: 0 };
    }

    let uploadedCount = 0;
    let failedEvents: string[] = [];

    for (const event of pendingEvents) {
      try {
        const response = await thirdPartyGate.fetchRaw(`${this.baseUrl}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-ID': this.deviceId
          },
          body: JSON.stringify({
            eventId: event.eventId,
            eventType: event.eventType,
            payload: event.payload,
            timestamp: event.createdAt
          })
        });

        if (response.ok) {
          await db.outbox.update(event.id, { status: 'completed' });
          uploadedCount++;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Failed to upload event ${event.eventId}:`, error);
        
        // Update retry count and status
        const retryCount = event.retryCount + 1;
        if (retryCount >= this.maxRetries) {
          await db.outbox.update(event.id, { 
            status: 'failed',
            retryCount,
            lastAttempt: Date.now()
          });
          failedEvents.push(event.eventId);
        } else {
          await db.outbox.update(event.id, { 
            retryCount,
            lastAttempt: Date.now()
          });
        }
      }
    }

    return {
      success: failedEvents.length === 0,
      uploadedCount,
      failedEvents
    };
  }

  // Download new events from server
  private async downloadNewEvents(checkpoint: SyncCheckpoint | null): Promise<DownloadResult> {
    const lastSyncedEventId = checkpoint?.lastSyncedEventId || null;
    
    try {
      const response = await thirdPartyGate.fetchRaw(`${this.baseUrl}/download?lastEventId=${lastSyncedEventId || ''}`, {
        method: 'GET',
        headers: {
          'X-Device-ID': this.deviceId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const events = await response.json();
      
      if (events.length === 0) {
        return { success: true, downloadedCount: 0 };
      }

      // Process downloaded events
      let downloadedCount = 0;
      let lastEventId: string | null = null;

      for (const event of events) {
        try {
          await this.processDownloadedEvent(event);
          downloadedCount++;
          lastEventId = event.id;
        } catch (error) {
          console.error(`Failed to process downloaded event ${event.id}:`, error);
        }
      }

      return {
        success: true,
        downloadedCount,
        lastEventId
      };
    } catch (error) {
      console.error('Download failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Process downloaded event with conflict resolution
  private async processDownloadedEvent(event: any): Promise<void> {
    const existingEvent = await db.events.get(event.id);

    if (!existingEvent) {
      // New event, just add it
      await db.events.add(event);
      return;
    }

    // Conflict resolution
    if (event.deviceId === this.deviceId) {
      // This is our own event, skip
      return;
    }

    // Conflict with event from another device
    await this.resolveConflict(existingEvent, event);
  }

  // Conflict resolution strategies
  private async resolveConflict(localEvent: AppEvent, remoteEvent: AppEvent): Promise<void> {
    switch (localEvent.type) {
      case 'study_session_updated':
      case 'task_updated':
        // Last-writer-wins based on timestamp
        if (remoteEvent.timestamp > localEvent.timestamp) {
          await db.events.put(remoteEvent);
        }
        break;
      
      case 'study_session_created':
      case 'task_created':
        // For created events, if IDs conflict, keep the one with earlier timestamp
        if (remoteEvent.timestamp < localEvent.timestamp) {
          await db.events.put(remoteEvent);
        }
        break;
      
      case 'task_completed':
        // Task completion - merge by taking the latest completion time
        const localTask = localEvent as TaskEvent;
        const remoteTask = remoteEvent as TaskEvent;
        
        if (remoteTask.timestamp > localTask.timestamp) {
          await db.events.put(remoteEvent);
        }
        break;
      
      default:
        // For other events, keep the local version
        break;
    }
  }

  // Checkpoint management
  private async getCurrentCheckpoint(): Promise<SyncCheckpoint | null> {
    const checkpoint = await db.checkpoints
      .where('deviceId')
      .equals(this.deviceId)
      .first();
    return checkpoint || null;
  }

  private async updateCheckpoint(lastEventId: string): Promise<void> {
    const checkpoint: SyncCheckpoint = {
      id: `checkpoint_${this.deviceId}`,
      deviceId: this.deviceId,
      lastSyncedEventId: lastEventId,
      lastSyncedAt: Date.now()
    };

    await db.checkpoints.put(checkpoint);
  }

  // Public methods
  async forceSync(): Promise<SyncResult> {
    return await this.sync();
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const pendingEvents = await db.outbox
      .where('status')
      .equals('pending')
      .count();
    
    const failedEvents = await db.outbox
      .where('status')
      .equals('failed')
      .count();
    
    const checkpoint = await this.getCurrentCheckpoint();
    const lastSync = checkpoint?.lastSyncedAt || null;

    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingEvents,
      failedEvents,
      lastSync
    };
  }

  async clearFailedEvents(): Promise<number> {
    const failedCount = await db.outbox
      .where('status')
      .equals('failed')
      .count();
    
    await db.outbox
      .where('status')
      .equals('failed')
      .delete();
    
    return failedCount;
  }

  async retryFailedEvents(): Promise<number> {
    const failedEvents = await db.outbox
      .where('status')
      .equals('failed')
      .toArray();
    
    for (const event of failedEvents) {
      await db.outbox.update(event.id, { 
        status: 'pending',
        retryCount: 0,
        lastAttempt: undefined
      });
    }

    return failedEvents.length;
  }

  // Export/Import functionality
  async exportData(): Promise<ExportData> {
    const events = await db.events.toArray();
    const settings = await db.getSettings();
    const checkpoint = await this.getCurrentCheckpoint();

    return {
      version: '1.0',
      exportedAt: Date.now(),
      deviceId: this.deviceId,
      events,
      settings,
      checkpoint
    };
  }

  async importData(data: ExportData): Promise<ImportResult> {
    try {
      // Validate data
      if (!this.validateExportData(data)) {
        return { success: false, error: 'Invalid export data' };
      }

      // Import events
      for (const event of data.events) {
        const existing = await db.events.get(event.id);
        if (!existing) {
          await db.events.add(event);
        }
      }

      // Import settings if present
      if (data.settings) {
        await db.settings.put(data.settings);
      }

      return {
        success: true,
        importedEvents: data.events.length,
        importedSettings: data.settings ? 1 : 0
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private validateExportData(data: any): data is ExportData {
    return (
      data &&
      data.version &&
      data.exportedAt &&
      data.deviceId &&
      Array.isArray(data.events)
    );
  }

  // Cleanup
  destroy(): void {
    this.stopPeriodicSync();
  }
}

// Type definitions
export interface SyncResult {
  success: boolean;
  uploadedCount?: number;
  downloadedCount?: number;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  uploadedCount: number;
  failedEvents?: string[];
}

export interface DownloadResult {
  success: boolean;
  downloadedCount?: number;
  lastEventId?: string | null;
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  syncInProgress: boolean;
  pendingEvents: number;
  failedEvents: number;
  lastSync: number | null;
}

export interface ExportData {
  version: string;
  exportedAt: number;
  deviceId: string;
  events: AppEvent[];
  settings?: any;
  checkpoint?: SyncCheckpoint | null;
}

export interface ImportResult {
  success: boolean;
  importedEvents?: number;
  importedSettings?: number;
  error?: string;
}

// Global sync engine instance
let syncEngine: SyncEngine | null = null;

// Initialize sync engine
export function initializeSyncEngine(baseUrl?: string): SyncEngine {
  if (!syncEngine) {
    syncEngine = new SyncEngine(baseUrl);
  }
  return syncEngine;
}

// Get sync engine instance
export function getSyncEngine(): SyncEngine | null {
  return syncEngine;
}