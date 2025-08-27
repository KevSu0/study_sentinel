import { db } from '../db';
import { LogEvent } from '../types';
import { BaseRepository } from './base.repository';

class LogRepository extends BaseRepository<LogEvent, string> {
  constructor() {
    super(db.logs);
  }

  async getLogsByDate(date: string): Promise<LogEvent[]> {
    return this.db.logs.where('timestamp').startsWith(date).toArray();
  }
}

export const logRepository = new LogRepository();
