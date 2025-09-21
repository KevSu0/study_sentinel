/**
 * @jest-environment jsdom
 * @stats-hardening
 */

import { filterWorkByTimeRange } from '@/workers/stats.worker';
import { subDays, startOfDay } from 'date-fns';

describe('Rolling Windows', () => {
  const mockWork = [
    { date: '2024-01-01', duration: 3600 },
    { date: '2024-01-02', duration: 1800 },
    { date: '2024-01-07', duration: 7200 },
    { date: '2024-01-08', duration: 5400 },
  ];

  test('daily view includes only selected date', () => {
    const selectedDate = '2024-01-02';
    const result = filterWorkByTimeRange(mockWork, 'daily', selectedDate);

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe(selectedDate);
  });

  test('weekly view includes last 7 days including today', () => {
    const result = filterWorkByTimeRange(mockWork, 'weekly');

    expect(result).toHaveLength(2); // Only Jan 1 and Jan 2 are within last 7 days from test setup
  });

  test('monthly view includes last 30 days', () => {
    const result = filterWorkByTimeRange(mockWork, 'monthly');

    expect(result).toHaveLength(4); // All test data within 30 days
  });

  test('overall view includes all data', () => {
    const result = filterWorkByTimeRange(mockWork, 'overall');

    expect(result).toHaveLength(4);
  });

  test('partial day allowed in daily view', () => {
    const todayWork = [
      { date: new Date().toISOString().split('T')[0], duration: 1800 }
    ];

    const result = filterWorkByTimeRange(todayWork, 'daily');

    expect(result).toHaveLength(1);
  });

  test('time range filters respect boundaries correctly', () => {
    const oldWork = { date: '2023-12-01', duration: 3600 };
    const recentWork = [...mockWork, oldWork];

    const weeklyResult = filterWorkByTimeRange(recentWork, 'weekly');
    expect(weeklyResult).not.toContain(oldWork);
  });
});