import Dexie, { Table } from 'dexie';

// Event types for the event sourcing system
export interface BaseEvent {
  id: string;
  type: string;
  deviceId: string;
  timestamp: number;
  version: number;
  sessionId?: string;
}

export interface StudySessionEvent extends BaseEvent {
  type: 'study_session_created' | 'study_session_updated' | 'study_session_deleted';
  data: {
    subject: string;
    duration: number;
    startTime: number;
    endTime: number;
    notes?: string;
    rating?: number;
    tags?: string[];
  };
}

export interface TaskEvent extends BaseEvent {
  type: 'task_created' | 'task_updated' | 'task_completed' | 'task_deleted';
  data: {
    title: string;
    description?: string;
    subject?: string;
    dueDate?: number;
    priority: 'low' | 'medium' | 'high';
    completed: boolean;
    estimatedTime?: number;
  };
}

export interface BadgeEvent extends BaseEvent {
  type: 'badge_earned' | 'badge_revoked';
  data: {
    badgeId: string;
    badgeName: string;
    criteria: string;
    earnedAt: number;
  };
}

export interface SettingsEvent extends BaseEvent {
  type: 'settings_updated';
  data: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    syncEnabled: boolean;
    studyReminders: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
}

export type AppEvent = StudySessionEvent | TaskEvent | BadgeEvent | SettingsEvent;

// Roll-up interfaces for analytics
export interface DailyRollup {
  date: string; // YYYY-MM-DD
  totalStudyTime: number;
  sessionCount: number;
  completedTasks: number;
  subjectBreakdown: Record<string, number>;
  averageRating: number;
  streakDays: number;
  consistencyScore: number;
}

export interface WeeklyRollup {
  weekStart: string; // YYYY-MM-DD
  totalStudyTime: number;
  sessionCount: number;
  completedTasks: number;
  subjectBreakdown: Record<string, number>;
  averageSessionLength: number;
  bestStreak: number;
  consistencyScore: number;
}

export interface MonthlyRollup {
  month: string; // YYYY-MM
  totalStudyTime: number;
  sessionCount: number;
  completedTasks: number;
  subjectBreakdown: Record<string, number>;
  averageDailyStudyTime: number;
  bestStreak: number;
  consistencyScore: number;
}

// Sync-related interfaces
export interface OutboxEvent {
  id: string;
  eventId: string;
  eventType: string;
  payload: any;
  createdAt: number;
  retryCount: number;
  lastAttempt?: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
}

export interface SyncCheckpoint {
  id: string;
  deviceId: string;
  lastSyncedEventId: string;
  lastSyncedAt: number;
  serverVersion?: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  platform: string;
  lastSeen: number;
  isActive: boolean;
}

// E2EE related interfaces
export interface EncryptionKey {
  id: string;
  keyId: string;
  encryptedKey: string; // Encrypted with passphrase
  salt: string;
  iterations: number;
  algorithm: string;
  createdAt: number;
  lastUsed?: number;
  isActive: boolean;
}

export interface RecoveryPhrase {
  id: string;
  encryptedPhrase: string;
  hint?: string;
  createdAt: number;
  lastUsed?: number;
}

// Settings interface
export interface AppSettings {
  id: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  syncEnabled: boolean;
  studyReminders: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  analyticsEnabled: boolean;
  e2eeEnabled: boolean;
  version: number;
  updatedAt: number;
}

// Main database class
export class StudySentinelDB extends Dexie {
  // Event tables
  events!: Table<AppEvent, string>;
  outbox!: Table<OutboxEvent, string>;
  checkpoints!: Table<SyncCheckpoint, string>;
  
  // Analytics tables
  dailyRollups!: Table<DailyRollup, string>;
  weeklyRollups!: Table<WeeklyRollup, string>;
  monthlyRollups!: Table<MonthlyRollup, string>;
  
  // Settings and config
  settings!: Table<AppSettings, string>;
  devices!: Table<DeviceInfo, string>;
  
  // E2EE tables
  encryptionKeys!: Table<EncryptionKey, string>;
  recoveryPhrases!: Table<RecoveryPhrase, string>;

  constructor() {
    super('StudySentinelDB');
    
    this.version(2).stores({
      // Event sourcing tables
      events: 'id, type, deviceId, timestamp, sessionId',
      outbox: 'id, eventId, eventType, createdAt, status, retryCount',
      checkpoints: 'id, deviceId, lastSyncedAt',
      
      // Analytics rollups
      dailyRollups: 'date',
      weeklyRollups: 'weekStart',
      monthlyRollups: 'month',
      
      // Settings and devices
      settings: 'id',
      devices: 'id, isActive, lastSeen',
      
      // E2EE
      encryptionKeys: 'id, keyId, isActive, createdAt',
      recoveryPhrases: 'id, createdAt'
    });
  }

