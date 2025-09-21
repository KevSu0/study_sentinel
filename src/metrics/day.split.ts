// src/metrics/day.split.ts

import { DAY_CUT_HOUR, DAY_CUT_MINUTE } from '../domain/time.constants';

export interface DaySegment {
  date: string; // YYYY-MM-DD
  totalMs: number;
  pauseMs: number;
}

/**
 * Get the day cut time for a given date (04:00 IST)
 */
export function getDayCut(date: Date): Date {
  const cut = new Date(date);
  cut.setHours(DAY_CUT_HOUR, DAY_CUT_MINUTE, 0, 0);
  return cut;
}

/**
 * Split a session across day boundaries at 04:00 IST
 */
export function splitSessionByDay(
  sessionStart: number,
  sessionEnd: number,
  totalPauseMs: number
): DaySegment[] {
  const segments: DaySegment[] = [];

  if (sessionStart >= sessionEnd) {
    return segments; // Invalid session
  }

  const startDate = new Date(sessionStart);
  const endDate = new Date(sessionEnd);

  // Get first day cut after or at session start
  let currentCut = getDayCut(startDate);
  if (startDate > currentCut) {
    currentCut.setDate(currentCut.getDate() + 1);
  }

  // Get all day cuts within the session
  const dayCuts: Date[] = [];
  let tempCut = new Date(currentCut);
  while (tempCut < endDate) {
    dayCuts.push(new Date(tempCut));
    tempCut.setDate(tempCut.getDate() + 1);
  }

  // If no day cuts in between, single segment
  if (dayCuts.length === 0) {
    segments.push({
      date: formatDateForSegment(startDate),
      totalMs: sessionEnd - sessionStart,
      pauseMs: totalPauseMs,
    });
    return segments;
  }

  // Split at each day cut
  let segmentStart = sessionStart;
  let remainingPause = totalPauseMs;

  for (let i = 0; i <= dayCuts.length; i++) {
    const segmentEnd = i < dayCuts.length ? dayCuts[i].getTime() : sessionEnd;

    if (segmentEnd <= segmentStart) {
      continue; // Skip zero-length segments
    }

    const segmentTotal = segmentEnd - segmentStart;
    const sessionTotal = sessionEnd - sessionStart;
    const proportion = sessionTotal > 0 ? segmentTotal / sessionTotal : 0;

    // Calculate pause for this segment
    let segmentPause = Math.round(proportion * totalPauseMs);

    // For last segment, adjust to ensure exact total
    if (i === dayCuts.length) {
      segmentPause = remainingPause;
    }

    remainingPause -= segmentPause;

    // Determine which day this segment belongs to
    const segmentDate = new Date(segmentStart);
    if (segmentStart >= getDayCut(segmentDate).getTime()) {
      // After cut, belongs to current day
      segments.push({
        date: formatDateForSegment(segmentDate),
        totalMs: segmentTotal,
        pauseMs: segmentPause,
      });
    } else {
      // Before cut, belongs to previous day
      const prevDate = new Date(segmentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      segments.push({
        date: formatDateForSegment(prevDate),
        totalMs: segmentTotal,
        pauseMs: segmentPause,
      });
    }

    segmentStart = segmentEnd;
  }

  return segments;
}

/**
 * Format date as YYYY-MM-DD for segment
 */
function formatDateForSegment(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate day split invariants
 */
export function validateDaySplit(
  segments: DaySegment[],
  originalTotal: number,
  originalPause: number
): boolean {
  const sumTotal = segments.reduce((sum, seg) => sum + seg.totalMs, 0);
  const sumPause = segments.reduce((sum, seg) => sum + seg.pauseMs, 0);

  // Check totals match (allow 1ms rounding)
  if (Math.abs(sumTotal - originalTotal) > 1) {
    return false;
  }

  // Check pause totals match (allow 1ms rounding)
  if (Math.abs(sumPause - originalPause) > 1) {
    return false;
  }

  // Check each segment has valid pause
  for (const segment of segments) {
    if (segment.pauseMs > segment.totalMs) {
      return false;
    }
  }

  return true;
}

/**
 * Get date key for storage (YYYY-MM-DD)
 */
export function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const cut = getDayCut(date);

  // If timestamp is before cut, use previous day
  if (timestamp < cut.getTime()) {
    date.setDate(date.getDate() - 1);
  }

  return formatDateForSegment(date);
}