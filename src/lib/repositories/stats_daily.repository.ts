import { getDB, DailyStat } from '../db';
import { BaseRepository } from './base.repository';

class StatsDailyRepository extends BaseRepository<DailyStat, string> {
  constructor() {
    super(() => getDB().stats_daily);
  }

  async getByDate(date: string): Promise<DailyStat | undefined> {
    return getDB().stats_daily.where('date').equals(date).first();
  }

  async upsert(stat: DailyStat): Promise<void> {
    const existing = await this.getByDate(stat.date);
    if (existing?.id) {
      await this.table.update(existing.id, { ...existing, ...stat });
    } else {
      const id = stat.id || stat.date; // deterministic id by date
      await this.table.put({ ...stat, id });
    }
  }

  async getByDateRange(startDate: string, endDate: string): Promise<DailyStat[]> {
    return this.table
      .where('date')
      .between(startDate, endDate)
      .toArray();
  }
}

export const statsDailyRepository = new StatsDailyRepository();
