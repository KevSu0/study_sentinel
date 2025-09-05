import Dexie, { Table } from 'dexie';
import { db, type Session } from '../db';
import { format } from 'date-fns';
import { getStudyDateForTimestamp } from '../utils';

function toStudyDateStr(ts: string): string {
  try {
    return format(getStudyDateForTimestamp(ts), 'yyyy-MM-dd');
  } catch {
    try { return format(new Date(ts), 'yyyy-MM-dd'); } catch { return format(new Date(), 'yyyy-MM-dd'); }
  }
}

export function buildSessionFromLog(log: LogEvent): Session | null {
  if (log.type !== 'TIMER_SESSION_COMPLETE' && log.type !== 'ROUTINE_SESSION_COMPLETE') return null;
  const id = `session-${log.id}`;
  const date = toStudyDateStr(log.timestamp);
  const type = log.type === 'TIMER_SESSION_COMPLETE' ? 'task' : 'routine';
  const duration = Number((log.payload?.duration ?? (Number(log.payload?.productiveDuration ?? 0) + Number(log.payload?.pausedDuration ?? 0))) ?? 0);
  const pausedDuration = Number(log.payload?.pausedDuration ?? 0);
  const points = Number(log.payload?.points ?? 0);
  const title = String(log.payload?.title ?? '');
  const isUndone = !!(log as any).isUndone;
  const subject = (log as any).payload?.subject as string | undefined;
  return { id, userId: 'user_profile', timestamp: log.timestamp, duration, pausedDuration, points, date, type, title, subject, isUndone } as Session;
}

type BackfillParams = {
  logsTable?: Table<LogEvent, string>;
  sessionsTable?: Table<Session, string>;
  chunkSize?: number;
};

export async function backfillSessions(params: BackfillParams = {}): Promise<{ created: number; already: number }>
{
  const logsTable = params.logsTable ?? db.logs as Table<LogEvent, string>;
  const sessionsTable = params.sessionsTable ?? db.sessions as Table<Session, string>;
  const chunkSize = params.chunkSize ?? 200;

  const allLogs = await logsTable.toArray();
  const completionLogs = allLogs.filter(l => l.type === 'TIMER_SESSION_COMPLETE' || l.type === 'ROUTINE_SESSION_COMPLETE');
  if (completionLogs.length === 0) return { created: 0, already: 0 };

  const wantedIds = completionLogs.map(l => `session-${l.id}`);
  const existing = new Set<string>();
  for (let i = 0; i < wantedIds.length; i += chunkSize) {
    const slice = wantedIds.slice(i, i + chunkSize);
    const found = await sessionsTable.where('id').anyOf(slice as any).toArray();
    for (const s of found) existing.add((s as any).id);
  }

  const toCreate: Session[] = [];
  for (const log of completionLogs) {
    const id = `session-${log.id}`;
    if (existing.has(id)) continue;
    const s = buildSessionFromLog(log);
    if (s) toCreate.push(s);
  }

  if (toCreate.length === 0) return { created: 0, already: completionLogs.length };

  await (sessionsTable.db as Dexie).transaction('rw', sessionsTable, async () => {
    await sessionsTable.bulkPut(toCreate as any);
  });

  return { created: toCreate.length, already: completionLogs.length - toCreate.length };
}
