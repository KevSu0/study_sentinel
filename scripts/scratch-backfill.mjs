import 'fake-indexeddb/auto';
import { __setTestDB, getDB } from '../src/lib/db.js';
import { logRepository } from '../src/lib/repositories/log.repository.ts';
import { backfillSessions } from '../src/lib/data/backfill-sessions.ts';
import { sessionRepository } from '../src/lib/repositories/session.repository.ts';

async function main() {
  __setTestDB(`Scratch-${Date.now()}`);
  console.log('DB name:', getDB().name);
  await logRepository.add({
    id: 'X1',
    timestamp: '2025-09-01T03:58:00Z',
    type: 'TIMER_SESSION_COMPLETE',
    payload: { title: 'Boundary', taskId: 'T1', duration: 1200, pausedDuration: 0, pauseCount: 0, points: 20, priority: 'medium' },
  });
  const res = await backfillSessions();
  console.log('backfill result:', res);
  const rows = await sessionRepository.getByDateRange('2025-08-31', '2025-08-31');
  console.log('sessions on 2025-08-31:', rows.length, rows);
}

main().catch(e => { console.error(e); process.exit(1); });

