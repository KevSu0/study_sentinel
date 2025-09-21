import { TimezoneBoundaryService } from './timezone-boundary-service';
import { format, toDate } from 'date-fns-tz';

// Configuration for date formatting
const DATE_FORMATTING_CONFIG = {
  timezone: 'Asia/Kolkata',
  showTimezone: true, // Show IST during transition period
  locale: 'en-IN'
} as const;

/**
 * Format a date with timezone awareness
 * @param date Date to format
 * @param formatStr Optional format string
 * @param options Formatting options
 */
// Alias for backward compatibility
export const formatWithTimezone = formatDateWithTimezone;

export function formatDateWithTimezone(
  date: Date,
  formatStr?: string,
  options: { showTimezone?: boolean; useBoundary?: boolean } = {}
): string {
  const { showTimezone = DATE_FORMATTING_CONFIG.showTimezone, useBoundary = false } = options;

  if (useBoundary) {
    // Use Boundary Service for study date formatting
    const boundary = TimezoneBoundaryService.getStudyDayBoundary(date);
    return boundary.studyDateLabel;
  }

  // Regular date formatting
  const formatted = format(
    date,
    formatStr || 'PPp',
    { timeZone: DATE_FORMATTING_CONFIG.timezone }
  );

  // Add timezone suffix if needed
  if (showTimezone && !formatStr?.includes('z')) {
    return `${formatted} (IST)`;
  }

  return formatted;
}

/**
 * Format time with timezone
 * @param date Date to format
 * @param options Formatting options
 */
export function formatTimeWithTimezone(
  date: Date,
  options: { showSeconds?: boolean; showTimezone?: boolean } = {}
): string {
  const { showSeconds = false, showTimezone = DATE_FORMATTING_CONFIG.showTimezone } = options;

  const formatStr = showSeconds ? 'HH:mm:ss' : 'HH:mm';
  const formatted = format(
    date,
    formatStr,
    { timeZone: DATE_FORMATTING_CONFIG.timezone }
  );

  if (showTimezone) {
    return `${formatted} IST`;
  }

  return formatted;
}

/**
 * Format date range with timezone
 * @param startDate Start date
 * @param endDate End date
 * @param options Formatting options
 */
export function formatDateRangeWithTimezone(
  startDate: Date,
  endDate: Date,
  options: { showTimezone?: boolean; compact?: boolean } = {}
): string {
  const { showTimezone = DATE_FORMATTING_CONFIG.showTimezone, compact = false } = options;

  if (compact) {
    const start = formatDateWithTimezone(startDate, 'MMM d', { showTimezone: false });
    const end = formatDateWithTimezone(endDate, 'MMM d, yyyy', { showTimezone: false });
    return `${start} - ${end}${showTimezone ? ' IST' : ''}`;
  }

  const start = formatDateWithTimezone(startDate, 'PP', { showTimezone: false });
  const end = formatDateWithTimezone(endDate, 'PP', { showTimezone: false });
  return `${start} - ${end}${showTimezone ? ' (IST)' : ''}`;
}

/**
 * Get study day label for a date
 * @param date Date to get study day for
 */
export function getStudyDayLabel(date: Date): string {
  const boundary = TimezoneBoundaryService.getStudyDayBoundary(date);
  return boundary.studyDateLabel;
}

/**
 * Format duration in human-readable format
 * @param milliseconds Duration in milliseconds
 */
export function formatDurationWithTimezone(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Check if date is within study day boundary
 * @param date Date to check
 */
export function isInStudyDay(date: Date): boolean {
  const boundary = TimezoneBoundaryService.getStudyDayBoundary(date);
  return boundary.isInStudyDay;
}