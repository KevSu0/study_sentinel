import { db, Outbox } from '../db';
import { BaseRepository } from './base.repository';

class OutboxRepository extends BaseRepository<Outbox, number> {
  constructor() {
    super(db.outbox);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}

export const outboxRepository = new OutboxRepository();
