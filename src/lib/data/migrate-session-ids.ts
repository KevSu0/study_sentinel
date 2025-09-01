import Dexie, { Table } from 'dexie';
import type { Session } from '../db';

export async function migrateSessionIds(
  sessionsTable: Table<Session, string>,
): Promise<{ migrated: number }>
{
  const all = await sessionsTable.toArray();
  const legacy = all.filter((s: any) => typeof s.id === 'string' && !s.id.startsWith('session-')) as any[];
  if (legacy.length === 0) return { migrated: 0 };

  await (sessionsTable.db as Dexie).transaction('rw', sessionsTable, async () => {
    for (const s of legacy) {
      const newId = `session-${s.id}`;
      await sessionsTable.put({ ...(s as any), id: newId } as any);
      await sessionsTable.delete(s.id);
    }
  });
  return { migrated: legacy.length };
}

