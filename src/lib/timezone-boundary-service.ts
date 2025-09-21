import { format, toDate } from 'date-fns-tz';

export type TimeZoneRule = 'UTC_4AM' | 'IST_4AM';
export type BoundaryServiceResult = {
  dayStartUTC: Date;
  dayEndUTC: Date;
  isInStudyDay: boolean;
  studyDateLabel: string;
  tz_rule_version: number;
};

const TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_HOURS = 5.5;
const BOUNDARY_HOUR = 4; // 4 AM

export class TimezoneBoundaryService {
  static getStudyDayBoundary(
    timestamp: Date = new Date(),
    rule: TimeZoneRule = 'IST_4AM'
  ): BoundaryServiceResult {
    const date = new Date(timestamp);

    if (rule === 'IST_4AM') {
      // 4 AM IST = 22:30 UTC (previous day)
      const IST_4AM_UTC_HOURS = 22;
      const IST_4AM_UTC_MINUTES = 30;

      // Get current UTC time
      const utcHours = date.getUTCHours();
      const utcMinutes = date.getUTCMinutes();

      // Calculate which day's boundary we're in
      let boundaryDate = new Date(date);

      // If current UTC time is before 22:30, we use previous day's boundary
      if (utcHours < IST_4AM_UTC_HOURS ||
          (utcHours === IST_4AM_UTC_HOURS && utcMinutes < IST_4AM_UTC_MINUTES)) {
        boundaryDate.setUTCDate(boundaryDate.getUTCDate() - 1);
      }

      // Set boundary start to 22:30 UTC
      const dayStartUTC = new Date(boundaryDate);
      dayStartUTC.setUTCHours(IST_4AM_UTC_HOURS, IST_4AM_UTC_MINUTES, 0, 0);

      const dayEndUTC = new Date(dayStartUTC);
      dayEndUTC.setUTCDate(dayEndUTC.getUTCDate() + 1);

      // For label, convert the boundary start UTC time to IST date
      // The boundary starts at 22:30 UTC, which is 4:00 AM IST the next calendar day
      const labelDate = new Date(dayStartUTC.getTime() + (IST_OFFSET_HOURS * 3600000));
      const studyDateLabel = format(labelDate, 'yyyy-MM-dd') + ' [IST]';

      return {
        dayStartUTC,
        dayEndUTC,
        isInStudyDay: date >= dayStartUTC && date < dayEndUTC,
        studyDateLabel,
        tz_rule_version: 2
      };
    } else {
      // Legacy UTC 4 AM boundary
      const utcHours = date.getUTCHours();
      let boundaryDate = new Date(date);

      // If current UTC time is before 4:00, we use previous day's boundary
      if (utcHours < BOUNDARY_HOUR) {
        boundaryDate.setUTCDate(boundaryDate.getUTCDate() - 1);
      }

      // Set boundary start to 4:00 UTC
      const dayStartUTC = new Date(boundaryDate);
      dayStartUTC.setUTCHours(BOUNDARY_HOUR, 0, 0, 0);

      const dayEndUTC = new Date(dayStartUTC);
      dayEndUTC.setUTCDate(dayEndUTC.getUTCDate() + 1);

      const studyDateLabel = format(dayStartUTC, 'yyyy-MM-dd') + ' [UTC]';

      return {
        dayStartUTC,
        dayEndUTC,
        isInStudyDay: date >= dayStartUTC && date < dayEndUTC,
        studyDateLabel,
        tz_rule_version: 1
      };
    }
  }

  static formatInIST(date: Date, formatStr?: string): string {
    return format(date, formatStr || 'yyyy-MM-dd HH:mm:ss', { timeZone: TIMEZONE });
  }

  // Public methods for backward compatibility
  static getISTBoundary(date: Date): BoundaryServiceResult {
    return TimezoneBoundaryService.getStudyDayBoundary(date, 'IST_4AM');
  }

  static getLegacyBoundary(date: Date): BoundaryServiceResult {
    return TimezoneBoundaryService.getStudyDayBoundary(date, 'UTC_4AM');
  }

  static toIST(date: Date): Date {
    return toDate(date, { timeZone: TIMEZONE });
  }
}