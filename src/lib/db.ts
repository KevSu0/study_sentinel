
import Dexie, { Table } from 'dexie';
import { ActivityAttempt, ActivityEvent, Badge, StudyTask, Routine, UserProfile } from './types';

// Define your interfaces based on the application's needs
export interface Plan extends StudyTask {}

export interface User extends UserProfile {}

export interface Session {
  id: string;
  userId: string;
  timestamp: string;
  duration: number;
  pausedDuration?: number;
  points: number;
  date: string;
  type: 'task' | 'routine';
  title: string;
  subject?: string;
  isUndone?: boolean;
  // Add other session properties here
}

export interface DailyStat {
  id?: string;
  date: string; // study-day yyyy-MM-dd
  // Aggregates
  totalSeconds?: number;
  pausedSeconds?: number;
  points?: number;
  sessionsCount?: number;
  focusScore?: number; // (productive/total)*100
  // Optional per-subject rollups
  subjects?: Record<string, { totalSeconds: number; points: number; sessionsCount: number }>;
}

export interface Meta {
  key: string;
  value: any;
}

export interface Outbox {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  table: string;
  payload: any;
  timestamp: number;
  retries?: number;
  lastAttempt?: number;
  maxRetries?: number;
  errorMessage?: string;
}

// New interfaces for offline-first functionality
export interface SyncConflict {
  id: string;
  tableName: string;
  recordId: string;
  localData: any;
  remoteData: any;
  localModifiedAt: string;
  remoteModifiedAt: string;
  resolutionStrategy: 'local_wins' | 'remote_wins' | 'manual';
  createdAt: string;
  resolveConflict?: (resolution: 'local' | 'remote') => Promise<void>;
  conflictType?: string;
  timestamp?: string;
  entityType?: string;
  entityId?: string;
  conflictDetails?: any;
}

export interface CachedAIResponse {
  id: string;
  messageHash: string;
  message: string;
  response: string;
  createdAt: string;
  expiresAt: string;
}

export interface UserPreference {
  id?: string;
  key: string;
  userId: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export class MyDatabase extends Dexie {
  public plans!: Table<Plan, string>;
  public users!: Table<User, string>;
  public sessions!: Table<Session, string>;
  public stats_daily!: Table<DailyStat, string>;
  public meta!: Table<Meta, string>;
  public outbox!: Table<Outbox, number>;
  public routines!: Table<Routine, string>;
  public badges!: Table<Badge, string>;
  public activityAttempts!: Table<ActivityAttempt, string>;
  public activityEvents!: Table<ActivityEvent, string>;
  
  // New tables for offline-first functionality
  public syncConflicts!: Table<SyncConflict, string>;
  public cachedAIResponses!: Table<CachedAIResponse, string>;
  public userPreferences!: Table<UserPreference, string>;

  constructor(name: string = 'MyDatabase') {
    super(name);
    this.version(8).stores({
      plans: 'id, date, status', // Added indexes for date and status
      users: 'id',
      sessions: 'id, date',
      stats_daily: 'date',
      meta: 'key',
      outbox: '++id, timestamp, retries',
      routines: 'id',
      badges: 'id',
      activityAttempts: 'id, [entityId+ordinal], activeKey, status',
      activityEvents: '++id, [attemptId+occurredAt], type',
      
      // New tables for offline-first functionality
      syncConflicts: 'id, tableName, recordId, createdAt',
      cachedAIResponses: 'id, messageHash, createdAt, expiresAt',
      userPreferences: 'key, userId, updatedAt'
    });

    this.on('populate', async (tx) => {
        // This event runs only when the database is first created.
        console.log("Populating database for the first time.");
        // The old migration logic has been removed as it's no longer needed.
        // New installations will start with the new schema.
    });
  }
}

let currentDB = new MyDatabase('MyDatabase');
export let db = currentDB;
export const getDB = () => currentDB;

// Test-only: swap DB instance (safe in prod; unused)
export const __setTestDB = (name: string) => {
  try { currentDB.close(); } catch {}
  currentDB = new MyDatabase(name);
  db = currentDB;
  return currentDB;
};

    
