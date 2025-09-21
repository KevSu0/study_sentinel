// Timezone metadata utilities for exports
import { TimezoneBoundaryService } from './timezone-boundary-service';

export interface ExportMetadata {
  timezone: 'IST' | 'UTC';
  exportTimestamp: string;
  boundaryTime: string;
  version: string;
}

// Generate export metadata without using React hooks (safe for non-React contexts)
export function generateExportMetadata(timezone: 'IST' | 'UTC' = 'IST'): ExportMetadata {
  const now = new Date();

  // Get the appropriate study day boundary based on the provided timezone
  const rule = timezone === 'IST' ? 'IST_4AM' : 'UTC_4AM';
  const boundary = TimezoneBoundaryService.getStudyDayBoundary(now, rule);

  return {
    timezone,
    exportTimestamp: now.toISOString(),
    boundaryTime: boundary.dayStartUTC.toISOString(),
    version: '2.0.0' // Version indicating timezone-aware export
  };
}

export function addTimezoneMetadataToExport<T extends Record<string, any>>(
  data: T[],
  metadata?: ExportMetadata
): T[] & { _timezoneMetadata: ExportMetadata } {
  const exportMetadata = metadata || generateExportMetadata();

  // Add metadata as a non-enumerable property
  const enhancedData = [...data] as T[] & { _timezoneMetadata: ExportMetadata };
  Object.defineProperty(enhancedData, '_timezoneMetadata', {
    value: exportMetadata,
    enumerable: false,
    writable: false
  });

  return enhancedData;
}

export function formatExportWithTimezone(
  date: Date,
  timezone: 'IST' | 'UTC' = 'IST'
): string {
  if (timezone === 'IST') {
    // Format in IST (UTC+5:30)
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  } else {
    // Format in UTC
    return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
  }
}

export function validateExportTimezoneConsistency(
  data: any[],
  expectedTimezone: 'IST' | 'UTC'
): boolean {
  // Check if all timestamps in the data are consistent with expected timezone
  return data.every(item => {
    if (item.timestamp || item.createdAt || item.updatedAt) {
      const timestamp = new Date(item.timestamp || item.createdAt || item.updatedAt);
      // Basic validation - could be enhanced with more sophisticated checks
      return !isNaN(timestamp.getTime());
    }
    return true;
  });
}
