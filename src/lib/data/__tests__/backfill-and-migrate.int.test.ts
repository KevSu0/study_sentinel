/** @jest-environment jsdom */
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { backfillSessions, buildSessionFromLog } from '@/lib/data/backfill-sessions';
import type { LogEvent } from '@/lib/types';
import { migrateSessionIds } from '@/lib/data/migrate-session-ids';

class TestDB extends Dexie {
  logs!: Dexie.Table<any, string>;
  sessions!: Dexie.Table<any, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ logs: 'id', sessions: 'id, date, timestamp' });
    this.logs = this.table('logs');
    this.sessions = this.table('sessions');
  }
}

const makeLog = (id: string, iso: string, title = 'Study', duration = 600): LogEvent => ({
  id,
  timestamp: iso,
  type: 'TIMER_SESSION_COMPLETE',
  payload: { title, duration, pausedDuration: 0, points: Math.floor(duration / 60), priority: 'medium' },
});

describe('backfill & migrate sessions (Dexie)', () => {
  let db: TestDB;

  beforeEach(() => {
    db = new TestDB(`TestDB-${Date.now()}-${Math.random()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('backfillSessions is idempotent', async () => {
    const l1 = makeLog('L1', '2025-09-01T06:00:00Z', 'A', 1200);
    const l2 = makeLog('L2', '2025-09-01T07:00:00Z', 'B', 600);
    await db.logs.bulkAdd([l1, l2]);

    const first = await backfillSessions({ logsTable: db.logs as any, sessionsTable: db.sessions as any });
    expect(first.created).toBe(2);

    const count1 = await db.sessions.count();

    const second = await backfillSessions({ logsTable: db.logs as any, sessionsTable: db.sessions as any });
    expect(second.created).toBe(0);

    const count2 = await db.sessions.count();
    expect(count2).toBe(count1);
  });

  it('migrateSessionIds re-keys legacy ids and backfill does not duplicate', async () => {
    const l = makeLog('LEG', '2025-09-01T06:00:00Z', 'Legacy', 600);
    await db.logs.add(l);
    // Seed a legacy session with id === log.id (pre-prefix)
    await db.sessions.add({ ...buildSessionFromLog(l)!, id: 'LEG' });

    const mig = await migrateSessionIds(db.sessions as any);
    expect(mig.migrated).toBe(1);

    // Backfill must not create another for the same log
    const res = await backfillSessions({ logsTable: db.logs as any, sessionsTable: db.sessions as any });
    expect(res.created).toBe(0);

    // Exactly one, with new key
    const rows = await db.sessions.toArray();
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('session-LEG');
  });
});
