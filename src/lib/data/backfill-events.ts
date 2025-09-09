import { format } from 'date-fns';
import { getDB } from '../db';
import { ALLOW_LEGACY_LOGS_READ } from '../flags';
import type { LogEvent } from '../types';
import type { EventRecord, EventType } from '../events';
import { EventSchema } from '../events';
import { getStudyDateForTimestamp } from '../utils';

const FLAG = 'eventsBackfill_v1';

function toEventType(type: string): EventType | null {
  // Pass through known types; normalize TASK_COMPLETE to TIMER_SESSION_COMPLETE for consistency
  if (type === 'TASK_COMPLETE') return 'TIMER_SESSION_COMPLETE';
  const allowed: EventType[] = [
    'TIMER_START','TIMER_PAUSE','TIMER_RESUME','TIMER_STOP','TIMER_SESSION_COMPLETE',
    'TASK_ADD','TASK_UPDATE','TASK_ARCHIVE','TASK_UNARCHIVE','TASK_PUSH_NEXT_DAY',
    'ROUTINE_SESSION_COMPLETE','TASK_RETRY','ROUTINE_RETRY',
  ];
  return (allowed as string[]).includes(type) ? (type as EventType) : null;
}

export async function backfillEventsOnce() {
  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(FLAG)) return;
    const db = getDB();
    if (!ALLOW_LEGACY_LOGS_READ) {
      localStorage.setItem(FLAG, String(Date.now()));
      return;
    }
    const logs = await db.logs.toArray();
    if (!logs || logs.length === 0) {
      localStorage.setItem(FLAG, String(Date.now()));
      return;
    }

    const events: EventRecord[] = [];
    for (const log of logs as LogEvent[]) {
      const t = toEventType(log.type);
      if (!t) continue;
      const ts = log.timestamp || new Date().toISOString();
      const date = format(getStudyDateForTimestamp(ts), 'yyyy-MM-dd');
      const e: EventRecord = {
        id: log.id,
        type: t,
        timestamp: ts,
        payload: log.payload || {},
        dateKey: date,
        meta: { v: 1 },
      };
      // Validate (best-effort)
      try { EventSchema.parse(e); } catch {}
      events.push(e);

      // If legacy log is marked undone and is a completion, create a revocation event
      const isCompletion = (t === 'TIMER_SESSION_COMPLETE' || t === 'ROUTINE_SESSION_COMPLETE');
      if (isCompletion && (log as any).isUndone) {
        const revoke: EventRecord = {
          id: `${log.id}::revoke`,
          type: 'COMPLETION_REVOKED',
          timestamp: ts,
          payload: {},
          dateKey: date,
          meta: { v: 1, refs: { originalEventId: log.id } },
        };
        events.push(revoke);
      }
    }

    if (events.length > 0) {
      await db.events.bulkPut(events);
    }
    localStorage.setItem(FLAG, String(Date.now()));
  } catch (err) {
    // Swallow errors to avoid blocking app if backfill fails; can be retried manually.
    console.warn('Event backfill skipped due to error:', err);
  }
}

