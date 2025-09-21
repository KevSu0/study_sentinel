// Test utilities for CSP reports
// This file is only used in tests to reset counts

import { counts as originalCounts } from './counts';

export function setCounts(v: Record<string, number>) {
  // In test environment, directly modify the counts
  (originalCounts as any) = v;
}

export function getCounts() {
  return { ...originalCounts };
}