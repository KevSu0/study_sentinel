import { getDB } from '../db';
import { LogEvent } from '../types';
import { BaseRepository } from './base.repository';

class LogRepository extends BaseRepository<LogEvent, string> {
  constructor() {
    super(() => getDB().logs);
  }

  async getLogsByDate(date: string): Promise<LogEvent[]> {
    return getDB().logs.where('timestamp').startsWith(date).toArray();
  }
}

export const logRepository = new LogRepository();
