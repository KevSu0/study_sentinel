// src/lib/invariants.ts
/**
 * Runtime invariant checks for development mode
 * These checks validate data integrity according to Phase-1 contracts
 */

export function validateSessionMetrics(session: {
  totalMs: number;
  pauseMs: number;
  productiveMs?: number;
  focusPct: number;
}): void {
  if (process.env.NODE_ENV !== 'development') return;

  const { totalMs, pauseMs, productiveMs, focusPct } = session;

  // Check non-negative values
  invariant(totalMs >= 0, 'totalMs must be >= 0, got', totalMs);
  invariant(pauseMs >= 0, 'pauseMs must be >= 0, got', pauseMs);
  if (productiveMs !== undefined) {
    invariant(productiveMs >= 0, 'productiveMs must be >= 0, got', productiveMs);
  }

  // Check time relationships
  invariant(pauseMs <= totalMs, 'pauseMs cannot exceed totalMs', { pauseMs, totalMs });

  if (productiveMs !== undefined) {
    invariant(
      productiveMs <= totalMs,
      'productiveMs cannot exceed totalMs',
      { productiveMs, totalMs }
    );

    // Check that productive + pause ≈ total (allowing for rounding)
    const calculatedProductive = totalMs - pauseMs;
    const diff = Math.abs((productiveMs || 0) - calculatedProductive);
    invariant(
      diff <= 1, // Allow 1ms rounding error
      'productiveMs + pauseMs should equal totalMs',
      { productiveMs: productiveMs || 0, pauseMs, totalMs, diff }
    );
  }

  // Check percentage bounds
  invariant(focusPct >= 0 && focusPct <= 100, 'focusPct must be between 0 and 100', focusPct);

  // Check focus percentage precision
  const decimalPlaces = focusPct.toString().split('.')[1]?.length || 0;
  invariant(
    decimalPlaces <= 1,
    'focusPct should have at most 1 decimal place',
    { focusPct, decimalPlaces }
  );
}

export function validateSessionConstraints(session: {
  totalMs: number;
  pauseCount: number;
  isShortSession: boolean;
}): void {
  if (process.env.NODE_ENV !== 'development') return;

  const { totalMs, pauseCount, isShortSession } = session;

  // Check session duration bounds
  invariant(
    totalMs >= 60000 && totalMs <= 43200000,
    'Session duration must be between 60s and 12h',
    { totalMs, seconds: totalMs / 1000 }
  );

  // Check pause count
  invariant(pauseCount >= 0, 'pauseCount must be >= 0', pauseCount);

  // Check short session flag consistency
  invariant(
    isShortSession === (totalMs < 60000),
    'isShortSession flag inconsistent with duration',
    { isShortSession, totalMs }
  );
}

export function validateDaySplitSegments(
  sessionTotal: number,
  sessionPause: number,
  segments: Array<{ totalMs: number; pauseMs: number }>
): void {
  if (process.env.NODE_ENV !== 'development') return;

  // Calculate totals from segments
  const segmentTotalSum = segments.reduce((sum, seg) => sum + seg.totalMs, 0);
  const segmentPauseSum = segments.reduce((sum, seg) => sum + seg.pauseMs, 0);

  // Check integrity
  invariant(
    Math.abs(segmentTotalSum - sessionTotal) <= 1,
    'Sum of segment totals must equal session total',
    { segmentTotalSum, sessionTotal, diff: Math.abs(segmentTotalSum - sessionTotal) }
  );

  invariant(
    Math.abs(segmentPauseSum - sessionPause) <= 1,
    'Sum of segment pauses must equal session pause',
    { segmentPauseSum, sessionPause, diff: Math.abs(segmentPauseSum - sessionPause) }
  );

  // Check individual segments
  segments.forEach((seg, index) => {
    invariant(seg.totalMs >= 0, `Segment ${index} totalMs must be >= 0`, seg.totalMs);
    invariant(seg.pauseMs >= 0, `Segment ${index} pauseMs must be >= 0`, seg.pauseMs);
    invariant(
      seg.pauseMs <= seg.totalMs,
      `Segment ${index} pauseMs cannot exceed totalMs`,
      seg
    );
  });
}

export function validateRollupResult(rollup: {
  totalMs: number;
  productiveMs: number;
  pauseMs: number;
  focusPct: number;
  sessionCount: number;
}): void {
  if (process.env.NODE_ENV !== 'development') return;

  const { totalMs, productiveMs, pauseMs, focusPct, sessionCount } = rollup;

  // Basic checks
  invariant(totalMs >= 0, 'Rollup totalMs must be >= 0', totalMs);
  invariant(productiveMs >= 0, 'Rollup productiveMs must be >= 0', productiveMs);
  invariant(pauseMs >= 0, 'Rollup pauseMs must be >= 0', pauseMs);
  invariant(sessionCount >= 0, 'Rollup sessionCount must be >= 0', sessionCount);

  // Relationships
  invariant(pauseMs <= totalMs, 'Rollup pauseMs cannot exceed totalMs', { pauseMs, totalMs });
  invariant(
    productiveMs <= totalMs,
    'Rollup productiveMs cannot exceed totalMs',
    { productiveMs, totalMs }
  );

  // Check calculated focus percentage
  if (totalMs > 0) {
    const calculatedFocus = ((totalMs - pauseMs) / totalMs) * 100;
    const diff = Math.abs(calculatedFocus - focusPct);
    invariant(
      diff <= 0.1, // Allow 0.1% difference for rounding
      'Rollup focusPct should match calculation',
      { calculatedFocus, actualFocus: focusPct, diff }
    );
  } else {
    invariant(focusPct === 0, 'Rollup focusPct should be 0 when totalMs is 0', focusPct);
  }
}

// Helper function for invariant checks
function invariant(condition: boolean, message: string, ...args: any[]): void {
  if (!condition) {
    console.error('Invariant violation:', message, ...args);
    console.trace();
    if (process.env.NODE_ENV === 'development') {
      throw new Error(`Invariant failed: ${message}`);
    }
  }
}

// Development-only validation wrapper
export function devValidate<T>(validator: (data: T) => void, data: T): T {
  if (process.env.NODE_ENV === 'development') {
    try {
      validator(data);
    } catch (error) {
      console.error('Validation failed:', error);
      // In development, you might want to break here
      debugger;
    }
  }
  return data;
}