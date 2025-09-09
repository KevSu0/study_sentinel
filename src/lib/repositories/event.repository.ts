import { getDB } from '../db';
import { BaseRepository } from './base.repository';
import type { EventRecord } from '../events';

class EventRepository extends BaseRepository<EventRecord, string> {
  constructor() {
    super(() => getDB().events);
  }

  async getEventsByDate(date: string): Promise<EventRecord[]> {
    // date is yyyy-MM-dd (study-day key)
    const rows = await getDB().events.where('dateKey').equals(date).toArray();
    // Ensure deterministic order by timestamp then id
    return rows.sort((a, b) => {
      const t = a.timestamp.localeCompare(b.timestamp);
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    });
  }

  async getByRange(startDate: string, endDate: string): Promise<EventRecord[]> {
    // naive range by dateKey inclusive
    const rows = await getDB().events
      .where('dateKey')
      .between(startDate, endDate, true, true)
      .toArray();
    // Ensure deterministic order across the range
    return rows.sort((a, b) => {
      const t = a.timestamp.localeCompare(b.timestamp);
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    });
  }

  async getByTimestampRange(startISO: string, endISO: string): Promise<EventRecord[]> {
    // inclusive start, exclusive end to avoid double-counting boundaries
    const rows = await getDB().events
      .where('timestamp')
      .between(startISO, endISO, true, false)
      .toArray();
    // Ensure deterministic order
    return rows.sort((a, b) => {
      const t = a.timestamp.localeCompare(b.timestamp);
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    });
  }
}

export const eventRepository = new EventRepository();
