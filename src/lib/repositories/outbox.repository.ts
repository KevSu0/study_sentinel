import { getDB, Outbox } from '../db';
import { BaseRepository } from './base.repository';

class OutboxRepository extends BaseRepository<Outbox, number> {
  constructor() {
    super(() => getDB().outbox);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}

export const outboxRepository = new OutboxRepository();
