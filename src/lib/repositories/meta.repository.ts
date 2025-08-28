import { db, Meta } from '../db';

class MetaRepository {
  protected db = db;
  protected table = db.meta;

  constructor() {}

  async getById(key: string): Promise<Meta | undefined> {
    return this.table.get(key);
  }

  async getLastSyncTimestamp(): Promise<any> {
    const meta = await this.getById('lastSyncTimestamp');
    return meta ? meta.value : null;
  }

  async setLastSyncTimestamp(timestamp: any): Promise<string> {
    return db.meta.put({ key: 'lastSyncTimestamp', value: timestamp });
  }

  async getMigrationCompleted(): Promise<boolean> {
    const meta = await this.getById('migrationCompleted_v4');
    return meta ? meta.value : false;
  }

  async setMigrationCompleted(value: boolean): Promise<string> {
    return db.meta.put({ key: 'migrationCompleted_v4', value });
  }
}

export const metaRepository = new MetaRepository();
