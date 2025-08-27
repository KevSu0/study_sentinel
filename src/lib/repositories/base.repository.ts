import { Table } from 'dexie';
import { db, Outbox } from '../db';
import { logger } from '../logger';

export class BaseRepository<T extends { id: TKey }, TKey extends string> {
  protected db = db;
  constructor(protected table: Table<T, TKey>) {}

  async getAll(): Promise<T[]> {
    return this.table.toArray();
  }

  async getById(id: TKey): Promise<T | undefined> {
    return this.table.get(id);
  }

  async add(item: T): Promise<TKey | undefined> {
    if (navigator.onLine) {
      try {
        return await this.table.add(item);
      } catch (error) {
        logger.error(`Failed to add item to ${this.table.name} in online mode`, error);
        // Fallback to offline mechanism if online fails
        await this.addToOutbox({
          operation: 'create',
          table: this.table.name,
          payload: item,
          timestamp: Date.now(),
        });
        return undefined;
      }
    } else {
      await this.addToOutbox({
        operation: 'create',
        table: this.table.name,
        payload: item,
        timestamp: Date.now(),
      });
      return undefined;
    }
  }

  async bulkAdd(items: T[]): Promise<TKey[]> {
    if (navigator.onLine) {
       return this.table.bulkAdd(items as any, { allKeys: true }) as Promise<TKey[]>;
    } else {
       for (const item of items) {
           await this.addToOutbox({
                operation: 'create',
                table: this.table.name,
                payload: item,
                timestamp: Date.now(),
            });
       }
       return [];
    }
  }

  async update(id: TKey, changes: Partial<T>): Promise<number> {
    if (navigator.onLine) {
      try {
        return await this.table.update(id, changes as any);
      } catch(error) {
         logger.error(`Failed to update item in ${this.table.name} in online mode`, error);
         await this.addToOutbox({
            operation: 'update',
            table: this.table.name,
            payload: { id, changes },
            timestamp: Date.now(),
          });
          return 1;
      }
    } else {
      await this.addToOutbox({
        operation: 'update',
        table: this.table.name,
        payload: { id, changes },
        timestamp: Date.now(),
      });
      return 1; // Indicate success for offline operation
    }
  }

  async delete(id: TKey): Promise<void> {
    if (navigator.onLine) {
       try {
        await this.table.delete(id);
      } catch(error) {
        logger.error(`Failed to delete item from ${this.table.name} in online mode`, error);
        await this.addToOutbox({
            operation: 'delete',
            table: this.table.name,
            payload: { id },
            timestamp: Date.now(),
          });
      }
    } else {
      await this.addToOutbox({
        operation: 'delete',
        table: this.table.name,
        payload: { id },
        timestamp: Date.now(),
      });
    }
  }

  private async addToOutbox(item: Omit<Outbox, 'id'>): Promise<void> {
    await db.outbox.add(item as Outbox);
  }
}
