'use client';

import { useGlobalState } from './use-global-state';
import { DEFAULT_FLAGS, type FeatureFlag, type FlagContext, createFlagContext } from '@/lib/feature-flags';

export function useFeatureFlags() {
  const { state } = useGlobalState();

  // Create flag context with a device ID from localStorage
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', deviceId);
  }

  // Create flag context
  const flagContext: FlagContext = createFlagContext(deviceId);

  // Check if a flag is enabled
  const isEnabled = (flagKey: string): boolean => {
    const flag = DEFAULT_FLAGS[flagKey as keyof typeof DEFAULT_FLAGS];
    if (!flag) {
      return false;
    }

    // Check emergency kill switches first
    if (flagKey !== 'analytics_emergency_stop' && DEFAULT_FLAGS.analytics_emergency_stop.enabled) {
      return false;
    }
    if (flagKey !== 'migration_emergency_stop' && DEFAULT_FLAGS.migration_emergency_stop.enabled) {
      return false;
    }

    // If flag is not enabled, return false
    if (!flag.enabled) {
      return false;
    }

    // Check dependencies (if any)
    if ('dependsOn' in flag && flag.dependsOn) {
      for (const dep of flag.dependsOn) {
        if (!isEnabled(dep)) {
          return false;
        }
      }
    }

    // Check conditions (if any)
    if ('conditions' in flag && flag.conditions) {
      for (const condition of flag.conditions) {
        if (!evaluateCondition(condition, flagContext)) {
          return false;
        }
      }
    }

    // For percentage-based flags, check if user is in rollout
    if (flag.type === 'percentage' && typeof flag.value === 'number') {
      if (flag.value >= 100) return true;
      if (flag.value <= 0) return false;

      // Use deviceId for consistent rollout
      const hash = simpleHash(deviceId + flagKey);
      return (hash % 100) < flag.value;
    }

    return true;
  };

  // Get flag value for variant flags
  const getFlagValue = (flagKey: string): string | number | undefined => {
    const flag = DEFAULT_FLAGS[flagKey as keyof typeof DEFAULT_FLAGS];
    if (!flag || !isEnabled(flagKey)) {
      return undefined;
    }
    return 'value' in flag ? flag.value : undefined;
  };

  // Get all enabled flags
  const getEnabledFlags = (): any[] => {
    return Object.values(DEFAULT_FLAGS).filter(flag => isEnabled(flag.key));
  };

  return {
    isEnabled,
    getFlagValue,
    getEnabledFlags,
    flagContext
  };
}

// Evaluate a single condition
function evaluateCondition(condition: any, context: FlagContext): boolean {
  switch (condition.type) {
    case 'storage':
      if (condition.operator === 'greater_than') {
        return context.storage > condition.value;
      }
      break;
    // Add more condition types as needed
    default:
      return true;
  }
  return false;
}

// Simple hash function for consistent percentage-based rollout
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}