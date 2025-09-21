// src/data/ephemeral/activeTimer.store.ts

import { LocalStore, storageKeys } from '../storage/local.store';
import { ActiveTimer } from '../../domain/timer.state';
import { TimerStateType } from '../../domain/time.constants';

export class ActiveTimerStore {
  private store: LocalStore;
  private memoryTimer: ActiveTimer | null = null;

  constructor(store?: LocalStore) {
    this.store = store || new LocalStore();
    this.loadFromStorage();
  }

  /**
   * Get active timer
   */
  get(): ActiveTimer | null {
    return this.memoryTimer;
  }

  /**
   * Set active timer
   */
  set(timer: ActiveTimer): boolean {
    this.memoryTimer = timer;
    return this.store.set(storageKeys.activeTimer(), timer);
  }

  /**
   * Clear active timer
   */
  clear(): boolean {
    this.memoryTimer = null;
    return this.store.remove(storageKeys.activeTimer());
  }

  /**
   * Check if timer exists
   */
  exists(): boolean {
    return this.memoryTimer !== null;
  }

  /**
   * Update timer state
   */
  updateState(state: TimerStateType): boolean {
    if (!this.memoryTimer) {
      return false;
    }

    this.memoryTimer.state = state;
    return this.set(this.memoryTimer);
  }

  /**
   * Update timer pause info
   */
  updatePause(
    pauseStartTime?: number,
    pauseDuration?: number,
    pauseCount?: number
  ): boolean {
    if (!this.memoryTimer) {
      return false;
    }

    if (pauseStartTime !== undefined) {
      this.memoryTimer.pauseStartTime = pauseStartTime;
    }
    if (pauseDuration !== undefined) {
      this.memoryTimer.pausedDuration = pauseDuration;
    }
    if (pauseCount !== undefined) {
      this.memoryTimer.pauseCount = pauseCount;
    }

    return this.set(this.memoryTimer);
  }

  /**
   * Load timer from storage
   */
  private loadFromStorage(): void {
    this.memoryTimer = this.store.get<ActiveTimer>(storageKeys.activeTimer());
  }

  /**
   * Validate timer integrity
   */
  validate(): boolean {
    if (!this.memoryTimer) {
      return true; // No timer is valid
    }

    const timer = this.memoryTimer;

    // Check required fields
    if (!timer.id || !timer.entityType || !timer.entityId || !timer.state) {
      return false;
    }

    // Check timestamps
    if (timer.startTime <= 0) {
      return false;
    }

    // For countdown timers, check endTime
    if (timer.timerType === 'COUNTDOWN' && timer.endTime) {
      if (timer.endTime <= timer.startTime) {
        return false;
      }
    }

    // Check pause state consistency
    if (timer.state === 'PAUSED') {
      if (!timer.pauseStartTime || timer.pauseStartTime <= 0) {
        return false;
      }
    } else {
      if (timer.pauseStartTime) {
        return false;
      }
    }

    // Check pause duration non-negative
    if (timer.pausedDuration < 0) {
      return false;
    }

    // Check pause count non-negative
    if (timer.pauseCount < 0) {
      return false;
    }

    return true;
  }
}

// Default instance
export const activeTimerStore = new ActiveTimerStore();