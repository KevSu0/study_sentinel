import { format, isSameDay } from 'date-fns';
import type { EventRecord } from '../events';
import type { CompletedWork, TaskPriority } from '../types';
import { getStudyDateForTimestamp } from '../utils';

type CompletionEvent = Extract<EventRecord['type'], 'TIMER_SESSION_COMPLETE' | 'ROUTINE_SESSION_COMPLETE'>;

export function buildSessionsFromEvents(events: EventRecord[]): CompletedWork[] {
  const revokedByEventId = new Set<string>();
  const retriedTaskIds = new Set<string>();
  const retriedRoutineIds = new Set<string>();

  for (const e of events) {
    if (e.type === 'COMPLETION_REVOKED' && e.meta?.refs?.originalEventId) {
      revokedByEventId.add(e.meta.refs.originalEventId);
    } else if (e.type === 'TASK_RETRY') {
      const id = (e.payload as any)?.originalTaskId || (e.meta?.refs?.entityId);
      if (id) retriedTaskIds.add(String(id));
    } else if (e.type === 'ROUTINE_RETRY') {
      const id = (e.payload as any)?.routineId || (e.meta?.refs?.entityId);
      if (id) retriedRoutineIds.add(String(id));
    }
  }

  const sessions: CompletedWork[] = [];
  for (const e of events) {
    if (e.type !== 'TIMER_SESSION_COMPLETE' && e.type !== 'ROUTINE_SESSION_COMPLETE') continue;
    const isTask = e.type === 'TIMER_SESSION_COMPLETE' || (!!(e.payload as any)?.taskId && e.type !== 'ROUTINE_SESSION_COMPLETE');
    const ts = e.timestamp;
    const studyDate = format(getStudyDateForTimestamp(ts), 'yyyy-MM-dd');
    const duration = Number((e.payload as any)?.duration || 0) || 0;
    const paused = Number((e.payload as any)?.pausedDuration || 0) || 0;
    const points = Number((e.payload as any)?.points || 0) || 0;
    const title = String((e.payload as any)?.title || '');
    const priority = (e.payload as any)?.priority as TaskPriority | undefined;
    const subject = (e.payload as any)?.subject as string | undefined;
    const taskId = (e.payload as any)?.taskId as string | undefined;
    const routineId = (e.payload as any)?.routineId as string | undefined;

    const isRevoked = revokedByEventId.has(e.id);
    const isUndone = isRevoked || (isTask ? (taskId ? retriedTaskIds.has(taskId) : false)
                                         : (routineId ? retriedRoutineIds.has(routineId) : false));

    sessions.push({
      date: studyDate,
      duration,
      pausedDuration: paused,
      type: isTask ? 'task' : 'routine',
      title,
      points,
      priority,
      subjectId: isTask ? taskId : routineId,
      subject,
      timestamp: ts,
      isUndone,
    });
  }

  return sessions;
}

export function selectSessionsForDate(events: EventRecord[], date: Date): CompletedWork[] {
  const sessions = buildSessionsFromEvents(events);
  return sessions.filter(w => isSameDay(getStudyDateForTimestamp(w.timestamp), date));
}

// Simple snapshot helpers (localStorage-based) for daily sessions
const SESSIONS_SNAP_PREFIX = 'snap:sessions:'; // snap:sessions:yyyy-MM-dd

export function saveSessionsSnapshot(dateKey: string, sessions: CompletedWork[]) {
  try {
    localStorage.setItem(`${SESSIONS_SNAP_PREFIX}${dateKey}`, JSON.stringify(sessions));
  } catch {}
}

export function loadSessionsSnapshot(dateKey: string): CompletedWork[] | null {
  try {
    const raw = localStorage.getItem(`${SESSIONS_SNAP_PREFIX}${dateKey}`);
    return raw ? (JSON.parse(raw) as CompletedWork[]) : null;
  } catch {
    return null;
  }
}
