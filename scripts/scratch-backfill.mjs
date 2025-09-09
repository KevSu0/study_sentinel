import 'fake-indexeddb/auto';
import { __setTestDB, getDB } from '../src/lib/db.js';
import { backfillSessions } from '../src/lib/data/backfill-sessions.ts';
import { sessionRepository } from '../src/lib/repositories/session.repository.ts';

async function main() {
  __setTestDB(`Scratch-${Date.now()}`);
  console.log('DB name:', getDB().name);
  const res = await backfillSessions();
  console.log('backfill result:', res);
  const rows = await sessionRepository.getByDateRange('2025-08-31', '2025-08-31');
  console.log('sessions on 2025-08-31:', rows.length, rows);
}

main().catch(e => { console.error(e); process.exit(1); });

