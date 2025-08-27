
import Dexie, { Table } from 'dexie';
import { Badge, StudyTask, Routine, LogEvent, UserProfile } from './types';
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
  isUndone?: boolean;
  // Add other session properties here
}

export interface DailyStat {
  id?: string;
  date: string;
  // Add other daily stat properties here
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
}

class MyDatabase extends Dexie {
  public plans!: Table<Plan, string>;
  public users!: Table<User, string>;
  public sessions!: Table<Session, string>;
  public stats_daily!: Table<DailyStat, string>;
  public meta!: Table<Meta, string>;
  public outbox!: Table<Outbox, number>;
  public routines!: Table<Routine, string>;
  public logs!: Table<LogEvent, string>;
  public badges!: Table<Badge, string>;

  constructor() {
    super('MyDatabase');
    this.version(5).stores({
      plans: 'id, date, status', // Added indexes for date and status
      users: 'id',
      sessions: 'id, date',
      stats_daily: 'date',
      meta: 'key',
      outbox: '++id',
      routines: 'id',
      logs: 'id, timestamp, type', // Added indexes for timestamp and type
      badges: 'id',
    });

    this.on('populate', async (tx) => {
        // This event runs only when the database is first created.
        console.log("Populating database for the first time.");
        await runMigration(tx);
    });
  }
}

export const db = new MyDatabase();

    