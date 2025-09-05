/** @jest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStats } from '@/hooks/use-stats';
import { activityRepository } from '@/lib/repositories';
import { MOCK_ACTIVITY_ATTEMPT_1 } from '@/lib/repositories/activity-repository.test';

const addLog = async (id: string, iso: string, durationSec = 600) => {
  await activityRepository.createAttempt({
    ...MOCK_ACTIVITY_ATTEMPT_1,
    id,
    events: [
      { type: 'START', timestamp: new Date(iso).getTime() },
      { type: 'COMPLETE', timestamp: new Date(iso).getTime() + durationSec * 1000 },
    ],
  });
};

describe('useStats study-day boundary', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it.each([
    ['before boundary', '2025-09-01T03:55:00Z', '2025-08-31'],
    ['after boundary',  '2025-09-01T04:05:00Z', '2025-09-01'],
  ])('daily stats align to study-day %s', async (_label, nowIso, expectedDay) => {
    jest.setSystemTime(new Date(nowIso));

    await act(async () => {
      // Seed a session at 03:58Z (belongs to previous study day)
      await addLog('B-1', '2025-09-01T03:58:00Z', 1200);
    });

    const selectedDate = new Date(nowIso);
    const { result } = renderHook(() => useStats({ timeRange: 'daily', selectedDate }));

    // Allow Dexie liveQuery to emit
    await (global as any).tick?.();

    await waitFor(() => {
      const stats = result.current.timeRangeStats;
      // For 03:55Z, selected study day is 2025-08-31 and includes the seeded 03:58Z session
      // For 04:05Z, selected study day is 2025-09-01, which excludes the 03:58Z session
      if (expectedDay === '2025-08-31') {
        expect(stats.completedCount).toBeGreaterThan(0);
      } else {
        expect(stats.completedCount).toBe(0);
      }
    });
  });
});

