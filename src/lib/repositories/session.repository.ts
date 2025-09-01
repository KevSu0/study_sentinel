import { getDB, Session } from '../db';
import { BaseRepository } from './base.repository';

class SessionRepository extends BaseRepository<Session, string> {
  constructor() {
    super(() => getDB().sessions);
  }

  async getByDateRange(startDate: string, endDate: string): Promise<Session[]> {
    return this.table
      .where('date')
      .between(startDate, endDate)
      .toArray();
  }
}

export const sessionRepository = new SessionRepository();
