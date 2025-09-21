/**
 * Stats Computation Worker v1
 *
 * Offloads heavy statistics calculations from the main thread
 * Handles 7/30/overall range computations efficiently
 */

// Types
interface WorkerRequest {
  id: string;
  type: 'COMPUTE_STATS' | 'COMPUTE_ROLLUPS' | 'EVALUATE_BADGES';
  payload: any;
  metricsVersion: string;
  timestamp: number;
}

interface ComputeStatsPayload {
  work: CompletedWork[];
  tasks: StudyTask[];
  timeRange: 'daily' | 'weekly' | 'monthly' | 'overall';
  selectedDate?: string; // ISO string for daily view
  bucketDay?: string; // Current study day in IST
  profile: {
    dailyStudyGoal?: number;
  };
}

interface ComputeRollupsPayload {
  events: EventRecord[];
  bucketDay: string;
  forceRecompute?: boolean;
}

interface EvaluateBadgesPayload {
  badges: Badge[];
  allWork: CompletedWork[];
  allTasks: StudyTask[];
  earnedBadges: Map<string, string>;
}

interface WorkerResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  computeTime: number;
  metricsVersion: string;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
}

interface TimeRangeStats {
  totalHours: string;
  totalPoints: number;
  completedCount: number;
  completionRate: number;
  avgSessionDuration: string;
  studyStreak: number;
}

interface CompletedWork {
  id: string;
  timestamp: string;
  duration: number;
  points: number;
  title: string;
  type: 'task' | 'routine';
  date: string; // bucket_day
}

interface StudyTask {
  id: string;
  title: string;
  date: string;
  status: 'pending' | 'completed' | 'archived';
}

interface Badge {
  id: string;
  name: string;
  conditions: BadgeCondition[];
  isEnabled: boolean;
  category: 'daily' | 'weekly' | 'monthly' | 'overall';
}

interface BadgeCondition {
  type: string;
  target: number;
  timeframe: string;
}

interface EventRecord {
  id: string;
  timestamp: number;
  type: string;
  data: any;
}

// Worker implementation
const STATS_WORKER_VERSION = '1.0.0';

// Cache for memoization
const memoCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Performance monitoring
let computeCount = 0;
let totalComputeTime = 0;

// Main message handler
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const startTime = performance.now();
  const { id, type, payload, metricsVersion, timestamp } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'COMPUTE_STATS':
        result = await computeTimeRangeStats(payload as ComputeStatsPayload);
        break;

      case 'COMPUTE_ROLLUPS':
        result = await computeDailyRollups(payload as ComputeRollupsPayload);
        break;

      case 'EVALUATE_BADGES':
        result = await evaluateBadges(payload as EvaluateBadgesPayload);
        break;

      default:
        throw new Error(`Unknown request type: ${type}`);
    }

    const computeTime = performance.now() - startTime;
    updatePerformanceMetrics(computeTime);

    const response: WorkerResponse = {
      id,
      success: true,
      data: result,
      computeTime,
      metricsVersion,
      memoryUsage: getMemoryUsage()
    };

    self.postMessage(response);

  } catch (error) {
    const computeTime = performance.now() - startTime;

    const response: WorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      computeTime,
      metricsVersion
    };

    self.postMessage(response);
  }
};

