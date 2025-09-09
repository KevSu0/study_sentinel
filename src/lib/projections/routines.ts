import type { EventRecord } from '../events';
import type { Routine } from '../types';

export function buildRoutinesFromEvents(events: EventRecord[], base: Routine[]): Routine[] {
  const byId = new Map(base.map(r => [r.id, { ...r }]));

  for (const e of events) {
    if (e.type === 'ROUTINE_ADD') {
      const r = e.payload as any;
      if (!byId.has(r.id)) byId.set(r.id, r as Routine);
    } else if (e.type === 'ROUTINE_UPDATE') {
      const r = e.payload as any;
      const existing = byId.get(r.id);
      if (existing) byId.set(r.id, { ...existing, ...r });
    } else if (e.type === 'ROUTINE_DELETE') {
      const id = (e.payload as any)?.id;
      if (id) byId.delete(id);
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

