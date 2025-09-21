/**
 * Hook for managing the Stats Web Worker
 * Handles communication, fallbacks, and performance monitoring
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type {
  WorkerRequest,
  WorkerResponse,
  ComputeStatsPayload,
  TimeRangeStats
} from '@/workers/stats.worker';

interface UseStatsWorkerOptions {
  enabled?: boolean;
  timeout?: number;
  fallbackToMainThread?: boolean;
}

interface WorkerStats {
  computeTime: number;
  requestCount: number;
  errorCount: number;
  averageComputeTime: number;
  lastUsed: number;
}

export function useStatsWorker(options: UseStatsWorkerOptions = {}) {
  const {
    enabled = true,
    timeout = 1000, // 1 second timeout
    fallbackToMainThread = true
  } = options;

  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeoutId: NodeJS.Timeout;
  }>>(new Map());

  // Ref to track the latest pendingRequests for cleanup
  const pendingRequestsRef = useRef(pendingRequests.current);
  pendingRequestsRef.current = pendingRequests.current;

  const [workerStats, setWorkerStats] = useState<WorkerStats>({
    computeTime: 0,
    requestCount: 0,
    errorCount: 0,
    averageComputeTime: 0,
    lastUsed: 0
  });

  const [isWorkerReady, setIsWorkerReady] = useState(false);

  // Initialize worker
  useEffect(() => {
    if (!enabled) {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      return;
    }

    try {
      // Create worker with error handling for browser compatibility
      const worker = new Worker(new URL('@/workers/stats.worker.ts', import.meta.url), {
        type: 'module'
      });

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, success, data, error, computeTime, metricsVersion } = event.data;

        const request = pendingRequestsRef.current.get(id);
        if (!request) return;

        // Clear timeout
        clearTimeout(request.timeoutId);
        pendingRequestsRef.current.delete(id);

        // Update stats
        setWorkerStats(prev => ({
          computeTime: prev.computeTime + computeTime,
          requestCount: prev.requestCount + 1,
          errorCount: success ? prev.errorCount : prev.errorCount + 1,
          averageComputeTime: (prev.computeTime + computeTime) / (prev.requestCount + 1),
          lastUsed: Date.now()
        }));

        if (success) {
          request.resolve(data);
        } else {
          request.reject(new Error(error || 'Worker computation failed'));
        }
      };

      worker.onerror = (error) => {
        console.error('Stats Worker error:', error);

        // Reject all pending requests
        for (const [id, request] of pendingRequestsRef.current.entries()) {
          clearTimeout(request.timeoutId);
          request.reject(new Error('Worker crashed'));
        }
        pendingRequestsRef.current.clear();

        // Try to restart worker
        if (enabled) {
          setTimeout(() => {
            if (workerRef.current === worker) {
              workerRef.current = null;
              setIsWorkerReady(false);
            }
          }, 1000);
        }
      };

      workerRef.current = worker;
      setIsWorkerReady(true);

      return () => {
        worker.terminate();
        pendingRequestsRef.current.clear();
      };
    } catch (error) {
      console.error('Failed to initialize stats worker:', error);
      setIsWorkerReady(false);
    }
  }, [enabled]);

  // Send request to worker
  const sendRequest = useCallback(<T = any>(
    type: WorkerRequest['type'],
    payload: any
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      // Check if worker is available
      if (!enabled || !workerRef.current || !isWorkerReady) {
        if (fallbackToMainThread) {
          // Fallback to main thread computation
          reject(new Error('WORKER_UNAVAILABLE'));
          return;
        }
        reject(new Error('Stats worker not available'));
        return;
      }

      const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const request: WorkerRequest = {
        id,
        type,
        payload,
        metricsVersion: '1.0.0',
        timestamp: Date.now()
      };

      // Set timeout
      const timeoutId = setTimeout(() => {
        pendingRequestsRef.current.delete(id);
        reject(new Error(`Worker request timeout after ${timeout}ms`));
      }, timeout);

      pendingRequestsRef.current.set(id, { resolve, reject, timeoutId });

      workerRef.current!.postMessage(request);
    });
  }, [enabled, isWorkerReady, timeout, fallbackToMainThread]);

  // Compute stats using worker
  const computeStats = useCallback(async (
    payload: ComputeStatsPayload
  ): Promise<TimeRangeStats> => {
    try {
      return await sendRequest<TimeRangeStats>('COMPUTE_STATS', payload);
    } catch (error) {
      if (error.message === 'WORKER_UNAVAILABLE' && fallbackToMainThread) {
        // Fallback to main thread implementation
        console.warn('Falling back to main thread for stats computation');
        return computeStatsOnMainThread(payload);
      }
      throw error;
    }
  }, [sendRequest, fallbackToMainThread]);

  // Compute rollups
  const computeRollups = useCallback(async (
    events: any[],
    bucketDay: string,
    forceRecompute = false
  ) => {
    try {
      return await sendRequest('COMPUTE_ROLLUPS', {
        events,
        bucketDay,
        forceRecompute
      });
    } catch (error) {
      if (error.message === 'WORKER_UNAVAILABLE' && fallbackToMainThread) {
        // Fallback implementation
        console.warn('Falling back to main thread for rollups');
        return computeRollupsOnMainThread(events, bucketDay);
      }
      throw error;
    }
  }, [sendRequest, fallbackToMainThread]);

  // Evaluate badges
  const evaluateBadges = useCallback(async (
    badges: any[],
    allWork: any[],
    allTasks: any[],
    earnedBadges: Map<string, string>
  ) => {
    try {
      return await sendRequest('EVALUATE_BADGES', {
        badges,
        allWork,
        allTasks,
        earnedBadges
      });
    } catch (error) {
      if (error.message === 'WORKER_UNAVAILABLE' && fallbackToMainThread) {
        // Fallback implementation
        console.warn('Falling back to main thread for badge evaluation');
        return evaluateBadgesOnMainThread(badges, allWork, allTasks, earnedBadges);
      }
      throw error;
    }
  }, [sendRequest, fallbackToMainThread]);

  // Clear worker cache
  const clearCache = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'CLEAR_CACHE',
        id: `clear_${Date.now()}`,
        payload: null,
        metricsVersion: '1.0.0',
        timestamp: Date.now()
      });
    }
  }, []);

  // Get worker health
  const getWorkerHealth = useCallback(() => {
    return {
      isReady: isWorkerReady,
      pendingRequests: pendingRequests.current.size,
      stats: workerStats,
      enabled
    };
  }, [isWorkerReady, workerStats, enabled]);

  return {
    computeStats,
    computeRollups,
    evaluateBadges,
    clearCache,
    getWorkerHealth,
    isWorkerReady,
    workerStats
  };
}

// Fallback implementations for main thread
// These should only be used when worker is unavailable

function computeStatsOnMainThread(payload: ComputeStatsPayload): TimeRangeStats {
  // Import and use the original use-stats logic
  // This is a simplified version - in practice, you'd import the actual implementation
  const { work, tasks, timeRange } = payload;

  const totalSeconds = work.reduce((sum, w) => sum + w.duration, 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const totalPoints = work.reduce((sum, w) => sum + w.points, 0);
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const completionRate = tasks.length > 0
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;
  const avgSessionDuration = work.length > 0
    ? Math.round(totalSeconds / 60 / work.length)
    : 0;

  // Simple streak calculation
  const completedDates = new Set(work.map(w => w.date));
  let streak = 0;
  let currentDate = new Date();
  while (completedDates.has(currentDate.toISOString().split('T')[0])) {
    streak++;
    currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  }

  return {
    totalHours,
    totalPoints,
    completedCount: work.length,
    completionRate,
    avgSessionDuration: avgSessionDuration.toString(),
    studyStreak: streak
  };
}

function computeRollupsOnMainThread(events: any[], bucketDay: string) {
  // Simplified rollup computation
  const dailyData: Record<string, any> = {};

  for (const event of events) {
    const day = new Date(event.timestamp).toISOString().split('T')[0];
    if (!dailyData[day]) {
      dailyData[day] = {
        totalMinutes: 0,
        totalPoints: 0,
        byRoutine: {},
        sessionCount: 0
      };
    }

    if (event.type.includes('study_session')) {
      const data = event.data;
      dailyData[day].totalMinutes += Math.floor(data.duration / 60);
      dailyData[day].totalPoints += data.points || Math.floor(data.duration / 60);
      dailyData[day].sessionCount++;
    }
  }

  return {
    bucketDay,
    rollups: dailyData,
    version: '1.0.0',
    computedAt: Date.now()
  };
}

function evaluateBadgesOnMainThread(
  badges: any[],
  allWork: any[],
  allTasks: any[],
  earnedBadges: Map<string, string>
) {
  const results: any[] = [];

  for (const badge of badges) {
    if (!badge.isEnabled) continue;

    const earned = earnedBadges.has(badge.id);
    results.push({
      badgeId: badge.id,
      earned,
      progress: earned ? 100 : 0 // Simplified
    });
  }

  return {
    evaluatedAt: Date.now(),
    results,
    version: '1.0.0'
  };
}