// Core computation functions
async function computeTimeRangeStats(payload: ComputeStatsPayload): Promise<TimeRangeStats> {
  const { work, tasks, timeRange, selectedDate, profile } = payload;

  // Create cache key
  const cacheKey = `stats_${timeRange}_${selectedDate || 'all'}_${work.length}_${tasks.length}`;
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  // Filter work based on time range
  const filteredWork = filterWorkByTimeRange(work, timeRange, selectedDate);
  const filteredTasks = filterTasksByTimeRange(tasks, timeRange, selectedDate);
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  // Calculate stats
  const totalSeconds = filteredWork.reduce((sum, w) => sum + w.duration, 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const totalPoints = filteredWork.reduce((sum, w) => sum + w.points, 0);
  const completionRate = filteredTasks.length > 0
    ? Math.round((completedTasks.length / filteredTasks.length) * 100)
    : 0;
  const avgSessionDuration = filteredWork.length > 0
    ? Math.round(totalSeconds / 60 / filteredWork.length)
    : 0;

  // Calculate study streak
  const studyStreak = calculateStudyStreak(work);

  const result: TimeRangeStats = {
    totalHours,
    totalPoints,
    completedCount: filteredWork.length,
    completionRate,
    avgSessionDuration: avgSessionDuration.toString(),
    studyStreak
  };

  // Cache result
  setCachedResult(cacheKey, result);

  return result;
}

async function computeDailyRollups(payload: ComputeRollupsPayload) {
  const { events, bucketDay, forceRecompute } = payload;

  if (!forceRecompute) {
    // Check if rollup already exists
    const cacheKey = `rollup_${bucketDay}`;
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;
  }

  // Group events by bucket_day
  const dailyData = events.reduce((acc, event) => {
    const day = new Date(event.timestamp).toISOString().split('T')[0];
    if (!acc[day]) {
      acc[day] = {
        totalMinutes: 0,
        totalPoints: 0,
        byRoutine: {},
        sessionCount: 0
      };
    }

    if (event.type === 'study_session_created' || event.type === 'study_session_updated') {
      const data = event.data;
      acc[day].totalMinutes += Math.floor(data.duration / 60);
      acc[day].totalPoints += data.points || Math.floor(data.duration / 60);
      acc[day].sessionCount++;

      if (data.subject) {
        if (!acc[day].byRoutine[data.subject]) {
          acc[day].byRoutine[data.subject] = { minutes: 0, points: 0 };
        }
        acc[day].byRoutine[data.subject].minutes += Math.floor(data.duration / 60);
        acc[day].byRoutine[data.subject].points += data.points || Math.floor(data.duration / 60);
      }
    }

    return acc;
  }, {} as Record<string, any>);

  const result = {
    bucketDay,
    rollups: dailyData,
    version: '1.0.0',
    computedAt: Date.now()
  };

  // Cache result
  setCachedResult(`rollup_${bucketDay}`, result);

  return result;
}

async function evaluateBadges(payload: EvaluateBadgesPayload) {
  const { badges, allWork, allTasks, earnedBadges } = payload;

  const results: Array<{ badgeId: string; earned: boolean; progress: number }> = [];

  for (const badge of badges) {
    if (!badge.isEnabled) continue;

    let earned = earnedBadges.has(badge.id);
    let progress = 0;

    // Skip already earned badges unless re-evaluating
    if (earned) {
      results.push({ badgeId: badge.id, earned: true, progress: 100 });
      continue;
    }

    // Evaluate each condition
    for (const condition of badge.conditions) {
      const conditionProgress = evaluateBadgeCondition(condition, allWork, allTasks);
      progress = Math.max(progress, conditionProgress);

      if (conditionProgress >= 100) {
        earned = true;
        break;
      }
    }

    results.push({ badgeId: badge.id, earned, progress });
  }

  return {
    evaluatedAt: Date.now(),
    results,
    version: '1.0.0'
  };
}

// Helper functions
function filterWorkByTimeRange(work: CompletedWork[], timeRange: string, selectedDate?: string) {
  const now = new Date();

  switch (timeRange) {
    case 'daily':
      if (!selectedDate) return work;
      return work.filter(w => w.date === selectedDate);

    case 'weekly':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return work.filter(w => new Date(w.date) >= weekAgo);

    case 'monthly':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return work.filter(w => new Date(w.date) >= monthAgo);

    case 'overall':
    default:
      return work;
  }
}

function filterTasksByTimeRange(tasks: StudyTask[], timeRange: string, selectedDate?: string) {
  const now = new Date();
  const nonArchived = tasks.filter(t => t.status !== 'archived');

  switch (timeRange) {
    case 'daily':
      if (!selectedDate) return nonArchived;
      return nonArchived.filter(t => t.date === selectedDate);

    case 'weekly':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return nonArchived.filter(t => new Date(t.date) >= weekAgo);

    case 'monthly':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return nonArchived.filter(t => new Date(t.date) >= monthAgo);

    case 'overall':
    default:
      return nonArchived;
  }
}

function calculateStudyStreak(work: CompletedWork[]): number {
  const completedDates = new Set(work.map(w => w.date));
  if (completedDates.size === 0) return 0;

  let streak = 0;
  let currentDate = new Date();

  // Adjust to study day boundary (04:00 IST)
  const studyDay = new Date(currentDate);
  studyDay.setUTCHours(4, 0, 0, 0);
  if (currentDate < studyDay) {
    studyDay.setUTCDate(studyDay.getUTCDate() - 1);
  }

  while (completedDates.has(studyDay.toISOString().split('T')[0])) {
    streak++;
    studyDay.setUTCDate(studyDay.getUTCDate() - 1);
  }

  return streak;
}

function evaluateBadgeCondition(condition: BadgeCondition, work: CompletedWork[], tasks: StudyTask[]): number {
  const { type, target, timeframe } = condition;

  switch (type) {
    case 'TASKS_COMPLETED':
      const completedTasks = tasks.filter(t => t.status === 'completed');
      return Math.min(100, (completedTasks.length / target) * 100);

    case 'ROUTINES_COMPLETED':
      const routineWork = work.filter(w => w.type === 'routine');
      return Math.min(100, (routineWork.length / target) * 100);

    case 'TOTAL_STUDY_TIME':
      const totalMinutes = work.reduce((sum, w) => sum + Math.floor(w.duration / 60), 0);
      return Math.min(100, (totalMinutes / target) * 100);

    case 'SINGLE_SESSION_TIME':
      const maxSession = Math.max(...work.map(w => Math.floor(w.duration / 60)), 0);
      return Math.min(100, (maxSession / target) * 100);

    case 'DAY_STREAK':
      const streak = calculateStudyStreak(work);
      return Math.min(100, (streak / target) * 100);

    default:
      return 0;
  }
}

// Cache management
function getCachedResult(key: string): any | null {
  const cached = memoCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > cached.ttl) {
    memoCache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedResult(key: string, data: any, ttl: number = CACHE_TTL) {
  // Clean old entries if cache is too large
  if (memoCache.size > 100) {
    const now = Date.now();
    for (const [cacheKey, value] of memoCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        memoCache.delete(cacheKey);
      }
    }
  }

  memoCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

// Performance monitoring
function updatePerformanceMetrics(computeTime: number) {
  computeCount++;
  totalComputeTime += computeTime;

  // Log slow computations
  if (computeTime > 50) {
    console.warn(`[Stats Worker] Slow computation: ${computeTime}ms`);
  }
}

function getMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    };
  }
  return undefined;
}

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoCache.entries()) {
    if (now - value.timestamp > value.ttl) {
      memoCache.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

// Export types for main thread usage
export type {
  WorkerRequest,
  ComputeStatsPayload,
  WorkerResponse,
  TimeRangeStats
};