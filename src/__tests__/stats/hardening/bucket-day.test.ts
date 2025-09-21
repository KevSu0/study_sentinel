/**
 * @jest-environment jsdom
 * @stats-hardening
 */

import { getBucketDay } from '@/lib/daily-rollups';
import { format, addHours } from 'date-fns';

describe('Bucket Day Correctness (IST 04:00)', () => {
  test('events before 04:00 IST bucket to previous day', () => {
    // Event at 03:30 IST
    const eventTime = new Date('2024-01-02T03:30:00+05:30');
    const bucketDay = getBucketDay(eventTime);

    expect(bucketDay).toBe('2024-01-01');
  });

  test('events at or after 04:00 IST bucket to current day', () => {
    // Event at 04:30 IST
    const eventTime = new Date('2024-01-02T04:30:00+05:30');
    const bucketDay = getBucketDay(eventTime);

    expect(bucketDay).toBe('2024-01-02');
  });

  test('exactly 04:00 IST buckets to current day', () => {
    // Event exactly at 04:00 IST
    const eventTime = new Date('2024-01-02T04:00:00+05:30');
    const bucketDay = getBucketDay(eventTime);

    expect(bucketDay).toBe('2024-01-02');
  });

  test('edits preserve bucket_day', () => {
    const originalTime = new Date('2024-01-02T10:00:00+05:30');
    const originalBucket = getBucketDay(originalTime);

    // Edit to later time same day
    const editedTime = new Date('2024-01-02T15:00:00+05:30');
    const editedBucket = getBucketDay(editedTime);

    expect(editedBucket).toBe(originalBucket);
  });

  test('跨日边界事件正确分桶', () => {
    // Event spanning midnight but before 04:00
    const startTime = new Date('2024-01-02T03:00:00+05:30');
    const endTime = new Date('2024-01-02T05:00:00+05:30');

    // Should bucket based on start time
    const bucketDay = getBucketDay(startTime);
    expect(bucketDay).toBe('2024-01-01');
  });
});