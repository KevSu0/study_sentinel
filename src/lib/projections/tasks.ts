import type { EventRecord } from '../events';
import type { StudyTask } from '../types';

export function buildTasksFromEvents(events: EventRecord[], base: StudyTask[]): StudyTask[] {
  const byId = new Map(base.map(t => [t.id, { ...t }]));

  for (const e of events) {
    if (e.type === 'TASK_ADD') {
      const t = e.payload as any;
      if (!byId.has(t.id)) byId.set(t.id, t as StudyTask);
    } else if (e.type === 'TASK_UPDATE') {
      const t = e.payload as any;
      const existing = byId.get(t.id);
      if (existing) byId.set(t.id, { ...existing, ...t });
    } else if (e.type === 'TASK_ARCHIVE') {
      const id = (e.payload as any)?.taskId;
      const existing = id ? byId.get(id) : undefined;
      if (existing) byId.set(id, { ...existing, status: 'archived' } as StudyTask);
    } else if (e.type === 'TASK_UNARCHIVE') {
      const id = (e.payload as any)?.taskId;
      const existing = id ? byId.get(id) : undefined;
      if (existing) byId.set(id, { ...existing, status: 'todo' } as StudyTask);
    } else if (e.type === 'TASK_PUSH_NEXT_DAY') {
      const id = (e.payload as any)?.taskId;
      const newDate = (e.payload as any)?.date;
      const existing = id ? byId.get(id) : undefined;
      if (existing && newDate) byId.set(id, { ...existing, date: newDate } as StudyTask);
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.date && b.date) {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
    }
    if (a.time && b.time) {
      return a.time.localeCompare(b.time);
    }
    return 0;
  });
}

