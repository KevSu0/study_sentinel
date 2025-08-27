import { db, Meta } from '../db';
import { BaseRepository } from './base.repository';

class MetaRepository extends BaseRepository<Meta, string> {
  constructor() {
    super(db.meta);
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
