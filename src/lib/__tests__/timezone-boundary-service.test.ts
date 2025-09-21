import { TimezoneBoundaryService } from '../timezone-boundary-service';

describe('TimezoneBoundaryService', () => {
  describe('IST_4AM boundary', () => {
    test('correctly handles 3:59 AM IST (previous day)', () => {
      // 3:59 AM IST = 10:29 PM UTC (previous day)
      // This should be in the Jan 14 study day (which started at Jan 13 22:30 UTC)
      // 10:29 PM UTC is BEFORE the 22:30 boundary, so it's still in Jan 14 study day
      const date = new Date('2024-01-14T22:29:00Z');
      const result = TimezoneBoundaryService.getStudyDayBoundary(date, 'IST_4AM');

      expect(result.isInStudyDay).toBe(true);
      expect(result.studyDateLabel).toBe('2024-01-14 [IST]');
    });

    test('correctly handles 4:00 AM IST (new day)', () => {
      // 4:00 AM IST = 10:30 PM UTC (previous day)
      // This is the start of the Jan 15 study day
      const date = new Date('2024-01-14T22:30:00Z');
      const result = TimezoneBoundaryService.getStudyDayBoundary(date, 'IST_4AM');

      expect(result.isInStudyDay).toBe(true);
      expect(result.studyDateLabel).toBe('2024-01-15 [IST]');
    });

    test('handles month boundary correctly', () => {
      // March 1, 3:59 AM IST = Feb 29, 10:29 PM UTC
      // This should be in the Feb 29 study day (which started at Feb 28 22:30 UTC)
      const date = new Date('2024-02-29T22:29:00Z');
      const result = TimezoneBoundaryService.getStudyDayBoundary(date, 'IST_4AM');

      expect(result.studyDateLabel).toBe('2024-02-29 [IST]');
    });

    test('handles year boundary correctly', () => {
      // Jan 1, 3:59 AM IST = Dec 31, 10:29 PM UTC
      // This should be in the Dec 31 study day (which started at Dec 30 22:30 UTC)
      const date = new Date('2023-12-31T22:29:00Z');
      const result = TimezoneBoundaryService.getStudyDayBoundary(date, 'IST_4AM');

      expect(result.studyDateLabel).toBe('2023-12-31 [IST]');
    });
  });

  describe('UTC_4AM boundary (Legacy)', () => {
    test('correctly handles 3:59 AM UTC (previous day)', () => {
      // This should be in the Jan 14 study day (which started at Jan 14 04:00 UTC)
      // 3:59 AM UTC is BEFORE the 4 AM boundary, so it's still in Jan 14 study day
      const date = new Date('2024-01-15T03:59:00Z');
      const result = TimezoneBoundaryService.getStudyDayBoundary(date, 'UTC_4AM');

      expect(result.isInStudyDay).toBe(true);
      expect(result.studyDateLabel).toBe('2024-01-14 [UTC]');
    });

    test('correctly handles 4:00 AM UTC (new day)', () => {
      const date = new Date('2024-01-15T04:00:00Z');
      const result = TimezoneBoundaryService.getStudyDayBoundary(date, 'UTC_4AM');

      expect(result.isInStudyDay).toBe(true);
      expect(result.studyDateLabel).toBe('2024-01-15 [UTC]');
    });
  });

  describe('Comparison between IST and UTC', () => {
    test('shows difference for same timestamp', () => {
      // 6 AM IST = 12:30 AM UTC (previous day)
      const date = new Date('2024-01-15T00:30:00Z');
      const istResult = TimezoneBoundaryService.getStudyDayBoundary(date, 'IST_4AM');
      const utcResult = TimezoneBoundaryService.getStudyDayBoundary(date, 'UTC_4AM');

      expect(istResult.studyDateLabel).toBe('2024-01-15 [IST]');
      expect(utcResult.studyDateLabel).toBe('2024-01-14 [UTC]');
      expect(istResult.dayStartUTC.getTime()).not.toBe(utcResult.dayStartUTC.getTime());
    });
  });
});