import { useCallback, useEffect, useState } from 'react';

export type PerformanceStatus = 'good' | 'warning' | 'critical' | 'unknown';

export interface PerformanceSnapshot {
  fps: number | null;
  longTasksPerSecond: number | null;
  heapUsedPercentage: number | null;
  collectedAt: number;
}

const DEFAULT_SNAPSHOT: PerformanceSnapshot = {
  fps: null,
  longTasksPerSecond: null,
  heapUsedPercentage: null,
  collectedAt: Date.now(),
};

export function collectPerformanceSnapshot(): PerformanceSnapshot {
  if (typeof performance === 'undefined') {
    return { ...DEFAULT_SNAPSHOT, collectedAt: Date.now() };
  }

  let heapUsedPercentage: number | null = null;
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (memory && memory.jsHeapSizeLimit > 0) {
    heapUsedPercentage = Math.min(
      100,
      Math.max(0, (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
    );
  }

  return {
    fps: null,
    longTasksPerSecond: null,
    heapUsedPercentage,
    collectedAt: Date.now(),
  };
}

export function usePerformanceMetrics(pollIntervalMs = 5000) {
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot>(() => collectPerformanceSnapshot());

  const refresh = useCallback(async () => {
    setSnapshot(collectPerformanceSnapshot());
  }, []);

  useEffect(() => {
    if (pollIntervalMs <= 0) {
      return;
    }

    const id = setInterval(() => {
      setSnapshot(collectPerformanceSnapshot());
    }, pollIntervalMs);

    return () => clearInterval(id);
  }, [pollIntervalMs]);

  return { snapshot, refresh };
}
