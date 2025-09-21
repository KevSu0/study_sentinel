import { useState, useEffect } from 'react';
import { TimezoneBoundaryService, TimeZoneRule, BoundaryServiceResult } from '@/lib/timezone-boundary-service';
import { timezoneTelemetry } from '@/lib/telemetry';

interface ComparisonResult {
  newResult: BoundaryServiceResult;
  legacyResult: BoundaryServiceResult;
  hasDifference: boolean;
}

export function useTimezoneComparison(timestamp?: Date) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [viewMode, setViewMode] = useState<'new' | 'legacy'>('new');

  useEffect(() => {
    const newResult = TimezoneBoundaryService.getStudyDayBoundary(timestamp, 'IST_4AM');
    const legacyResult = TimezoneBoundaryService.getStudyDayBoundary(timestamp, 'UTC_4AM');

    const hasDifference =
      newResult.studyDateLabel !== legacyResult.studyDateLabel ||
      newResult.dayStartUTC.getTime() !== legacyResult.dayStartUTC.getTime();

    setComparison({
      newResult,
      legacyResult,
      hasDifference
    });

    // Log differences for monitoring (no PII)
    if (hasDifference) {
      // Determine time of day category (non-PII)
      const hour = timestamp ? timestamp.getUTCHours() : 0;
      const timeOfDayCategory =
        hour >= 0 && hour < 6 ? 'early_morning' :
        hour >= 6 && hour < 12 ? 'morning' :
        hour >= 12 && hour < 17 ? 'afternoon' :
        hour >= 17 && hour < 22 ? 'evening' : 'night';

      timezoneTelemetry.logBoundaryDifference({
        hasDifference,
        boundary_type: 'session',
        timeOfDayCategory
      });
    }
  }, [timestamp]);

  return {
    comparison,
    viewMode,
    setViewMode,
    activeResult: comparison ? (viewMode === 'new' ? comparison.newResult : comparison.legacyResult) : null
  };
}