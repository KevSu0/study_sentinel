import { Table } from 'dexie';
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
    try {
      if (item.id) {
        await this.table.put(item as any);
        return item.id as TKey;
      }
      const key = await this.table.add(item as any);
      return key as any;
    } catch (error) {
      logger.error(`Failed to add item to ${this.table.name}`, error);
      throw error;
    }
  }

  async bulkAdd(items: T[]): Promise<TKey[]> {
    try {
      return this.table.bulkAdd(items as any, { allKeys: true }) as Promise<TKey[]>;
    } catch (error) {
      logger.error(`Failed to bulk add items to ${this.table.name}`, error);
      throw error;
    }
  }

  async update(id: TKey, changes: Partial<T>): Promise<number> {
    try {
      return await this.table.update(id as any, changes as any);
    } catch (error) {
      logger.error(`Failed to update item in ${this.table.name}`, error);
      throw error;
    }
  }

  async delete(id: TKey): Promise<void> {
    try {
      await this.table.delete(id as any);
    } catch (error) {
      logger.error(`Failed to delete item from ${this.table.name}`, error);
      throw error;
    }
  }
}
