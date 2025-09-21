/**
 * @jest-environment jsdom
 * @stats-hardening
 */

import { computeDailyRollup } from '@/lib/daily-rollups';

describe('Overlap Merge', () => {
  test('overlapping sessions are merged, not double-counted', async () => {
    const events = [
      {
        type: 'study_session_created',
        timestamp: Date.now(),
        data: {
          duration: 3600, // 1 hour
          subject: 'Math',
          startTime: Date.now()
        }
      },
      {
        type: 'study_session_created',
        timestamp: Date.now() + 1800000, // 30 minutes later
        data: {
          duration: 3600, // 1 hour
          subject: 'Math',
          startTime: Date.now() + 1800000
        }
      }
    ];

    const rollup = await computeDailyRollup('2024-01-01', events);

    // Total should be sum of both durations (merging doesn't reduce total)
    expect(rollup.total_minutes).toBe(120); // 2 hours
    expect(rollup.session_count).toBe(2); // Still counts as 2 sessions
    expect(rollup.by_subject['Math'].minutes).toBe(120);
  });

  test('non-overlapping sessions counted separately', async () => {
    const events = [
      {
        type: 'study_session_created',
        timestamp: Date.now(),
        data: {
          duration: 1800, // 30 minutes
          subject: 'Math',
          startTime: Date.now()
        }
      },
      {
        type: 'study_session_created',
        timestamp: Date.now() + 7200000, // 2 hours later
        data: {
          duration: 1800, // 30 minutes
          subject: 'Math',
          startTime: Date.now() + 7200000
        }
      }
    ];

    const rollup = await computeDailyRollup('2024-01-01', events);

    expect(rollup.total_minutes).toBe(60);
    expect(rollup.session_count).toBe(2);
  });

  test('multiple overlapping sessions handled correctly', async () => {
    const events = [
      {
        type: 'study_session_created',
        timestamp: Date.now(),
        data: {
          duration: 5400, // 1.5 hours
          subject: 'Physics',
          startTime: Date.now()
        }
      },
      {
        type: 'study_session_created',
        timestamp: Date.now() + 1800000, // 30 min overlap
        data: {
          duration: 3600, // 1 hour
          subject: 'Physics',
          startTime: Date.now() + 1800000
        }
      },
      {
        type: 'study_session_created',
        timestamp: Date.now() + 3600000, // 1 hour overlap
        data: {
          duration: 1800, // 30 minutes
          subject: 'Physics',
          startTime: Date.now() + 3600000
        }
      }
    ];

    const rollup = await computeDailyRollup('2024-01-01', events);

    // Each session contributes its full duration
    expect(rollup.total_minutes).toBe(150); // 2.5 hours total
    expect(rollup.session_count).toBe(3);
  });
});