// Phase B+C Feature Flags Configuration
// This file defines all feature flags for Phase B+C rollout

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'boolean' | 'percentage' | 'variant';
  value?: number | string;
  conditions: FlagCondition[];
  dependsOn?: string[];
  lastModified?: number;
  modifiedBy?: string;
}

export interface FlagCondition {
  type: 'device_id' | 'user_agent' | 'date_range' | 'quota' | 'storage';
  operator: 'equals' | 'contains' | 'between' | 'greater_than' | 'less_than';
  value: string | number;
}

export interface FlagContext {
  deviceId: string;
  userId?: string;
  quota: number;
  storage: number;
  variant?: string;
  timestamp: number;
}

// Slice 1: Storage & Analytics Flags
export const ANALYTICS_FLAGS = {
  analytics_v2: {
    key: 'analytics_v2',
    name: 'Advanced Analytics v2',
    description: 'Enable new IndexedDB v2 storage and advanced analytics features',
    enabled: false, // OFF by default for safe rollout
    type: 'boolean' as const,
    conditions: [
      {
        type: 'storage',
        operator: 'greater_than',
        value: 10 // MB available storage
      }
    ],
    lastModified: Date.now(),
    modifiedBy: 'system'
  },
  
  rollup_compaction: {
    key: 'rollup_compaction',
    name: 'Rollup Compaction',
    description: 'Enable idle-time rollup compaction',
    enabled: true,
    type: 'boolean' as const,
    conditions: [],
    lastModified: Date.now(),
    modifiedBy: 'system'
  },
  
  extended_timeframes: {
    key: 'extended_timeframes',
    name: 'Extended Time Frame Analytics',
    description: 'Enable 7/30/90 day analytics',
    enabled: false,
    type: 'percentage' as const,
    value: 10, // 10% of users
    conditions: [],
    lastModified: Date.now(),
    modifiedBy: 'system'
  }
};

// Slice 2: Productive Time Metrics Flags
export const PRODUCTIVE_TIME_FLAGS = {
  productive_time_metrics: {
    key: 'productive_time_metrics',
    name: 'Productive Time Metrics',
    description: 'Track and display productive time, pause duration, and focus percentage',
    enabled: true,
    type: 'percentage' as const,
    value: 100, // Roll out to 100% of users
    conditions: [],
    lastModified: Date.now(),
    modifiedBy: 'system'
  },

  focus_forecasting: {
    key: 'focus_forecasting',
    name: 'Focus Forecasting',
    description: 'Show focus predictions and recommendations based on historical data',
    enabled: true,
    type: 'percentage' as const,
    value: 100,
    dependsOn: ['productive_time_metrics'],
    conditions: [],
    lastModified: Date.now(),
    modifiedBy: 'system'
  },

  session_quality_widget: {
    key: 'session_quality_widget',
    name: 'Session Quality Widget',
    description: 'Display session quality metrics on dashboard',
    enabled: true,
    type: 'percentage' as const,
    value: 100,
    dependsOn: ['productive_time_metrics'],
    conditions: [],
    lastModified: Date.now(),
    modifiedBy: 'system'
  },

  activity_insights: {
    key: 'activity_insights',
    name: 'Activity Insights',
    description: 'Show activity insights and baselines on plans page',
    enabled: true,
    type: 'percentage' as const,
    value: 100,
    dependsOn: ['productive_time_metrics', 'focus_forecasting'],
    conditions: [],
    lastModified: Date.now(),
    modifiedBy: 'system'
  },

  migration_v2: {
    key: 'migration_v2',
    name: 'Metrics Migration v2',
    description: 'Enable migration to new metrics format with pause tracking',
    enabled: true,
    type: 'percentage' as const,
    value: 100,
    conditions: [],
    lastModified: Date.now(),
    modifiedBy: 'system'
  }
};

// Slice 3: Sync Uplink Flags
export const SYNC_FLAGS = {
  sync_enabled: {
    key: 'sync_enabled',
    name: 'Cloud Sync',
    description: 'Enable cloud synchronization',
    enabled: false,
    type: 'boolean' as const,
    conditions: [],
    lastModified: Date.now(),
    modifiedBy: 'system'
  },

  sync_uplink: {
    key: 'sync_uplink',
    name: 'Sync Uplink',
    description: 'Enable upload to cloud (read-only sync)',
    enabled: false,
    type: 'boolean' as const,
    dependsOn: ['sync_enabled'],
    conditions: [],
    lastModified: Date.now(),
    modifiedBy: 'system'
  }
};

// Emergency Kill Switches
export const KILL_SWITCHES = {
  analytics_emergency_stop: {
    key: 'analytics_emergency_stop',
    name: 'Analytics Emergency Stop',
    description: 'Stop all analytics processing immediately',
    enabled: false,
    type: 'boolean' as const,
    conditions: [],
    lastModified: Date.now(),
    modifiedBy: 'system'
  },
  
  migration_emergency_stop: {
    key: 'migration_emergency_stop',
    name: 'Migration Emergency Stop',
    description: 'Stop all database migrations immediately',
    enabled: false,
    type: 'boolean' as const,
    conditions: [],
    lastModified: Date.now(),
    modifiedBy: 'system'
  }
};

// Default flag configuration
export const DEFAULT_FLAGS = {
  ...ANALYTICS_FLAGS,
  ...PRODUCTIVE_TIME_FLAGS,
  ...SYNC_FLAGS,
  ...KILL_SWITCHES
};

// Flag validation
export function validateFlag(flag: FeatureFlag): boolean {
  if (!flag.key || !flag.name || !flag.description) {
    return false;
  }
  
  if (flag.type === 'percentage' && (typeof flag.value !== 'number' || flag.value < 0 || flag.value > 100)) {
    return false;
  }
  
  // Check dependencies exist
  if (flag.dependsOn) {
    for (const dep of flag.dependsOn) {
      if (!DEFAULT_FLAGS[dep as keyof typeof DEFAULT_FLAGS]) {
        return false;
      }
    }
  }
  
  return true;
}

// Generate flag context for current device
export function createFlagContext(deviceId: string): FlagContext {
  return {
    deviceId,
    timestamp: Date.now(),
    quota: 0, // Will be filled in by storage manager
    storage: 0 // Will be filled in by storage manager
  };
}