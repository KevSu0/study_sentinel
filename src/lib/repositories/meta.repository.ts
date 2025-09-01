import { getDB, Meta } from '../db';

class MetaRepository {
  constructor() {}

  async getById(key: string): Promise<Meta | undefined> {
    return getDB().meta.get(key);
  }

  async getLastSyncTimestamp(): Promise<any> {
    const meta = await this.getById('lastSyncTimestamp');
    return meta ? meta.value : null;
  }

  async setLastSyncTimestamp(timestamp: any): Promise<string> {
    return getDB().meta.put({ key: 'lastSyncTimestamp', value: timestamp });
  }

  async getMigrationCompleted(): Promise<boolean> {
    const meta = await this.getById('migrationCompleted_v4');
    return meta ? meta.value : false;
  }

  async setMigrationCompleted(value: boolean): Promise<string> {
    return getDB().meta.put({ key: 'migrationCompleted_v4', value });
  }
}

export const metaRepository = new MetaRepository();
