import { getDB, type DailyStat } from '../db';
import { BaseRepository } from './base.repository';

class StatsDailyRepository extends BaseRepository<DailyStat, string> {
  constructor() {
    super(() => getDB().stats_daily);
  }

  async getByDate(date: string): Promise<DailyStat | undefined> {
    return getDB().stats_daily.where('date').equals(date).first();
  }
}

export const statsDailyRepository = new StatsDailyRepository();
