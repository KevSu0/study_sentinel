// src/data/logs/event.append.ts

import { LocalStore, storageKeys } from '../storage/local.store';
import { Event } from './event.model';
import { getDateKey } from '../../metrics/day.split';

/**
 * Append-only event writer
 */
export class EventAppend {
  private store: LocalStore;

  constructor(store?: LocalStore) {
    this.store = store || new LocalStore();
  }

  /**
   * Append an event to the log
   */
  async append(event: Event): Promise<boolean> {
    try {
      // Validate event
      if (!this.validateEvent(event)) {
        console.error('Invalid event:', event);
        return false;
      }

      // Get existing events for the date
      const dateKey = event.dateKey;
      const logKey = storageKeys.log(dateKey);
      const existingEvents = this.store.get<Event[]>(logKey) || [];

      // Append new event
      const updatedEvents = [...existingEvents, event];

      // Store back
      const success = this.store.set(logKey, updatedEvents);

      if (success) {
        console.log(`Event appended: ${event.type} for ${dateKey}`);
      }

      return success;
    } catch (error) {
      console.error('Failed to append event:', error);
      return false;
    }
  }

  /**
   * Get events for a date range
   */
  getEvents(startDate: string, endDate: string): Event[] {
    const events: Event[] = [];

    // Generate date keys in range
    const dates = this.generateDateRange(startDate, endDate);

    for (const date of dates) {
      const logKey = storageKeys.log(date);
      const dayEvents = this.store.get<Event[]>(logKey) || [];
      events.push(...dayEvents);
    }

    // Sort by timestamp
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get all events for a single date
   */
  getEventsForDate(date: string): Event[] {
    const logKey = storageKeys.log(date);
    return this.store.get<Event[]>(logKey) || [];
  }

  /**
   * Validate event before appending
   */
  private validateEvent(event: Event): boolean {
    // Check required fields
    if (!event.id || !event.type || !event.timestamp) {
      return false;
    }

    // Check dateKey matches timestamp
    const expectedDateKey = getDateKey(event.timestamp);
    if (event.dateKey !== expectedDateKey) {
      console.warn(`Event dateKey mismatch: expected ${expectedDateKey}, got ${event.dateKey}`);
      return false;
    }

    // Type-specific validation
    switch (event.type) {
      case 'TIMER_START':
        return (
          !!event.payload.entityId &&
          !!event.payload.title &&
          event.payload.startTs > 0
        );
      case 'TIMER_PAUSE':
        return (
          !!event.payload.entityId &&
          event.payload.pauseStartTs > 0
        );
      case 'TIMER_RESUME':
        return (
          !!event.payload.entityId &&
          event.payload.pauseEndTs > 0 &&
          event.payload.lastPauseMs >= 5000 // Minimum 5 seconds
        );
      case 'TIMER_STOP':
        return (
          !!event.payload.entityId &&
          event.payload.stopTs > 0 &&
          !!event.payload.reason &&
          !!event.payload.snapshot
        );
      case 'MANUAL_TIME_ENTRY':
        return (
          !!event.payload.date &&
          event.payload.durationMs > 0 &&
          event.payload.productivePct >= 0 &&
          event.payload.productivePct <= 100
        );
      default:
        return true;
    }
  }

  /**
   * Generate date range between two dates
   */
  private generateDateRange(start: string, end: string): string[] {
    const dates: string[] = [];
    const currentDate = new Date(start);
    const endDate = new Date(end);

    while (currentDate <= endDate) {
      dates.push(this.formatDate(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Clear all events (for testing/data reset)
   */
  clearAll(): boolean {
    const keys = this.store.getKeys();
    const logKeys = keys.filter(key => key.includes('SS_V1_LOG_'));

    for (const key of logKeys) {
      this.store.remove(key);
    }

    return true;
  }
}

// Default instance
export const eventAppend = new EventAppend();

/**
 * Create event with generated ID and timestamp
 */
export function createEvent<T extends Event>(
  type: T['type'],
  payload: T['payload'],
  timestamp?: number
): Omit<T, 'id' | 'dateKey'> & { id: string; dateKey: string } {
  const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const ts = timestamp || Date.now();
  const dateKey = getDateKey(ts);

  return {
    id,
    type,
    timestamp: ts,
    dateKey,
    payload: payload as any,
  } as any;
}