/**
 * Daily Rollups System v2
 *
 * Manages pre-aggregated daily statistics for performance optimization
 * Uses 04:00 IST boundary for bucket_day
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { format, addHours, startOfDay, parseISO } from 'date-fns';

// Database schema extension
interface DailyRollupsDB extends DBSchema {
  daily_rollups: {
    key: string;
    value: DailyRollup;
    indexes: {
      by_bucket_day: string;
      by_timestamp: number;
    };
  };
  rollup_metadata: {
    key: string;
    value: RollupMetadata;
    indexes: {
      by_version: string;
    };
  };
}

export interface DailyRollup {
  bucket_day: string; // YYYY-MM-DD in IST
  total_minutes: number;
  total_points: number;
  by_routine: Record<string, {
    minutes: number;
    points: number;
    sessions: number;
  }>;
  by_subject: Record<string, {
    minutes: number;
    points: number;
    sessions: number;
  }>;
  session_count: number;
  first_session_time?: number;
  last_session_time?: number;
  version: string; // rollup version
  created_at: number;
  updated_at: number;
  is_complete: boolean; // For partial days
}

export interface RollupMetadata {
  id: string;
  version: string;
  schema_version: number;
  migration_notes?: string;
  created_at: number;
}

// Constants
const ROLLUP_VERSION = '2.0.0';
const DB_NAME = 'StudySentinelDailyRollups';
const DB_VERSION = 1;
const IST_OFFSET = 5.5; // IST is UTC+5:30

// Database singleton
let dbPromise: Promise<IDBPDatabase<DailyRollupsDB>> | null = null;

async function getDB(): Promise<IDBPDatabase<DailyRollupsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DailyRollupsDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        // Create daily_rollups store
        if (!db.objectStoreNames.contains('daily_rollups')) {
          const rollupStore = db.createObjectStore('daily_rollups', { keyPath: 'bucket_day' });
          rollupStore.createIndex('by_bucket_day', 'bucket_day');
          rollupStore.createIndex('by_timestamp', 'created_at');
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('rollup_metadata')) {
          const metaStore = db.createObjectStore('rollup_metadata', { keyPath: 'id' });
          metaStore.createIndex('by_version', 'version');
        }
      },
    });

    // Initialize metadata if not exists
    const db = await dbPromise;
    const existingMeta = await db.get('rollup_metadata', 'schema_version');
    if (!existingMeta) {
      await db.add('rollup_metadata', {
        id: 'schema_version',
        version: ROLLUP_VERSION,
        schema_version: 1,
        created_at: Date.now()
      });
    }
  }

  return dbPromise;
}

// Helper: Convert timestamp to IST bucket day
export function getBucketDay(timestamp: number | Date): string {
  const date = new Date(timestamp);

  // Convert to IST
  const istDate = addHours(date, IST_OFFSET);

  // Study day starts at 04:00 IST
  const studyDay = startOfDay(istDate);
  studyDay.setHours(4, 0, 0, 0);

  if (istDate < studyDay) {
    studyDay.setDate(studyDay.getDate() - 1);
  }

  return format(studyDay, 'yyyy-MM-dd');
}

// Core rollup operations
export async function createOrUpdateDailyRollup(
  events: any[],
  forceRecompute = false
): Promise<DailyRollup> {
  const db = await getDB();

  // Group events by bucket day
  const eventsByDay = new Map<string, any[]>();

  for (const event of events) {
    const bucketDay = getBucketDay(event.timestamp);
    if (!eventsByDay.has(bucketDay)) {
      eventsByDay.set(bucketDay, []);
    }
    eventsByDay.get(bucketDay)!.push(event);
  }

  const results: DailyRollup[] = [];

  // Process each day
  for (const [bucketDay, dayEvents] of eventsByDay.entries()) {
    // Check if rollup exists and is complete
    const existing = await db.get('daily_rollups', bucketDay);

    if (existing && existing.is_complete && !forceRecompute) {
      results.push(existing);
      continue;
    }

    // Compute new rollup
    const rollup = await computeDailyRollup(bucketDay, dayEvents);

    // Save to database
    await db.put('daily_rollups', rollup);
    results.push(rollup);
  }

  return results[results.length - 1]; // Return last processed
}

export async function computeDailyRollup(
  bucketDay: string,
  events: any[]
): Promise<DailyRollup> {
  const rollup: DailyRollup = {
    bucket_day: bucketDay,
    total_minutes: 0,
    total_points: 0,
    by_routine: {},
    by_subject: {},
    session_count: 0,
    version: ROLLUP_VERSION,
    created_at: Date.now(),
    updated_at: Date.now(),
    is_complete: true
  };

  let firstTime: number | undefined;
  let lastTime: number | undefined;

  for (const event of events) {
    if (event.type === 'study_session_created' || event.type === 'study_session_updated') {
      const data = event.data;
      const minutes = Math.floor(data.duration / 60);
      const points = data.points || minutes;

      // Update totals
      rollup.total_minutes += minutes;
      rollup.total_points += points;
      rollup.session_count++;

      // Track session times
      const startTime = data.startTime || event.timestamp;
      if (!firstTime || startTime < firstTime) firstTime = startTime;
      if (!lastTime || startTime > lastTime) lastTime = startTime;

      // Update by routine
      if (data.routineName) {
        if (!rollup.by_routine[data.routineName]) {
          rollup.by_routine[data.routineName] = { minutes: 0, points: 0, sessions: 0 };
        }
        rollup.by_routine[data.routineName].minutes += minutes;
        rollup.by_routine[data.routineName].points += points;
        rollup.by_routine[data.routineName].sessions++;
      }

      // Update by subject
      if (data.subject) {
        if (!rollup.by_subject[data.subject]) {
          rollup.by_subject[data.subject] = { minutes: 0, points: 0, sessions: 0 };
        }
        rollup.by_subject[data.subject].minutes += minutes;
        rollup.by_subject[data.subject].points += points;
        rollup.by_subject[data.subject].sessions++;
      }
    }
  }

  if (firstTime) rollup.first_session_time = firstTime;
  if (lastTime) rollup.last_session_time = lastTime;

  // Mark as incomplete if this is today and time < 23:59 IST
  const now = new Date();
  const todayBucketDay = getBucketDay(now);
  if (bucketDay === todayBucketDay) {
    const istNow = addHours(now, IST_OFFSET);
    const istHours = istNow.getHours();
    if (istHours < 23 || (istHours === 23 && istNow.getMinutes() < 59)) {
      rollup.is_complete = false;
    }
  }

  return rollup;
}

// Query operations
export async function getDailyRollup(bucketDay: string): Promise<DailyRollup | null> {
  const db = await getDB();
  const result = await db.get('daily_rollups', bucketDay);
  return result || null;
}

export async function getDailyRollupsInRange(
  startDay: string,
  endDay: string
): Promise<DailyRollup[]> {
  const db = await getDB();
  const rollups: DailyRollup[] = [];

  // Get all rollups and filter by range
  // Note: For production, you'd want a more efficient range query
  const allRollups = await db.getAll('daily_rollups');

  for (const rollup of allRollups) {
    if (rollup.bucket_day >= startDay && rollup.bucket_day <= endDay) {
      rollups.push(rollup);
    }
  }

  return rollups.sort((a, b) => a.bucket_day.localeCompare(b.bucket_day));
}

export async function getLatestRollups(count: number): Promise<DailyRollup[]> {
  const db = await getDB();
  const index = db.transaction('daily_rollups').store.index('by_timestamp');
  return index.getAll(null, count);
}

// Aggregate functions for quick stats
export async function getAggregatedStats(
  startDay: string,
  endDay: string
): Promise<{
  totalMinutes: number;
  totalPoints: number;
  totalSessions: number;
  averageDailyMinutes: number;
  studyDays: number;
}> {
  const rollups = await getDailyRollupsInRange(startDay, endDay);

  if (rollups.length === 0) {
    return {
      totalMinutes: 0,
      totalPoints: 0,
      totalSessions: 0,
      averageDailyMinutes: 0,
      studyDays: 0
    };
  }

  const totalMinutes = rollups.reduce((sum, r) => sum + r.total_minutes, 0);
  const totalPoints = rollups.reduce((sum, r) => sum + r.total_points, 0);
  const totalSessions = rollups.reduce((sum, r) => sum + r.session_count, 0);
  const studyDays = rollups.filter(r => r.total_minutes > 0).length;

  return {
    totalMinutes,
    totalPoints,
    totalSessions,
    averageDailyMinutes: studyDays > 0 ? Math.round(totalMinutes / studyDays) : 0,
    studyDays
  };
}

// Maintenance operations
export async function cleanupOldRollups(keepDays: number = 365): Promise<void> {
  const db = await getDB();
  const cutoffDate = format(new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const oldRollups = await db.getAll('daily_rollups');
  const tx = db.transaction('daily_rollups', 'readwrite');

  for (const rollup of oldRollups) {
    if (rollup.bucket_day < cutoffDate) {
      tx.store.delete(rollup.bucket_day);
    }
  }

  await tx.done;
}

export async function recomputeAllRollups(events: any[]): Promise<void> {
  const db = await getDB();

  // Clear existing rollups
  await db.clear('daily_rollups');

  // Regenerate all rollups
  await createOrUpdateDailyRollup(events, true);
}

// Migration helpers
export async function migrateFromLocalStorage(): Promise<void> {
  try {
    // Get existing data from localStorage
    const existingData = localStorage.getItem('study-sentinel-stats');
    if (!existingData) return;

    const { completedWork = [] } = JSON.parse(existingData);

    // Convert to events format and create rollups
    const events = completedWork.map((work: any) => ({
      type: 'study_session_created',
      timestamp: new Date(work.timestamp).getTime(),
      data: {
        duration: work.duration,
        points: work.points,
        subject: work.title,
        routineName: work.type === 'routine' ? work.title : undefined
      }
    }));

    await createOrUpdateDailyRollup(events, true);

    console.log('Migrated', events.length, 'events to daily rollups');
  } catch (error) {
    console.error('Failed to migrate from localStorage:', error);
  }
}

// Health check
export async function getRollupHealth(): Promise<{
  totalRollups: number;
  version: string;
  latestRollup?: string;
  incompleteRollups: number;
}> {
  const db = await getDB();
  const metadata = await db.get('rollup_metadata', 'schema_version');
  const allRollups = await db.getAll('daily_rollups');

  const incomplete = allRollups.filter(r => !r.is_complete).length;
  const latest = allRollups.length > 0
    ? allRollups.reduce((latest, current) =>
        current.bucket_day > latest.bucket_day ? current : latest
      ).bucket_day
    : undefined;

  return {
    totalRollups: allRollups.length,
    version: metadata?.version || 'unknown',
    latestRollup: latest,
    incompleteRollups: incomplete
  };
}

// Debug utilities
export async function exportRollups(): Promise<string> {
  const db = await getDB();
  const rollups = await db.getAll('daily_rollups');
  return JSON.stringify(rollups, null, 2);
}

export async function importRollups(jsonData: string): Promise<void> {
  const rollups = JSON.parse(jsonData);
  const db = await getDB();
  const tx = db.transaction('daily_rollups', 'readwrite');

  for (const rollup of rollups) {
    await tx.store.put(rollup);
  }

  await tx.done;
}