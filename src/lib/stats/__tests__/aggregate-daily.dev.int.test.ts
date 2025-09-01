import { __setTestDB, getDB } from '@/lib/db';
import { sessionRepository } from '@/lib/repositories/session.repository';
import { statsDailyRepository } from '@/lib/repositories/stats_daily.repository';
import { aggregateDay, aggregateRange } from '@/lib/stats/aggregate-daily';

describe('aggregate-daily (Phase 2)', () => {
  beforeEach(() => {
    const make = (global as any).__makeDBName || ((ns: string) => `${ns}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    __setTestDB(make('AggDB'));
  });

  test('aggregateDay persists totals and subjects', async () => {
    const date = '2025-01-01';
    await sessionRepository.bulkAdd([
      { id: 's1', userId: 'u', timestamp: '2025-01-01T10:00:00.000Z', duration: 3600, pausedDuration: 600, points: 10, date, type: 'task', title: 'Math Algebra' } as any,
      { id: 's2', userId: 'u', timestamp: '2025-01-01T12:00:00.000Z', duration: 1800, pausedDuration: 0, points: 5, date, type: 'routine', title: 'Physics Practice' } as any,
    ] as any);

    const allSessions = await sessionRepository.getAll();
    expect(allSessions.length).toBe(2);
    const result = await aggregateDay(date);
    expect(result.totalSeconds).toBe(5400);
    expect(result.pausedSeconds).toBe(600);
    expect(result.points).toBe(15);
    expect(result.sessionsCount).toBe(2);
    expect(result.focusScore).toBeCloseTo(((5400-600)/5400)*100);

    const saved = await statsDailyRepository.getByDate(date) as any;
    expect(saved?.totalSeconds).toBe(5400);
    expect(saved?.subjects).toBeTruthy();
  });

  test('aggregateRange runs for each day in range', async () => {
    const d1 = '2025-01-01';
    const d2 = '2025-01-03';
    await sessionRepository.bulkAdd([
      { id: 'r1', userId: 'u', timestamp: '2025-01-01T08:00:00.000Z', duration: 600, points: 1, date: d1, type: 'task', title: 'Day1' } as any,
      { id: 'r2', userId: 'u', timestamp: '2025-01-03T08:00:00.000Z', duration: 1200, points: 2, date: d2, type: 'task', title: 'Day3' } as any,
    ] as any);
    await aggregateRange(d1, d2);
    const a1 = await statsDailyRepository.getByDate(d1);
    const a2 = await statsDailyRepository.getByDate('2025-01-02');
    const a3 = await statsDailyRepository.getByDate(d2);
    expect(a1).toBeTruthy();
    expect(a2).toBeTruthy(); // no sessions that day, but aggregateDay creates an entry
    expect(a3).toBeTruthy();
  });
});
