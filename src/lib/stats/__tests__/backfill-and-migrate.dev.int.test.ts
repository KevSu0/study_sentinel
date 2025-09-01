import { __setTestDB, getDB } from '@/lib/db';
import { aggregateRange } from '@/lib/stats/aggregate-daily';
import { statsDailyRepository } from '@/lib/repositories/stats_daily.repository';

describe('historical migration (Phase 2.5)', () => {
  beforeEach(() => {
    const make = (global as any).__makeDBName || ((ns: string) => `${ns}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    __setTestDB(make('MigrateDB'));
  });

  test('populates stats_daily for a past date window', async () => {
    const start = '2025-02-01';
    const end = '2025-02-05';
    // No sessions needed; we validate idempotent creation across range
    await aggregateRange(start, end);
    const checks = await Promise.all([
      statsDailyRepository.getByDate('2025-02-01'),
      statsDailyRepository.getByDate('2025-02-03'),
      statsDailyRepository.getByDate('2025-02-05'),
    ]);
    expect(checks.every(Boolean)).toBe(true);
  });
});

