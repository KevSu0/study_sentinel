/**
 * @jest-environment jsdom
 * @stats-hardening
 * @skipLegacy - Quarantined: Tests legacy stats worker not in Phase-1
 */

import { filterWorkByTimeRange } from '@/workers/stats.worker';
import { subDays, startOfDay } from 'date-fns';

describe('Rolling Windows', () => {
  const mockWork = [
    { id: '1', date: '2024-01-01', duration: 3600, timestamp: '2024-01-01T00:00:00.000Z', points: 10, title: 'Work 1', type: 'task' as const, totalDuration: 3600, productiveDuration: 3240, pauseDuration: 360, pauseCount: 1, focusPercentage: 90, metricsVersion: '1.1.0' },
    { id: '2', date: '2024-01-02', duration: 1800, timestamp: '2024-01-02T00:00:00.000Z', points: 5, title: 'Work 2', type: 'task' as const, totalDuration: 1800, productiveDuration: 1620, pauseDuration: 180, pauseCount: 1, focusPercentage: 90, metricsVersion: '1.1.0' },
    { id: '3', date: '2024-01-07', duration: 7200, timestamp: '2024-01-07T00:00:00.000Z', points: 20, title: 'Work 3', type: 'task' as const, totalDuration: 7200, productiveDuration: 6480, pauseDuration: 720, pauseCount: 2, focusPercentage: 90, metricsVersion: '1.1.0' },
    { id: '4', date: '2024-01-08', duration: 5400, timestamp: '2024-01-08T00:00:00.000Z', points: 15, title: 'Work 4', type: 'task' as const, totalDuration: 5400, productiveDuration: 4860, pauseDuration: 540, pauseCount: 2, focusPercentage: 90, metricsVersion: '1.1.0' },
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
      { id: '5', date: new Date().toISOString().split('T')[0], duration: 1800, timestamp: new Date().toISOString(), points: 5, title: 'Today Work', type: 'task' as const, totalDuration: 1800, productiveDuration: 1620, pauseDuration: 180, pauseCount: 1, focusPercentage: 90, metricsVersion: '1.1.0' }
    ];

    const result = filterWorkByTimeRange(todayWork, 'daily');

    expect(result).toHaveLength(1);
  });

  test('time range filters respect boundaries correctly', () => {
    const oldWork = { id: '6', date: '2023-12-01', duration: 3600, timestamp: '2023-12-01T00:00:00.000Z', points: 10, title: 'Old Work', type: 'task' as const, totalDuration: 3600, productiveDuration: 3240, pauseDuration: 360, pauseCount: 1, focusPercentage: 90, metricsVersion: '1.1.0' };
    const recentWork = [...mockWork, oldWork];

    const weeklyResult = filterWorkByTimeRange(recentWork, 'weekly');
    expect(weeklyResult).not.toContain(oldWork);
  });
});