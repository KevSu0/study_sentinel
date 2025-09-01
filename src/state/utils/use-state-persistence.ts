import { useCallback } from 'react';
import type { StatePersistence, PersistenceConfig } from '../types/state-types';

// Default persistence configuration
const DEFAULT_CONFIG: PersistenceConfig = {
  key: 'study_sentinel',
  version: 1,
  serialize: JSON.stringify,
  deserialize: JSON.parse,
};

// Storage keys constants (migrated from original)
export const STORAGE_KEYS = {
  TASKS: 'study_sentinel_tasks',
  ROUTINES: 'study_sentinel_routines',
  PROFILE: 'study_sentinel_profile',
  BADGES: 'study_sentinel_badges',
  CUSTOM_BADGES: 'study_sentinel_custom_badges',
  SYSTEM_BADGES_CONFIG: 'study_sentinel_system_badges_config',
  EARNED_BADGES: 'study_sentinel_earned_badges',
  SOUND_SETTINGS: 'study_sentinel_sound_settings',
  TIMER: 'study_sentinel_timer',
  LOGS: 'study_sentinel_logs',
  SESSIONS: 'study_sentinel_sessions',
} as const;

/**
 * Custom hook for state persistence operations
 * Provides a clean abstraction over localStorage with error handling
 */
export const useStatePersistence = (config: Partial<PersistenceConfig> = {}): StatePersistence => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const save = useCallback(<T>(key: string, data: T): void => {
    try {
      const serialized = finalConfig.serialize!(data);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Failed to save data to localStorage for key: ${key}`, error);
    }
  }, [finalConfig]);

  const load = useCallback(<T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return finalConfig.deserialize!(item) as T;
    } catch (error) {
      console.error(`Failed to load data from localStorage for key: ${key}`, error);
      return defaultValue;
    }
  }, [finalConfig]);

  const remove = useCallback((key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove data from localStorage for key: ${key}`, error);
    }
  }, []);

  const clear = useCallback((): void => {
    try {
      // Only clear study_sentinel related keys
      const keysToRemove = Object.values(STORAGE_KEYS);
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear localStorage', error);
    }
  }, []);

  return {
    save,
    load,
    remove,
    clear,
  };
};

/**
 * Utility functions for specific data types
 */
export const persistenceUtils = {
  /**
   * Save Map data structure to localStorage
   */
  saveMap: <K, V>(key: string, map: Map<K, V>): void => {
    try {
      const array = Array.from(map.entries());
      localStorage.setItem(key, JSON.stringify(array));
    } catch (error) {
      console.error(`Failed to save Map to localStorage for key: ${key}`, error);
    }
  },

  /**
   * Load Map data structure from localStorage
   */
  loadMap: <K, V>(key: string, defaultValue: Map<K, V> = new Map()): Map<K, V> => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      const array = JSON.parse(item) as [K, V][];
      return new Map(array);
    } catch (error) {
      console.error(`Failed to load Map from localStorage for key: ${key}`, error);
      return defaultValue;
    }
  },

  /**
   * Save Date object to localStorage
   */
  saveDate: (key: string, date: Date): void => {
    try {
      localStorage.setItem(key, date.toISOString());
    } catch (error) {
      console.error(`Failed to save Date to localStorage for key: ${key}`, error);
    }
  },

  /**
   * Load Date object from localStorage
   */
  loadDate: (key: string, defaultValue: Date = new Date()): Date => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return new Date(item);
    } catch (error) {
      console.error(`Failed to load Date from localStorage for key: ${key}`, error);
      return defaultValue;
    }
  },

  /**
   * Check if localStorage is available
   */
  isAvailable: (): boolean => {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get storage usage information
   */
  getStorageInfo: () => {
    if (!persistenceUtils.isAvailable()) {
      return { available: false, used: 0, total: 0 };
    }

    try {
      let used = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Estimate total available space (varies by browser, typically 5-10MB)
      const total = 5 * 1024 * 1024; // 5MB estimate
      
      return {
        available: true,
        used,
        total,
        percentage: (used / total) * 100,
      };
    } catch (error) {
      console.error('Failed to get storage info', error);
      return { available: true, used: 0, total: 0, percentage: 0 };
    }
  },
};

/**
 * Hook for managing state hydration from localStorage
 */
export const useStateHydration = () => {
  const persistence = useStatePersistence();

  const hydrateState = useCallback(<T>(key: string, defaultValue: T): T => {
    return persistence.load(key, defaultValue);
  }, [persistence]);

  const dehydrateState = useCallback(<T>(key: string, state: T): void => {
    persistence.save(key, state);
  }, [persistence]);

  return {
    hydrateState,
    dehydrateState,
    persistence,
  };
};

/**
 * Migration utilities for handling version changes
 */
export const migrationUtils = {
  /**
   * Get current data version
   */
  getCurrentVersion: (): number => {
    try {
      const version = localStorage.getItem('study_sentinel_version');
      return version ? parseInt(version, 10) : 1;
    } catch {
      return 1;
    }
  },

  /**
   * Set current data version
   */
  setCurrentVersion: (version: number): void => {
    try {
      localStorage.setItem('study_sentinel_version', version.toString());
    } catch (error) {
      console.error('Failed to set version', error);
    }
  },

  /**
   * Check if migration is needed
   */
  needsMigration: (targetVersion: number): boolean => {
    const currentVersion = migrationUtils.getCurrentVersion();
    return currentVersion < targetVersion;
  },

  /**
   * Backup current data before migration
   */
  backupData: (): void => {
    try {
      const backup: Record<string, string> = {};
      Object.values(STORAGE_KEYS).forEach((key: string) => {
        const value = localStorage.getItem(key);
        if (value !== null) {
          backup[key] = value;
        }
      });
      
      const timestamp = new Date().toISOString();
      localStorage.setItem(`study_sentinel_backup_${timestamp}`, JSON.stringify(backup));
    } catch (error) {
      console.error('Failed to backup data', error);
    }
  },
};