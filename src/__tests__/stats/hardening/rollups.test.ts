/**
 * @jest-environment jsdom
 * @stats-hardening
 */

import { createOrUpdateDailyRollup, computeDailyRollup, getDailyRollup } from '@/lib/daily-rollups';

// Mock IndexedDB
const mockDB = {
  get: jest.fn(),
  put: jest.fn(),
  add: jest.fn(),
  getAll: jest.fn()
};

jest.mock('idb', () => ({
  openDB: jest.fn(() => Promise.resolve(mockDB))
}));

describe('Write-time Rollup Materialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rollups updated on create', async () => {
    const events = [
      {
        type: 'study_session_created',
        timestamp: Date.now(),
        data: {
          duration: 3600,
          points: 60,
          subject: 'Math'
        }
      }
    ];

    await createOrUpdateDailyRollup(events);

    expect(mockDB.put).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket_day: expect.any(String),
        total_minutes: 60,
        total_points: 60,
        version: '2.0.0',
        is_complete: expect.any(Boolean)
      })
    );
  });

  test('rollup_version recorded with each update', async () => {
    const events = [
      {
        type: 'study_session_created',
        timestamp: Date.now(),
        data: { duration: 1800, points: 30 }
      }
    ];

    await createOrUpdateDailyRollup(events);

    expect(mockDB.put).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '2.0.0'
      })
    );
  });

  test('existing rollup updated, not replaced', async () => {
    mockDB.get.mockResolvedValueOnce({
      bucket_day: '2024-01-01',
      total_minutes: 60,
      version: '2.0.0'
    });

    const events = [
      {
        type: 'study_session_created',
        timestamp: Date.now(),
        data: { duration: 1800, points: 30 }
      }
    ];

    await createOrUpdateDailyRollup(events);

    expect(mockDB.put).toHaveBeenCalledWith(
      expect.objectContaining({
        total_minutes: 90, // 60 + 30
        version: '2.0.0'
      })
    );
  });
});

describe('Raw vs Rollup Parity', () => {
  test('rollup aggregates equal raw recompute within tolerance', () => {
    const events = [
      {
        type: 'study_session_created',
        timestamp: Date.now(),
        data: { duration: 3600, points: 60, subject: 'Math' }
      },
      {
        type: 'study_session_created',
        timestamp: Date.now() + 3600000,
        data: { duration: 1800, points: 30, subject: 'Physics' }
      }
    ];

    const rollup = computeDailyRollup('2024-01-01', events);

    // Raw computation
    const rawTotal = events.reduce((sum, e) => sum + e.data.duration, 0) / 60;

    // Should be within 0.5% tolerance
    const diff = Math.abs(rollup.total_minutes - rawTotal);
    const tolerance = rawTotal * 0.005;

    expect(diff).toBeLessThanOrEqual(tolerance);
  });

  test('large dataset maintains parity', () => {
    const events = Array.from({ length: 100 }, (_, i) => ({
      type: 'study_session_created' as const,
      timestamp: Date.now() + i * 60000,
      data: {
        duration: Math.floor(Math.random() * 3600) + 600, // 10-70 minutes
        points: 0,
        subject: ['Math', 'Physics', 'Chemistry'][Math.floor(Math.random() * 3)]
      }
    }));

    const rollup = computeDailyRollup('2024-01-01', events);

    const rawTotal = events.reduce((sum, e) => sum + e.data.duration, 0) / 60;
    const rollupTotal = rollup.total_minutes;

    // Within 1% tolerance for large datasets
    const diff = Math.abs(rollupTotal - rawTotal);
    const tolerance = rawTotal * 0.01;

    expect(diff).toBeLessThanOrEqual(tolerance);
  });

  test('by_subject aggregation matches manual calculation', () => {
    const events = [
      {
        type: 'study_session_created',
        timestamp: Date.now(),
        data: { duration: 3600, subject: 'Math' }
      },
      {
        type: 'study_session_created',
        timestamp: Date.now() + 1800000,
        data: { duration: 1800, subject: 'Math' }
      },
      {
        type: 'study_session_created',
        timestamp: Date.now() + 3600000,
        data: { duration: 2400, subject: 'Physics' }
      }
    ];

    const rollup = computeDailyRollup('2024-01-01', events);

    // Manual calculation
    const expectedMath = (3600 + 1800) / 60;
    const expectedPhysics = 2400 / 60;

    expect(rollup.by_subject['Math'].minutes).toBe(expectedMath);
    expect(rollup.by_subject['Physics'].minutes).toBe(expectedPhysics);
  });
});