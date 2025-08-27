import {
  generateShortId,
  getSessionDate,
  getStudyDateForTimestamp,
  getStudyDay,
  getTimeSinceStudyDayStart,
  formatDuration,
  cn,
} from '../utils';

describe('cn', () => {
  it('should merge class names correctly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', { 'is-active': true, 'is-disabled': false })).toBe('base is-active');
  });
});

describe('generateShortId', () => {
  it('should generate a short ID with the correct prefix', () => {
    const id = generateShortId('T');
    expect(id).toMatch(/^T-[A-Z0-9]{4}$/);
  });
});

describe('Date-based Utility Functions', () => {
  // Mock Date
  const mockDate = (date: Date) => {
    jest.spyOn(global, 'Date').mockImplementation(() => date);
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getSessionDate', () => {
    it('should return the same day if the time is 4 AM or later', () => {
      mockDate(new Date('2023-01-01T04:00:00.000Z'));
      const sessionDate = getSessionDate();
      expect(sessionDate.toISOString().split('T')[0]).toBe('2023-01-01');
    });

    it('should return the previous day if the time is before 4 AM', () => {
      mockDate(new Date('2023-01-01T03:59:59.000Z'));
      const sessionDate = getSessionDate();
      expect(sessionDate.toISOString().split('T')[0]).toBe('2022-12-31');
    });
  });

  describe('getStudyDateForTimestamp', () => {
    it('should return the same day for a timestamp at 4 AM or later', () => {
      const timestamp = '2023-01-01T04:00:00.000Z';
      const studyDate = getStudyDateForTimestamp(timestamp);
      expect(studyDate.toISOString().split('T')[0]).toBe('2023-01-01');
    });

    it('should return the previous day for a timestamp before 4 AM', () => {
      const timestamp = '2023-01-01T03:59:59.000Z';
      const studyDate = getStudyDateForTimestamp(timestamp);
      expect(studyDate.toISOString().split('T')[0]).toBe('2022-12-31');
    });
  });

  describe('getStudyDay', () => {
    it('should return the same day if the date is 4 AM or later', () => {
      const date = new Date('2023-01-01T04:00:00.000Z');
      const studyDay = getStudyDay(date);
      expect(studyDay.toISOString().split('T')[0]).toBe('2023-01-01');
    });

    it('should return the previous day if the date is before 4 AM', () => {
      const date = new Date('2023-01-01T03:59:59.000Z');
      const studyDay = getStudyDay(date);
      expect(studyDay.toISOString().split('T')[0]).toBe('2022-12-31');
    });
  });

  describe('getTimeSinceStudyDayStart', () => {
    it('should return null if timestamp is null', () => {
      expect(getTimeSinceStudyDayStart(null)).toBeNull();
    });

    it('should calculate time since 4 AM of the same day', () => {
      const timestamp = new Date('2023-01-01T05:00:00.000Z').getTime();
      // 1 hour in milliseconds
      expect(getTimeSinceStudyDayStart(timestamp)).toBe(3600000);
    });

    it('should calculate time since 4 AM of the previous day', () => {
      const timestamp = new Date('2023-01-01T03:00:00.000Z').getTime();
      // 23 hours in milliseconds
      expect(getTimeSinceStudyDayStart(timestamp)).toBe(23 * 3600000);
    });
  });
});

describe('formatDuration', () => {
  it('should return "0s" for negative seconds', () => {
    expect(formatDuration(-10)).toBe('0s');
  });

  it('should format seconds only', () => {
    expect(formatDuration(30)).toBe('30s');
  });

  it('should format minutes only', () => {
    expect(formatDuration(120)).toBe('2m');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(150)).toBe('2m 30s');
  });

  it('should format hours only', () => {
    expect(formatDuration(3600)).toBe('1h');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(3900)).toBe('1h 5m');
  });
});