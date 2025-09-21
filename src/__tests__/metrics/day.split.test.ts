// src/__tests__/metrics/day.split.test.ts

import {
  splitSessionByDay,
  getDayCut,
  getDateKey,
  validateDaySplit,
} from '../../metrics/day.split';

describe('Day Split', () => {
  describe('getDayCut', () => {
    it('returns day cut at 04:00', () => {
      const date = new Date('2024-01-15T12:00:00');
      const cut = getDayCut(date);

      expect(cut.getHours()).toBe(4);
      expect(cut.getMinutes()).toBe(0);
      expect(cut.getSeconds()).toBe(0);
      expect(cut.getMilliseconds()).toBe(0);
      expect(cut.getDate()).toBe(15);
    });
  });

  describe('splitSessionByDay', () => {
    it('handles session within single day', () => {
      const start = new Date('2024-01-15T10:00:00').getTime();
      const end = new Date('2024-01-15T12:00:00').getTime();
      const pauseMs = 600000; // 10 minutes

      const segments = splitSessionByDay(start, end, pauseMs);

      expect(segments).toHaveLength(1);
      expect(segments[0].date).toBe('2024-01-15');
      expect(segments[0].totalMs).toBe(7200000); // 2 hours
      expect(segments[0].pauseMs).toBe(600000);
    });

    it('splits session crossing day boundary at 04:00', () => {
      const start = new Date('2024-01-15T23:30:00').getTime();
      const end = new Date('2024-01-16T04:30:00').getTime();
      const pauseMs = 1800000; // 30 minutes

      const segments = splitSessionByDay(start, end, pauseMs);

      expect(segments).toHaveLength(2);

      // First segment: 23:30-04:00 (4.5 hours on 15th)
      expect(segments[0].date).toBe('2024-01-15');
      expect(segments[0].totalMs).toBe(16200000); // 4.5 hours

      // Second segment: 04:00-04:30 (30 minutes on 16th)
      expect(segments[1].date).toBe('2024-01-16');
      expect(segments[1].totalMs).toBe(1800000); // 30 minutes

      // Total should match
      const totalMs = segments.reduce((sum, seg) => sum + seg.totalMs, 0);
      expect(totalMs).toBe(5 * 60 * 60 * 1000); // 5 hours
    });

    it('handles session starting before 04:00', () => {
      const start = new Date('2024-01-15T03:00:00').getTime();
      const end = new Date('2024-01-15T05:00:00').getTime();
      const pauseMs = 600000;

      const segments = splitSessionByDay(start, end, pauseMs);

      expect(segments).toHaveLength(2);
      expect(segments[0].date).toBe('2024-01-14'); // Before cut
      expect(segments[1].date).toBe('2024-01-15'); // After cut
    });

    it('proportionally distributes pause time', () => {
      const start = new Date('2024-01-15T22:00:00').getTime();
      const end = new Date('2024-01-16T06:00:00').getTime();
      const pauseMs = 3600000; // 1 hour

      const segments = splitSessionByDay(start, end, pauseMs);

      expect(segments).toHaveLength(2);

      // First segment: 6 hours out of 8 total = 75%
      expect(segments[0].totalMs).toBe(6 * 60 * 60 * 1000);
      expect(segments[0].pauseMs).toBe(2700000); // 45 minutes

      // Second segment: 2 hours out of 8 total = 25%
      expect(segments[1].totalMs).toBe(2 * 60 * 60 * 1000);
      expect(segments[1].pauseMs).toBe(900000); // 15 minutes
    });

    it('handles session exactly at day boundary', () => {
      const start = new Date('2024-01-15T04:00:00').getTime();
      const end = new Date('2024-01-16T04:00:00').getTime();
      const pauseMs = 0;

      const segments = splitSessionByDay(start, end, pauseMs);

      expect(segments).toHaveLength(1);
      expect(segments[0].date).toBe('2024-01-15');
      expect(segments[0].totalMs).toBe(24 * 60 * 60 * 1000); // 24 hours
    });

    it('handles zero-length session', () => {
      const start = new Date('2024-01-15T10:00:00').getTime();
      const end = start;
      const pauseMs = 0;

      const segments = splitSessionByDay(start, end, pauseMs);

      expect(segments).toHaveLength(0);
    });
  });

  describe('getDateKey', () => {
    it('returns correct date key before 04:00', () => {
      const timestamp = new Date('2024-01-15T03:59:59').getTime();
      const dateKey = getDateKey(timestamp);

      expect(dateKey).toBe('2024-01-14'); // Previous day
    });

    it('returns correct date key at 04:00', () => {
      const timestamp = new Date('2024-01-15T04:00:00').getTime();
      const dateKey = getDateKey(timestamp);

      expect(dateKey).toBe('2024-01-15');
    });

    it('returns correct date key after 04:00', () => {
      const timestamp = new Date('2024-01-15T12:00:00').getTime();
      const dateKey = getDateKey(timestamp);

      expect(dateKey).toBe('2024-01-15');
    });
  });

  describe('validateDaySplit', () => {
    it('passes validation for correct split', () => {
      const segments = [
        { date: '2024-01-15', totalMs: 1800000, pauseMs: 300000 },
        { date: '2024-01-16', totalMs: 1800000, pauseMs: 300000 },
      ];

      const isValid = validateDaySplit(segments, 3600000, 600000);
      expect(isValid).toBe(true);
    });

    it('fails when totals don\'t match', () => {
      const segments = [
        { date: '2024-01-15', totalMs: 1800000, pauseMs: 300000 },
        { date: '2024-01-16', totalMs: 1800000, pauseMs: 300000 },
      ];

      const isValid = validateDaySplit(segments, 4000000, 600000);
      expect(isValid).toBe(false);
    });

    it('fails when pause totals don\'t match', () => {
      const segments = [
        { date: '2024-01-15', totalMs: 1800000, pauseMs: 300000 },
        { date: '2024-01-16', totalMs: 1800000, pauseMs: 300000 },
      ];

      const isValid = validateDaySplit(segments, 3600000, 700000);
      expect(isValid).toBe(false);
    });

    it('fails when segment pause exceeds total', () => {
      const segments = [
        { date: '2024-01-15', totalMs: 1800000, pauseMs: 2000000 },
        { date: '2024-01-16', totalMs: 1800000, pauseMs: 300000 },
      ];

      const isValid = validateDaySplit(segments, 3600000, 600000);
      expect(isValid).toBe(false);
    });
  });
});