  // Initialize database with default settings
  async initialize(deviceId: string): Promise<void> {
    const settingsCount = await this.settings.count();
    
    if (settingsCount === 0) {
      const defaultSettings: AppSettings = {
        id: 'default',
        theme: 'system',
        notifications: true,
        syncEnabled: false,
        studyReminders: false,
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00'
        },
        analyticsEnabled: true,
        e2eeEnabled: false,
        version: 1,
        updatedAt: Date.now()
      };

      await this.settings.add(defaultSettings);
    }

    // Register this device
    const deviceExists = await this.devices.where('id').equals(deviceId).count();
    
    if (!deviceExists) {
      const deviceInfo: DeviceInfo = {
        id: deviceId,
        name: this.getDeviceName(),
        type: this.getDeviceType(),
        platform: navigator.platform,
        lastSeen: Date.now(),
        isActive: true
      };

      await this.devices.add(deviceInfo);
    }
  }

  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Mobile')) return 'Mobile Device';
    if (userAgent.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  }

  private getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Tablet')) return 'tablet';
    if (userAgent.includes('Mobile')) return 'mobile';
    return 'desktop';
  }

  // Event sourcing methods
  async addEvent(event: Omit<AppEvent, 'id' | 'timestamp' | 'version'>): Promise<string> {
    const eventId = this.generateEventId();
    const fullEvent: AppEvent = {
      ...event,
      id: eventId,
      timestamp: Date.now(),
      version: 1
    } as AppEvent;

    await this.events.add(fullEvent);
    
    // Add to outbox if sync is enabled
    const settings = await this.settings.get('default');
    if (settings?.syncEnabled) {
      await this.addToOutbox(eventId, event.type, event.data);
    }

    return eventId;
  }

  async getEvents(filter?: {
    type?: string;
    deviceId?: string;
    startDate?: number;
    endDate?: number;
    sessionId?: string;
  }): Promise<AppEvent[]> {
    let query = this.events.orderBy('timestamp');

    if (filter) {
      if (filter.type) {
        query = query.filter(event => event.type === filter.type);
      }
      if (filter.deviceId) {
        query = query.filter(event => event.deviceId === filter.deviceId);
      }
      if (filter.startDate) {
        query = query.filter(event => event.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        query = query.filter(event => event.timestamp <= filter.endDate!);
      }
      if (filter.sessionId) {
        query = query.filter(event => event.sessionId === filter.sessionId);
      }
    }

    return await query.reverse().toArray();
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Outbox management
  private async addToOutbox(eventId: string, eventType: string, payload: any): Promise<void> {
    const outboxEvent: OutboxEvent = {
      id: this.generateOutboxId(),
      eventId,
      eventType,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    await this.outbox.add(outboxEvent);
  }

  private generateOutboxId(): string {
    return `out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Analytics methods
  async getDailyRollup(date: string): Promise<DailyRollup | undefined> {
    return await this.dailyRollups.get(date);
  }

  async updateDailyRollup(rollup: DailyRollup): Promise<void> {
    await this.dailyRollups.put(rollup);
  }

  async getWeeklyRollup(weekStart: string): Promise<WeeklyRollup | undefined> {
    return await this.weeklyRollups.get(weekStart);
  }

  async updateWeeklyRollup(rollup: WeeklyRollup): Promise<void> {
    await this.weeklyRollups.put(rollup);
  }

  async getMonthlyRollup(month: string): Promise<MonthlyRollup | undefined> {
    return await this.monthlyRollups.get(month);
  }

  async updateMonthlyRollup(rollup: MonthlyRollup): Promise<void> {
    await this.monthlyRollups.put(rollup);
  }

  // Settings management
  async getSettings(): Promise<AppSettings | undefined> {
    return await this.settings.get('default');
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    if (!current) return;

    const updated: AppSettings = {
      ...current,
      ...updates,
      version: current.version + 1,
      updatedAt: Date.now()
    };

    await this.settings.put(updated);

    // Add settings update event
    await this.addEvent({
      type: 'settings_updated',
      deviceId: await this.getCurrentDeviceId(),
      data: updated
    });
  }

  private async getCurrentDeviceId(): Promise<string> {
    const devices = await this.devices.where('isActive').equals(1).toArray();
    return devices[0]?.id || 'unknown';
  }
}

// Database instance
export const db = new StudySentinelDB();