// src/data/storage/local.store.ts

import { StorageKeys } from '../../domain/time.constants';

export interface StorageQuota {
  maxItems: number;
  maxSizeBytes: number;
}

export interface StorageOptions {
  quota?: StorageQuota;
  namespace?: string;
}

/**
 * Safe localStorage wrapper with quota management
 */
export class LocalStore {
  private namespace: string;
  private storage: Storage;

  constructor(options: StorageOptions = {}) {
    this.namespace = options.namespace || 'study_sentinel';
    this.storage = window.localStorage;
  }

  /**
   * Get item from localStorage
   */
  get<T>(key: string): T | null {
    try {
      const fullKey = this.getFullKey(key);
      const item = this.storage.getItem(fullKey);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  /**
   * Set item in localStorage
   */
  set<T>(key: string, value: T): boolean {
    try {
      const fullKey = this.getFullKey(key);
      const serialized = JSON.stringify(value);

      // Check quota if specified
      if (this.hasQuota()) {
        if (!this.checkQuota(fullKey, serialized)) {
          console.warn(`Storage quota exceeded for key: ${key}`);
          return false;
        }
      }

      this.storage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: string): boolean {
    try {
      const fullKey = this.getFullKey(key);
      this.storage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all items with this namespace
   */
  clear(): boolean {
    try {
      const keys = this.getKeys();
      for (const key of keys) {
        this.storage.removeItem(key);
      }
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Get all keys with this namespace
   */
  getKeys(): string[] {
    const keys: string[] = [];
    const prefix = `${this.namespace}:`;

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Get storage usage info
   */
  getUsage(): { used: number; total: number; keys: number } {
    let used = 0;
    const keys = this.getKeys();

    for (const key of keys) {
      const item = this.storage.getItem(key);
      if (item) {
        used += item.length * 2; // Approximate bytes (UTF-16)
      }
    }

    return {
      used,
      total: this.storage.length,
      keys: keys.length,
    };
  }

  /**
   * Check if quota is configured
   */
  private hasQuota(): boolean {
    return false; // Phase-1: no quota enforcement
  }

  /**
   * Check if adding item would exceed quota
   */
  private checkQuota(key: string, value: string): boolean {
    return true; // Phase-1: no quota enforcement
  }

  /**
   * Get full key with namespace
   */
  private getFullKey(key: string): string {
    return `${this.namespace}:${key}`;
  }
}

// Default instance
export const localStorage = new LocalStore();

/**
 * Storage keys helper
 */
export const storageKeys = {
  activeTimer: () => StorageKeys.ACTIVE_TIMER,
  tasks: () => StorageKeys.TASKS,
  routines: () => StorageKeys.ROUTINES,
  settings: () => StorageKeys.SETTINGS,
  log: (date: string) => `${StorageKeys.LOG_PREFIX}${date}`,
} as const;