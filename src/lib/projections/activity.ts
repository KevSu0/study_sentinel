import type { EventRecord } from '../events';
import type { StudyTask, Routine } from '../types';
import { buildSessionsFromEvents } from './sessions';

export type ActivityFeedItem = {
  type: 'TASK_COMPLETE' | 'ROUTINE_COMPLETE' | 'TIMER_STOP';
  data: any;
  timestamp: string;
};

export function buildActivityFromEvents(
  events: EventRecord[],
  tasks: StudyTask[],
  routines: Routine[]
): ActivityFeedItem[] {
  const sessions = buildSessionsFromEvents(events);
  const byTask = new Map(tasks.map(t => [t.id, t]));
  const byRoutine = new Map(routines.map(r => [r.id, r]));

  const items: ActivityFeedItem[] = [];
  for (const e of events) {
    if (e.type === 'TIMER_SESSION_COMPLETE') {
      const tid = (e.payload as any)?.taskId as string | undefined;
      const task = tid ? byTask.get(tid) : undefined;
      const session = sessions.find(s => s.timestamp === e.timestamp && s.type === 'task');
      const isUndone = session?.isUndone || false;
      if (task) {
        items.push({
          type: 'TASK_COMPLETE',
          data: { task, log: { id: e.id, timestamp: e.timestamp, type: e.type, payload: e.payload }, isUndone },
          timestamp: e.timestamp,
        });
      }
    } else if (e.type === 'ROUTINE_SESSION_COMPLETE') {
      const rid = (e.payload as any)?.routineId as string | undefined;
      const routine = rid ? byRoutine.get(rid) : undefined;
      const session = sessions.find(s => s.timestamp === e.timestamp && s.type === 'routine');
      const isUndone = session?.isUndone || false;
      items.push({
        type: 'ROUTINE_COMPLETE',
        data: { routine, log: { id: e.id, timestamp: e.timestamp, type: e.type, payload: e.payload }, isUndone },
        timestamp: e.timestamp,
      });
    } else if (e.type === 'TIMER_STOP') {
      items.push({ type: 'TIMER_STOP', data: e, timestamp: e.timestamp });
    }
  }
  // Order descending by timestamp
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

