// IndexedDB v2 Storage Manager for Phase B+C
import { DBSchema, IDBPDatabase, IDBPTransaction, openDB } from 'idb';
import { generateEventId, generateSessionId, generateTaskId, generateBadgeId } from './id-generator';

// Database Schema Types
interface StudySentinelDBV2 extends DBSchema {
  events: {
    key: string;
    value: EventRecord;
    indexes: {
      by_timestamp: number;
      by_device_timestamp: [string, number];
      by_session_id: string;
      by_type_timestamp: [string, number];
      by_sync_status: [boolean, number];
    };
  };
  outbox: {
    key: string;
    value: OutboxRecord;
    indexes: {
      by_priority: [number, number];
      by_retry_count: [number, number];
    };
  };
  checkpoints: {
    key: string;
    value: CheckpointRecord;
    indexes: {
      by_device_time: [string, number];
      by_version: [number, number];
    };
  };
  rollups_day: {
    key: string;
    value: RollupRecord;
    indexes: {
      by_period_subject: ['day', string];
      by_timestamp: number;
    };
  };
  rollups_week: {
    key: string;
    value: RollupRecord;
    indexes: {
      by_period_subject: ['week', string];
      by_timestamp: number;
    };
  };
  rollups_month: {
    key: string;
    value: RollupRecord;
    indexes: {
      by_period_subject: ['month', string];
      by_timestamp: number;
    };
  };
  rollups_extended: {
    key: string;
    value: RollupRecord;
    indexes: {
      by_period_subject: ['7d' | '30d' | '90d', string];
      by_timestamp: number;
    };
  };
  settings: {
    key: string;
    value: SettingsRecord;
    indexes: {
      by_type: 'sync' | 'privacy' | 'analytics' | 'ui';
      by_device_id: string;
    };
  };
  keys: {
    key: string;
    value: KeyRecord;
    indexes: {
      by_device_id: string;
      by_type: 'encryption' | 'signing';
    };
  };
}

// Core Types
interface EventRecord {
  id: string;
  timestamp: number;
  version: number;
  type: EventType;
  deviceId: string;
  sessionId?: string;
  data: EventData;
  synced?: boolean;
  syncCheckpoint?: string;
  encrypted?: boolean;
}

interface OutboxRecord {
  id: string;
  eventId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  retryCount: number;
  lastAttempt?: number;
  error?: string;
  priority: number;
}

interface CheckpointRecord {
  id: string;
  deviceId: string;
  timestamp: number;
  lastEventId: string;
  eventCount: number;
  hash: string;
  version: number;
  metadata: {
    totalEvents: number;
    firstEventId: string;
    lastEventTimestamp: number;
  };
}

interface RollupRecord {
  id: string;
  period: 'day' | 'week' | 'month' | '7d' | '30d' | '90d';
  subject: string;
  type: 'duration' | 'count' | 'rating' | 'consistency' | 'heatmap';
  value: number;
  metadata: RollupMetadata;
  aggVersion: number;
  timestamp: number;
}

interface SettingsRecord {
  id: string;
  value: any;
  type: 'sync' | 'privacy' | 'analytics' | 'ui';
  version: number;
  timestamp: number;
  deviceId?: string;
}

interface KeyRecord {
  id: string;
  type: 'encryption' | 'signing';
  keyData: ArrayBuffer;
  keyInfo: KeyInfo;
  deviceId: string;
  active: boolean;
}

interface RollupMetadata {
  subjectCount?: number;
  sessionCount?: number;
  dateRange?: { start: number; end: number };
  additionalData?: Record<string, any>;
}

interface KeyInfo {
  algorithm: string;
  created: number;
  expires?: number;
  keySize: number;
  iv?: ArrayBuffer;
}

type EventType = 
  | 'study_session_created'
  | 'study_session_updated'
  | 'study_session_deleted'
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'task_deleted'
  | 'badge_earned'
  | 'badge_revoked'
  | 'settings_updated';

type EventData = 
  | StudyEventData
  | TaskEventData
  | BadgeEventData
  | SettingsEventData;

interface StudyEventData {
  subject: string;
  duration: number;
  startTime: number;
  endTime: number;
  notes?: string;
  rating?: number;
  tags?: string[];
  sessionId: string;
}

interface TaskEventData {
  title: string;
  description?: string;
  subject?: string;
  dueDate?: number;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  estimatedTime?: number;
  taskId: string;
}

interface BadgeEventData {
  badgeId: string;
  badgeName: string;
  criteria: string;
  earnedAt: number;
  sessionId?: string;
}

interface SettingsEventData {
  key: string;
  oldValue: any;
  newValue: any;
  category: string;
}

