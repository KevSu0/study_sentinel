
import Dexie, { type Table } from 'dexie';
import { type Badge, type StudyTask, type Routine, type LogEvent, type UserProfile } from './types';
import { runMigration } from './migration';

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
  public routines!: Table<Routine, string>;
  public logs!: Table<LogEvent, string>;
  public badges!: Table<Badge, string>;
  public userPreferences!: Table<UserPreference, string>;

  constructor(name: string = 'MyDatabase') {
    super(name);
    this.version(6).stores({
      plans: 'id, date, status', // Added indexes for date and status
      users: 'id',
      sessions: 'id, date',
      stats_daily: 'date',
      meta: 'key',
      routines: 'id',
      logs: 'id, timestamp, type', // Added indexes for timestamp and type
      badges: 'id',
      userPreferences: 'key, userId, updatedAt'
    });

    this.on('populate', async (tx) => {
        // This event runs only when the database is first created.
        console.log("Populating database for the first time.");
        await runMigration(tx);
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

    
