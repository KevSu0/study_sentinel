/**
 * Badge Progress Manager v1
 *
 * Manages badge evaluation progress with incremental updates
 * Event-driven architecture for performance
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Badge, StudyTask, CompletedWork } from '@/lib/types';

interface BadgeProgressDB extends DBSchema {
  badge_progress: {
    key: string;
    value: BadgeProgress;
    indexes: {
      by_state: string;
      by_badge_id: string;
      by_last_eval: number;
    };
  };
  evaluation_queue: {
    key: string;
    value: EvaluationQueueItem;
    indexes: {
      by_priority: number;
      by_timestamp: number;
    };
  };
}

export interface BadgeProgress {
  badge_id: string;
  state: 'pending' | 'evaluating' | 'earned' | 'revoked';
  progress: number; // 0-100
  last_eval_at: number;
  next_eval_at?: number;
  context: BadgeContext;
  version: string;
  created_at: number;
  updated_at: number;
}

export interface BadgeContext {
  current_streak?: number;
  total_sessions?: number;
  total_points?: number;
  longest_session?: number;
  tasks_completed?: number;
  routines_completed?: number;
  perfect_days?: number;
  subject_mastery?: Record<string, number>;
  recent_activity?: Array<{
    date: string;
    minutes: number;
    sessions: number;
  }>;
}

export interface EvaluationQueueItem {
  id: string;
  badge_id: string;
  trigger: 'session_created' | 'session_updated' | 'task_completed' | 'day_rollover' | 'manual';
  priority: number; // 1-5, 1=highest
  scheduled_at: number;
  data?: any;
}

export interface BadgeEvaluationResult {
  badge_id: string;
  previous_state: string;
  new_state: string;
  previous_progress: number;
  new_progress: number;
  earned_at?: number;
  context: BadgeContext;
}

// Constants
const BADGE_PROGRESS_VERSION = '1.0.0';
const DB_NAME = 'StudySentinelBadgeProgress';
const DB_VERSION = 1;
const MAX_EVAL_TIME_PER_FRAME = 16; // 16ms per frame
const EVALUATION_BATCH_SIZE = 5; // Process 5 badges per batch

// Database singleton
let dbPromise: Promise<IDBPDatabase<BadgeProgressDB>> | null = null;

async function getDB(): Promise<IDBPDatabase<BadgeProgressDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BadgeProgressDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        // Create badge_progress store
        if (!db.objectStoreNames.contains('badge_progress')) {
          const store = db.createObjectStore('badge_progress', { keyPath: 'badge_id' });
          store.createIndex('by_state', 'state');
          store.createIndex('by_badge_id', 'badge_id');
          store.createIndex('by_last_eval', 'last_eval_at');
        }

        // Create evaluation_queue store
        if (!db.objectStoreNames.contains('evaluation_queue')) {
          const queueStore = db.createObjectStore('evaluation_queue', { keyPath: 'id' });
          queueStore.createIndex('by_priority', 'priority');
          queueStore.createIndex('by_timestamp', 'scheduled_at');
        }
      },
    });
  }

  return dbPromise;
}

// Badge Progress Manager
export class BadgeProgressManager {
  private isInitialized = false;
  private evaluationInProgress = false;
  private evaluationCallbacks = new Map<string, (result: BadgeEvaluationResult) => void>();

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const db = await getDB();
      this.isInitialized = true;

      // Set up day rollover check
      this.setupDayRolloverCheck();

      // Process evaluation queue
      this.processEvaluationQueue();

      console.log('Badge Progress Manager initialized');
    } catch (error) {
      console.error('Failed to initialize Badge Progress Manager:', error);
    }
  }

  // Public API
  async initializeBadges(badges: Badge[]): Promise<void> {
    if (!this.isInitialized) return;

    const db = await getDB();
    const tx = db.transaction('badge_progress', 'readwrite');

    for (const badge of badges) {
      const existing = await tx.store.get(badge.id);
      if (!existing) {
        await tx.store.add({
          badge_id: badge.id,
          state: 'pending',
          progress: 0,
          last_eval_at: Date.now(),
          context: this.createInitialContext(),
          version: BADGE_PROGRESS_VERSION,
          created_at: Date.now(),
          updated_at: Date.now()
        });
      }
    }

    await tx.done;
  }

  async onStudySessionCompleted(session: CompletedWork): Promise<BadgeEvaluationResult[]> {
    if (!this.isInitialized) return [];

    // Queue evaluation for badges that might be affected
    const affectedBadges = await this.getAffectedBadges('session', session);

    const results: BadgeEvaluationResult[] = [];
    for (const badgeId of affectedBadges) {
      const result = await this.queueEvaluation(badgeId, 'session_created', {
        data: session,
        priority: 2
      });
      if (result) results.push(result);
    }

    return results;
  }

  async onTaskCompleted(task: StudyTask): Promise<BadgeEvaluationResult[]> {
    if (!this.isInitialized) return [];

    const affectedBadges = await this.getAffectedBadges('task', task);

    const results: BadgeEvaluationResult[] = [];
    for (const badgeId of affectedBadges) {
      const result = await this.queueEvaluation(badgeId, 'task_completed', {
        data: task,
        priority: 2
      });
      if (result) results.push(result);
    }

    return results;
  }

  async getBadgeProgress(badgeId: string): Promise<BadgeProgress | null> {
    if (!this.isInitialized) return null;

    const db = await getDB();
    const result = await db.get('badge_progress', badgeId);
    return result || null;
  }

  async getAllBadgeProgress(): Promise<BadgeProgress[]> {
    if (!this.isInitialized) return [];

    const db = await getDB();
    return db.getAll('badge_progress');
  }

  async forceEvaluateBadge(badgeId: string): Promise<BadgeEvaluationResult | null> {
    if (!this.isInitialized) return null;

    return this.queueEvaluation(badgeId, 'manual', { priority: 1 });
  }

  // Private methods
  private async getAffectedBadges(trigger: 'session' | 'task', data: any): Promise<string[]> {
    // This would analyze the trigger data to determine which badges might be affected
    // For now, return all badges that are not yet earned
    const db = await getDB();
    const allProgress = await db.getAll('badge_progress');

    return allProgress
      .filter(p => p.state !== 'earned')
      .map(p => p.badge_id);
  }

  private async queueEvaluation(
    badgeId: string,
    trigger: EvaluationQueueItem['trigger'],
    options: {
      priority?: number;
      data?: any;
      delay?: number;
    } = {}
  ): Promise<BadgeEvaluationResult | null> {
    const db = await getDB();

    const queueItem: EvaluationQueueItem = {
      id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      badge_id: badgeId,
      trigger,
      priority: options.priority || 3,
      scheduled_at: Date.now() + (options.delay || 0),
      data: options.data
    };

    await db.add('evaluation_queue', queueItem);

    // If this is high priority, process immediately
    if (options.priority && options.priority <= 2) {
      return this.processEvaluationQueue();
    }

    return null;
  }

  private async processEvaluationQueue(): Promise<BadgeEvaluationResult | null> {
    if (this.evaluationInProgress) return null;
    this.evaluationInProgress = true;

    try {
      const db = await getDB();
      const tx = db.transaction(['evaluation_queue', 'badge_progress'], 'readwrite');

      // Get next batch of items
      const queueIndex = tx.objectStore('evaluation_queue').index('by_priority');
      const items = await queueIndex.getAll(IDBKeyRange.upperBound(5), EVALUATION_BATCH_SIZE);

      let result: BadgeEvaluationResult | null = null;

      for (const item of items) {
        const startTime = performance.now();

        // Check if we have time left in this frame
        if (performance.now() - startTime > MAX_EVAL_TIME_PER_FRAME) {
          break;
        }

        // Process the evaluation
        const evalResult = await this.evaluateBadge(item.badge_id, item.data);
        if (evalResult) {
          result = evalResult;
        }

        // Remove from queue
        await tx.objectStore('evaluation_queue').delete(item.id);
      }

      await tx.done;

      // If there are more items, schedule next batch
      const remainingCount = await db.count('evaluation_queue');
      if (remainingCount > 0) {
        requestAnimationFrame(() => this.processEvaluationQueue());
      }

      return result;
    } catch (error) {
      console.error('Error processing evaluation queue:', error);
      return null;
    } finally {
      this.evaluationInProgress = false;
    }
  }

  private async evaluateBadge(badgeId: string, contextData?: any): Promise<BadgeEvaluationResult | null> {
    try {
      const db = await getDB();
      const progress = await db.get('badge_progress', badgeId);

      if (!progress) return null;

      // Get current state before marking as evaluating
      const previousState = progress.state;
      const previousProgress = progress.progress;

      // Mark as evaluating
      progress.state = 'evaluating';
      progress.updated_at = Date.now();
      await db.put('badge_progress', progress);

      // Get current statistics
      const stats = await this.getCurrentStats();

      // Evaluate badge conditions
      const newProgress = await this.calculateBadgeProgress(badgeId, stats);
      const newState = newProgress >= 100 ? 'earned' : 'pending';

      // Update progress
      progress.progress = newProgress;
      progress.state = newState;
      progress.context = this.updateContext(progress.context, stats);
      progress.last_eval_at = Date.now();
      progress.updated_at = Date.now();

      if (newState === 'earned' && previousState !== 'earned') {
        progress.next_eval_at = undefined; // No need to re-evaluate earned badges
      } else {
        // Schedule next evaluation based on badge type
        progress.next_eval_at = this.scheduleNextEvaluation(badgeId);
      }

      await db.put('badge_progress', progress);

      const result: BadgeEvaluationResult = {
        badge_id: badgeId,
        previous_state: previousState,
        new_state: newState,
        previous_progress: previousProgress,
        new_progress: newProgress,
        earned_at: newState === 'earned' && previousState !== 'earned' ? Date.now() : undefined,
        context: progress.context
      };

      // Notify listeners
      this.notifyBadgeUpdate(result);

      return result;
    } catch (error) {
      console.error(`Error evaluating badge ${badgeId}:`, error);
      return null;
    }
  }

  private async calculateBadgeProgress(badgeId: string, stats: any): Promise<number> {
    // This would contain the actual badge evaluation logic
    // For now, it's a placeholder
    return 0;
  }

  private async getCurrentStats(): Promise<any> {
    // This would aggregate current statistics from rollups and events
    // For now, return empty object
    return {};
  }

  private createInitialContext(): BadgeContext {
    return {
      current_streak: 0,
      total_sessions: 0,
      total_points: 0,
      longest_session: 0,
      tasks_completed: 0,
      routines_completed: 0,
      perfect_days: 0,
      subject_mastery: {},
      recent_activity: []
    };
  }

  private updateContext(current: BadgeContext, stats: any): BadgeContext {
    return {
      ...current,
      ...stats
    };
  }

  private scheduleNextEvaluation(badgeId: string): number | undefined {
    // Schedule based on badge type
    // Daily badges: check daily
    // Weekly badges: check every 6 hours
    // Monthly badges: check daily
    // Overall badges: check every 24 hours
    return Date.now() + 24 * 60 * 60 * 1000; // Default: 24 hours
  }

  private setupDayRolloverCheck() {
    // Check for day rollover every minute
    setInterval(() => {
      this.checkDayRollover();
    }, 60 * 1000);
  }

  private async checkDayRollover() {
    // Check if we've crossed the day boundary (04:00 IST)
    // If so, trigger evaluation for daily badges
    const now = new Date();
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const hours = istNow.getHours();

    if (hours === 4 && istNow.getMinutes() < 1) {
      // Day rollover detected
      await this.onDayRollover();
    }
  }

  private async onDayRollover(): Promise<void> {
    // Queue evaluation for all daily badges
    const db = await getDB();
    const dailyBadges = await db.getAllFromIndex(
      'badge_progress',
      'by_state',
      IDBKeyRange.only('pending')
    );

    for (const badge of dailyBadges) {
      await this.queueEvaluation(badge.badge_id, 'day_rollover', {
        priority: 2
      });
    }
  }

  private notifyBadgeUpdate(result: BadgeEvaluationResult) {
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('badge-progress-updated', {
      detail: result
    }));

    // Call any registered callbacks
    const callback = this.evaluationCallbacks.get(result.badge_id);
    if (callback) {
      callback(result);
      this.evaluationCallbacks.delete(result.badge_id);
    }
  }

  // Maintenance
  async cleanupOldProgress(daysToKeep = 90): Promise<void> {
    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    const db = await getDB();

    // Remove old progress for badges that haven't been evaluated recently
    const oldProgress = await db.getAllFromIndex(
      'badge_progress',
      'by_last_eval',
      IDBKeyRange.upperBound(cutoff)
    );

    const tx = db.transaction('badge_progress', 'readwrite');
    for (const progress of oldProgress) {
      if (progress.state === 'pending') {
        await tx.store.delete(progress.badge_id);
      }
    }

    await tx.done;
  }

  async resetBadgeProgress(badgeId?: string): Promise<void> {
    const db = await getDB();

    if (badgeId) {
      // Reset specific badge
      await db.put('badge_progress', {
        badge_id: badgeId,
        state: 'pending',
        progress: 0,
        last_eval_at: Date.now(),
        context: this.createInitialContext(),
        version: BADGE_PROGRESS_VERSION,
        created_at: Date.now(),
        updated_at: Date.now()
      });
    } else {
      // Reset all badges
      const allProgress = await db.getAll('badge_progress');
      const tx = db.transaction('badge_progress', 'readwrite');

      for (const progress of allProgress) {
        await tx.store.put({
          ...progress,
          state: 'pending',
          progress: 0,
          context: this.createInitialContext(),
          updated_at: Date.now()
        });
      }

      await tx.done;
    }
  }
}

// Export singleton instance
export const badgeProgressManager = new BadgeProgressManager();

// React hook for consuming badge progress
import { useEffect, useState } from 'react';

export function useBadgeProgress(badgeId?: string) {
  const [progress, setProgress] = useState<BadgeProgress | null>(null);
  const [allProgress, setAllProgress] = useState<BadgeProgress[]>([]);

  useEffect(() => {
    // Listen for badge updates
    const handleUpdate = (event: CustomEvent<BadgeEvaluationResult>) => {
      if (event.detail.badge_id === badgeId) {
        badgeProgressManager.getBadgeProgress(badgeId!).then(setProgress);
      }
      badgeProgressManager.getAllBadgeProgress().then(setAllProgress);
    };

    window.addEventListener('badge-progress-updated', handleUpdate as EventListener);

    // Initial load
    if (badgeId) {
      badgeProgressManager.getBadgeProgress(badgeId).then(setProgress);
    }
    badgeProgressManager.getAllBadgeProgress().then(setAllProgress);

    return () => {
      window.removeEventListener('badge-progress-updated', handleUpdate as EventListener);
    };
  }, [badgeId]);

  return {
    progress,
    allProgress,
    forceEvaluate: badgeId ? () => badgeProgressManager.forceEvaluateBadge(badgeId) : undefined
  };
}