class StorageManagerV2 {
  private db: IDBPDatabase<StudySentinelDBV2> | null = null;
  private readonly dbName = 'StudySentinelDB';
  private readonly dbVersion = 2;
  private deviceId: string;
  private initialized = false;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.db = await openDB<StudySentinelDBV2>(this.dbName, this.dbVersion, {
        upgrade: (db, oldVersion, newVersion) => {
          this.handleDatabaseUpgrade(db, oldVersion, newVersion);
        },
        blocked: () => {
          console.warn('Database upgrade blocked by other tabs');
        },
        blocking: () => {
          console.warn('This tab is blocking database upgrade in other tabs');
        }
      });

      await this.migrateFromV1IfNeeded();
      this.initialized = true;
      console.log('Storage v2 initialized successfully');
    } catch (error) {
      console.error('Failed to initialize storage v2:', error);
      throw error;
    }
  }

  private handleDatabaseUpgrade(
    db: IDBPDatabase<StudySentinelDBV2>,
    oldVersion: number,
    newVersion: number
  ): void {
    console.log(`Upgrading database from v${oldVersion} to v${newVersion}`);

    // Create events store
    if (!db.objectStoreNames.contains('events')) {
      const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
      eventsStore.createIndex('by_timestamp', 'timestamp');
      eventsStore.createIndex('by_device_timestamp', ['deviceId', 'timestamp']);
      eventsStore.createIndex('by_session_id', 'sessionId');
      eventsStore.createIndex('by_type_timestamp', ['type', 'timestamp']);
      eventsStore.createIndex('by_sync_status', ['synced', 'timestamp']);
    }

    // Create outbox store
    if (!db.objectStoreNames.contains('outbox')) {
      const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' });
      outboxStore.createIndex('by_priority', ['priority', 'timestamp']);
      outboxStore.createIndex('by_retry_count', ['retryCount', 'timestamp']);
    }

    // Create checkpoints store
    if (!db.objectStoreNames.contains('checkpoints')) {
      const checkpointsStore = db.createObjectStore('checkpoints', { keyPath: 'id' });
      checkpointsStore.createIndex('by_device_time', ['deviceId', 'timestamp']);
      checkpointsStore.createIndex('by_version', 'version');
    }

    // Create rollup stores
    const rollupPeriods = ['day', 'week', 'month'] as const;
    rollupPeriods.forEach(period => {
      const storeName = `rollups_${period}`;
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('by_period_subject', ['period', 'subject']);
        store.createIndex('by_timestamp', 'timestamp');
      }
    });

    // Create extended rollups store
    if (!db.objectStoreNames.contains('rollups_extended')) {
      const extendedStore = db.createObjectStore('rollups_extended', { keyPath: 'id' });
      extendedStore.createIndex('by_period_subject', ['period', 'subject']);
      extendedStore.createIndex('by_timestamp', 'timestamp');
    }

    // Create settings store
    if (!db.objectStoreNames.contains('settings')) {
      const settingsStore = db.createObjectStore('settings', { keyPath: 'id' });
      settingsStore.createIndex('by_type', 'type');
      settingsStore.createIndex('by_device_id', 'deviceId');
    }

    // Create keys store
    if (!db.objectStoreNames.contains('keys')) {
      const keysStore = db.createObjectStore('keys', { keyPath: 'id' });
      keysStore.createIndex('by_device_id', 'deviceId');
      keysStore.createIndex('by_type', 'type');
    }
  }

  private async migrateFromV1IfNeeded(): Promise<void> {
    try {
      // Check if v1 database exists
      const v1Db = await indexedDB.open('StudySentinelDB', 1);
      v1Db.close();

      console.log('Found v1 database, starting migration...');
      await this.migrateFromV1();
      console.log('Migration from v1 completed successfully');
    } catch (error) {
      // v1 database doesn't exist, no migration needed
      console.log('No v1 database found, skipping migration');
    }
  }

  private async migrateFromV1(): Promise<void> {
    // This would implement the v1 to v2 migration logic
    // For now, we'll just log that it's needed
    console.warn('v1 to v2 migration not yet implemented');
  }

  // Event Management
  async addEvent(event: Omit<EventRecord, 'id' | 'timestamp' | 'version'>): Promise<string> {
    this.ensureInitialized();
    
    const eventRecord: EventRecord = {
      id: generateEventId(),
      timestamp: Date.now(),
      version: 1,
      deviceId: this.deviceId,
      ...event
    };

    await this.db!.add('events', eventRecord);
    
    // Add to outbox for sync
    await this.addToOutbox(eventRecord.id, 'create');
    
    return eventRecord.id;
  }

  async updateEvent(id: string, updates: Partial<EventRecord>): Promise<void> {
    this.ensureInitialized();
    
    const existing = await this.db!.get('events', id);
    if (!existing) {
      throw new Error(`Event with id ${id} not found`);
    }

    const updated: EventRecord = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      timestamp: Date.now()
    };

    await this.db!.put('events', updated);
    
    // Add to outbox for sync
    await this.addToOutbox(id, 'update');
  }

  async deleteEvent(id: string): Promise<void> {
    this.ensureInitialized();
    
    await this.db!.delete('events', id);
    
    // Add to outbox for sync
    await this.addToOutbox(id, 'delete');
  }

  async getEvent(id: string): Promise<EventRecord | undefined> {
    this.ensureInitialized();
    return this.db!.get('events', id);
  }

  async getEvents(filter?: EventFilter): Promise<EventRecord[]> {
    this.ensureInitialized();
    
    if (!filter) {
      return this.db!.getAll('events');
    }

    let events: EventRecord[] = [];
    
    if (filter.type) {
      events = await this.db!.getAllFromIndex('events', 'by_type_timestamp', 
        IDBKeyRange.bound([filter.type, filter.startTime || 0], [filter.type, filter.endTime || Date.now()]));
    } else if (filter.deviceId) {
      events = await this.db!.getAllFromIndex('events', 'by_device_timestamp', 
        IDBKeyRange.bound([filter.deviceId, filter.startTime || 0], [filter.deviceId, filter.endTime || Date.now()]));
    } else if (filter.startTime || filter.endTime) {
      events = await this.db!.getAllFromIndex('events', 'by_timestamp', 
        IDBKeyRange.bound(filter.startTime || 0, filter.endTime || Date.now()));
    } else {
      events = await this.db!.getAll('events');
    }

    return events;
  }

  // Outbox Management
  async addToOutbox(eventId: string, operation: 'create' | 'update' | 'delete', priority: number = 5): Promise<void> {
    this.ensureInitialized();
    
    const outboxRecord: OutboxRecord = {
      id: `outbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventId,
      operation,
      timestamp: Date.now(),
      retryCount: 0,
      priority
    };

    await this.db!.add('outbox', outboxRecord);
  }

  async getOutboxItems(filter?: OutboxFilter): Promise<OutboxRecord[]> {
    this.ensureInitialized();
    
    if (!filter) {
      return this.db!.getAll('outbox');
    }

    if (filter.priority !== undefined) {
      return this.db!.getAllFromIndex('outbox', 'by_priority', 
        IDBKeyRange.bound([filter.priority, 0], [filter.priority, Date.now()]));
    }

    if (filter.maxRetries !== undefined) {
      return this.db!.getAllFromIndex('outbox', 'by_retry_count', 
        IDBKeyRange.upperBound(filter.maxRetries));
    }

    return this.db!.getAll('outbox');
  }

  async updateOutboxItem(id: string, updates: Partial<OutboxRecord>): Promise<void> {
    this.ensureInitialized();
    await this.db!.put('outbox', { ...await this.db!.get('outbox', id), ...updates });
  }

  async deleteOutboxItem(id: string): Promise<void> {
    this.ensureInitialized();
    await this.db!.delete('outbox', id);
  }

  // Checkpoint Management
  async createCheckpoint(): Promise<CheckpointRecord> {
    this.ensureInitialized();
    
    const lastEvent = await this.db!.getAllFromIndex('events', 'by_timestamp', null, 1);
    const lastEventId = lastEvent[0]?.id || '';
    const eventCount = await this.db!.count('events');
    
    const checkpoint: CheckpointRecord = {
      id: `checkpoint-${Date.now()}-${this.deviceId}`,
      deviceId: this.deviceId,
      timestamp: Date.now(),
      lastEventId,
      eventCount,
      hash: await this.computeEventsHash(),
      version: 2,
      metadata: {
        totalEvents: eventCount,
        firstEventId: lastEventId,
        lastEventTimestamp: lastEvent[0]?.timestamp || 0
      }
    };

    await this.db!.add('checkpoints', checkpoint);
    return checkpoint;
  }

  async getLastCheckpoint(deviceId?: string): Promise<CheckpointRecord | undefined> {
    this.ensureInitialized();
    
    const targetDeviceId = deviceId || this.deviceId;
    const checkpoints = await this.db!.getAllFromIndex('checkpoints', 'by_device_time', 
      IDBKeyRange.bound([targetDeviceId, 0], [targetDeviceId, Date.now()]), 1);
    
    return checkpoints[0];
  }

  async getEventsSinceCheckpoint(checkpointId: string): Promise<EventRecord[]> {
    this.ensureInitialized();
    
    const checkpoint = await this.db!.get('checkpoints', checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    // This is a simplified implementation - in practice, you'd need to track which events
    // are associated with each checkpoint more precisely
    return this.db!.getAllFromIndex('events', 'by_timestamp', 
      IDBKeyRange.lowerBound(checkpoint.timestamp));
  }

  // Rollup Management
  async saveRollup(rollup: Omit<RollupRecord, 'id' | 'timestamp'>): Promise<void> {
    this.ensureInitialized();
    
    const rollupRecord: RollupRecord = {
      ...rollup,
      id: `rollup-${rollup.period}-${rollup.subject}-${rollup.type}-${Date.now()}`,
      timestamp: Date.now()
    };

    const storeName = rollup.period === '7d' || rollup.period === '30d' || rollup.period === '90d' 
      ? 'rollups_extended' 
      : `rollups_${rollup.period}`;

    await this.db!.put(storeName, rollupRecord);
  }

  async getRollups(period: string, subject?: string): Promise<RollupRecord[]> {
    this.ensureInitialized();
    
    const storeName = period === '7d' || period === '30d' || period === '90d' 
      ? 'rollups_extended' 
      : `rollups_${period}`;

    if (subject) {
      return this.db!.getAllFromIndex(storeName, 'by_period_subject', 
        IDBKeyRange.only([period, subject]));
    }

    return this.db!.getAll(storeName);
  }

  // Settings Management
  async saveSetting(key: string, value: any, type: SettingsRecord['type']): Promise<void> {
    this.ensureInitialized();
    
    const setting: SettingsRecord = {
      id: `setting-${key}-${this.deviceId}`,
      value,
      type,
      version: 1,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };

    await this.db!.put('settings', setting);
  }

  async getSetting(key: string): Promise<SettingsRecord | undefined> {
    this.ensureInitialized();
    return this.db!.get('settings', `setting-${key}-${this.deviceId}`);
  }

  async getAllSettings(type?: SettingsRecord['type']): Promise<SettingsRecord[]> {
    this.ensureInitialized();
    
    if (type) {
      return this.db!.getAllFromIndex('settings', 'by_type', type);
    }

    return this.db!.getAll('settings');
  }

  // Utility Methods
  private async computeEventsHash(): Promise<string> {
    // Simple hash implementation - in production, use a proper hash function
    const events = await this.db!.getAll('events');
    const eventIds = events.map(e => e.id).sort();
    const combined = eventIds.join('|');
    
    // Simple hash function for demonstration
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('Storage v2 not initialized');
    }
  }

  // Database Statistics
  async getDatabaseStats(): Promise<DatabaseStats> {
    this.ensureInitialized();
    
    const stats: DatabaseStats = {
      version: 2,
      eventCount: await this.db!.count('events'),
      outboxCount: await this.db!.count('outbox'),
      checkpointCount: await this.db!.count('checkpoints'),
      rollupCounts: {},
      settingsCount: await this.db!.count('settings'),
      keyCount: await this.db!.count('keys'),
      lastEventTimestamp: 0,
      oldestEventTimestamp: Date.now()
    };

    // Get rollup counts
    const rollupStores = ['rollups_day', 'rollups_week', 'rollups_month', 'rollups_extended'];
    for (const store of rollupStores) {
      if (this.db!.objectStoreNames.contains(store)) {
        stats.rollupCounts[store] = await this.db!.count(store as any);
      }
    }

    // Get timestamp range
    const timestamps = await this.db!.getAllFromIndex('events', 'by_timestamp', null, 2);
    if (timestamps.length > 0) {
      stats.oldestEventTimestamp = timestamps[0].timestamp;
      stats.lastEventTimestamp = timestamps[timestamps.length - 1].timestamp;
    }

    return stats;
  }

  // Cleanup and Maintenance
  async cleanupOldEvents(olderThanDays: number = 365): Promise<number> {
    this.ensureInitialized();
    
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const oldEvents = await this.db!.getAllFromIndex('events', 'by_timestamp', 
      IDBKeyRange.upperBound(cutoffTime));
    
    let deletedCount = 0;
    const tx = this.db!.transaction('events', 'readwrite');
    
    for (const event of oldEvents) {
      await tx.store.delete(event.id);
      deletedCount++;
    }
    
    await tx.done;
    return deletedCount;
  }

  async cleanupOldCheckpoints(keepCount: number = 10): Promise<number> {
    this.ensureInitialized();
    
    const allCheckpoints = await this.db!.getAllFromIndex('checkpoints', 'by_device_time', 
      IDBKeyRange.bound([this.deviceId, 0], [this.deviceId, Date.now()]));
    
    const toDelete = allCheckpoints.slice(0, Math.max(0, allCheckpoints.length - keepCount));
    let deletedCount = 0;
    
    const tx = this.db!.transaction('checkpoints', 'readwrite');
    for (const checkpoint of toDelete) {
      await tx.store.delete(checkpoint.id);
      deletedCount++;
    }
    
    await tx.done;
    return deletedCount;
  }

  // Export/Import Support
  async exportData(): Promise<ExportData> {
    this.ensureInitialized();
    
    const exportData: ExportData = {
      version: 2,
      exportedAt: Date.now(),
      deviceId: this.deviceId,
      events: await this.db!.getAll('events'),
      settings: await this.db!.getAll('settings'),
      rollups: {
        day: await this.db!.getAll('rollups_day'),
        week: await this.db!.getAll('rollups_week'),
        month: await this.db!.getAll('rollups_month'),
        extended: await this.db!.getAll('rollups_extended')
      },
      checkpoints: await this.db!.getAll('checkpoints'),
      checksum: ''
    };

    // Compute checksum
    const dataString = JSON.stringify(exportData);
    exportData.checksum = await this.computeChecksum(dataString);
    
    return exportData;
  }

  async importData(data: ExportData, merge: boolean = false): Promise<void> {
    this.ensureInitialized();
    
    // Validate checksum
    const dataWithoutChecksum = { ...data, checksum: '' };
    const dataString = JSON.stringify(dataWithoutChecksum);
    const computedChecksum = await this.computeChecksum(dataString);
    
    if (computedChecksum !== data.checksum) {
      throw new Error('Data integrity check failed');
    }

    // Validate version compatibility
    if (data.version !== 2) {
      throw new Error('Unsupported data version');
    }

    // Import data
    const tx = this.db!.transaction(['events', 'settings', 'rollups_day', 'rollups_week', 'rollups_month', 'rollups_extended', 'checkpoints'], 'readwrite');

    if (!merge) {
      // Clear existing data
      await tx.objectStore('events').clear();
      await tx.objectStore('settings').clear();
      await tx.objectStore('rollups_day').clear();
      await tx.objectStore('rollups_week').clear();
      await tx.objectStore('rollups_month').clear();
      await tx.objectStore('rollups_extended').clear();
      await tx.objectStore('checkpoints').clear();
    }

    // Import new data
    for (const event of data.events) {
      await tx.objectStore('events').add(event);
    }

    for (const setting of data.settings) {
      await tx.objectStore('settings').add(setting);
    }

    for (const rollup of data.rollups.day) {
      await tx.objectStore('rollups_day').add(rollup);
    }

    for (const rollup of data.rollups.week) {
      await tx.objectStore('rollups_week').add(rollup);
    }

    for (const rollup of data.rollups.month) {
      await tx.objectStore('rollups_month').add(rollup);
    }

    for (const rollup of data.rollups.extended) {
      await tx.objectStore('rollups_extended').add(rollup);
    }

    for (const checkpoint of data.checkpoints) {
      await tx.objectStore('checkpoints').add(checkpoint);
    }

    await tx.done;
  }

  private async computeChecksum(data: string): Promise<string> {
    // Simple checksum implementation - use proper crypto in production
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// Support Types
interface EventFilter {
  type?: EventType;
  deviceId?: string;
  startTime?: number;
  endTime?: number;
}

interface OutboxFilter {
  priority?: number;
  maxRetries?: number;
}

interface DatabaseStats {
  version: number;
  eventCount: number;
  outboxCount: number;
  checkpointCount: number;
  rollupCounts: Record<string, number>;
  settingsCount: number;
  keyCount: number;
  lastEventTimestamp: number;
  oldestEventTimestamp: number;
}

interface ExportData {
  version: number;
  exportedAt: number;
  deviceId: string;
  events: EventRecord[];
  settings: SettingsRecord[];
  rollups: {
    day: RollupRecord[];
    week: RollupRecord[];
    month: RollupRecord[];
    extended: RollupRecord[];
  };
  checkpoints: CheckpointRecord[];
  checksum: string;
}

export { StorageManagerV2, type StudySentinelDBV2 };
export type {
  EventRecord,
  OutboxRecord,
  CheckpointRecord,
  RollupRecord,
  SettingsRecord,
  KeyRecord,
  EventType,
  EventData,
  StudyEventData,
  TaskEventData,
  BadgeEventData,
  SettingsEventData
};