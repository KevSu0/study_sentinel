import { Table } from 'dexie';
import { getDB, Outbox } from '../db';
import { logger } from '../logger';

export class BaseRepository<T extends { id?: TKey }, TKey extends string | number> {
  constructor(protected getTableFn: () => Table<T, TKey>) {}

  protected get table(): Table<T, TKey> {
    return this.getTableFn();
  }

  async getAll(): Promise<T[]> {
    return this.table.toArray();
  }

  async getById(id: TKey): Promise<T | undefined> {
    return this.table.get(id);
  }

  async add(item: T): Promise<TKey | undefined> {
    // Local-first and idempotent: if an id exists, upsert to avoid ConstraintError races
    try {
      if (item.id) {
        await this.table.put(item as any);
        if (!navigator.onLine) {
          await this.addToOutbox({
            operation: 'create',
            table: this.table.name,
            payload: item,
            timestamp: Date.now(),
          });
        }
        return (item.id as unknown) as TKey;
      }

      const key = await this.table.add(item as any);
      if (!navigator.onLine) {
        await this.addToOutbox({
          operation: 'create',
          table: this.table.name,
          payload: item,
          timestamp: Date.now(),
        });
      }
      return key as any;
    } catch (error) {
      logger.error(`Failed to add item to ${this.table.name}`, error);
      // Best-effort: queue to outbox for later sync
      await this.addToOutbox({
        operation: 'create',
        table: (this.table as any).name,
        payload: item,
        timestamp: Date.now(),
      });
      return (item.id as unknown) as TKey | undefined;
    }
  }

  async bulkAdd(items: T[]): Promise<TKey[]> {
    if (navigator.onLine) {
       return this.table.bulkAdd(items as any, { allKeys: true }) as Promise<TKey[]>;
    } else {
       for (const item of items) {
           await this.addToOutbox({
                operation: 'create',
                table: (this.table as any).name,
                payload: item,
                timestamp: Date.now(),
            });
       }
       return [];
    }
  }

  async update(id: TKey, changes: Partial<T>): Promise<number> {
    // Local-first update
    let result = 0;
    try {
      result = await this.table.update(id as any, changes as any);
    } catch (error) {
      logger.error(`Failed to update item in ${(this.table as any).name}`, error);
    }
    if (!navigator.onLine || result === 0) {
      await this.addToOutbox({
        operation: 'update',
        table: (this.table as any).name,
        payload: { id, changes },
        timestamp: Date.now(),
      });
    }
    return result || 1;
  }

  async delete(id: TKey): Promise<void> {
    try {
      await this.table.delete(id as any);
    } catch (error) {
      logger.error(`Failed to delete item from ${(this.table as any).name}`, error);
    }
    if (!navigator.onLine) {
      await this.addToOutbox({
        operation: 'delete',
        table: (this.table as any).name,
        payload: { id },
        timestamp: Date.now(),
      });
    }
  }

  private async addToOutbox(item: Omit<Outbox, 'id'>): Promise<void> {
    await getDB().outbox.add(item as Outbox);
  }
}
