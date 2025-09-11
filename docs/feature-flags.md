# Phase B+C Feature Flags & Kill-Switches

## Overview
Feature flags and kill-switches to control Phase B+C rollout, ensure safety, and enable quick rollback if needed.

## Feature Flag System

### Flag Definition
```typescript
interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'boolean' | 'percentage' | 'variant';
  value?: number | string;
  conditions: FlagCondition[];
  lastModified: number;
  modifiedBy: string;
}

interface FlagCondition {
  type: 'device_id' | 'user_agent' | 'date_range' | 'quota';
  operator: 'equals' | 'contains' | 'between' | 'greater_than';
  value: string | number;
}
```

### Core Flags

#### 1. Storage & Analytics Flags
```typescript
const ANALYTICS_FLAGS = {
  analytics_v2: {
    key: 'analytics_v2',
    name: 'Advanced Analytics v2',
    description: 'Enable new rollups and analytics features',
    enabled: true,
    type: 'boolean',
    conditions: [
      {
        type: 'quota',
        operator: 'greater_than',
        value: 10 // MB available storage
      }
    ]
  },
  
  rollup_compaction: {
    key: 'rollup_compaction',
    name: 'Rollup Compaction',
    description: 'Enable idle-time rollup compaction',
    enabled: true,
    type: 'boolean'
  },
  
  extended_timeframes: {
    key: 'extended_timeframes',
    name: 'Extended Time Frame Analytics',
    description: 'Enable 7/30/90 day analytics',
    enabled: false,
    type: 'percentage',
    value: 10 // 10% of users
  }
};
```

#### 2. Sync Flags
```typescript
const SYNC_FLAGS = {
  sync_enabled: {
    key: 'sync_enabled',
    name: 'Cloud Sync',
    description: 'Enable cloud synchronization',
    enabled: false,
    type: 'boolean'
  },
  
  sync_uplink: {
    key: 'sync_uplink',
    name: 'Sync Uplink',
    description: 'Enable upload to cloud (read-only sync)',
    enabled: false,
    type: 'boolean',
    dependsOn: ['sync_enabled']
  },
  
  sync_downlink: {
    key: 'sync_downlink',
    name: 'Sync Downlink',
    description: 'Enable download from cloud (full sync)',
    enabled: false,
    type: 'boolean',
    dependsOn: ['sync_enabled', 'sync_uplink']
  },
  
  sync_conflict_resolution: {
    key: 'sync_conflict_resolution',
    name: 'Conflict Resolution',
    description: 'Enable automatic conflict resolution',
    enabled: true,
    type: 'boolean',
    dependsOn: ['sync_downlink']
  },
  
  sync_compression: {
    key: 'sync_compression',
    name: 'Sync Compression',
    description: 'Enable gzip compression for sync data',
    enabled: true,
    type: 'boolean',
    dependsOn: ['sync_enabled']
  }
};
```

#### 3. Push Notification Flags
```typescript
const PUSH_FLAGS = {
  push_enabled: {
    key: 'push_enabled',
    name: 'Push Notifications',
    description: 'Enable push notification system',
    enabled: false,
    type: 'boolean'
  },
  
  push_channel_reminders: {
    key: 'push_channel_reminders',
    name: 'Study Reminders',
    description: 'Enable study reminder notifications',
    enabled: false,
    type: 'boolean',
    dependsOn: ['push_enabled']
  },
  
  push_channel_streak: {
    key: 'push_channel_streak',
    name: 'Streak Protection',
    description: 'Enable streak protection notifications',
    enabled: false,
    type: 'boolean',
    dependsOn: ['push_enabled']
  },
  
  push_channel_summary: {
    key: 'push_channel_summary',
    name: 'Session Summary',
    description: 'Enable session summary notifications',
    enabled: false,
    type: 'boolean',
    dependsOn: ['push_enabled']
  },
  
  push_quiet_hours: {
    key: 'push_quiet_hours',
    name: 'Quiet Hours',
    description: 'Enable quiet hours for notifications',
    enabled: true,
    type: 'boolean',
    dependsOn: ['push_enabled']
  }
};
```

#### 4. Security & Privacy Flags
```typescript
const SECURITY_FLAGS = {
  e2ee_enabled: {
    key: 'e2ee_enabled',
    name: 'End-to-End Encryption',
    description: 'Enable E2EE for sensitive data',
    enabled: false,
    type: 'boolean'
  },
  
  data_export: {
    key: 'data_export',
    name: 'Data Export',
    description: 'Enable data export functionality',
    enabled: false,
    type: 'boolean'
  },
  
  data_import: {
    key: 'data_import',
    name: 'Data Import',
    description: 'Enable data import functionality',
    enabled: false,
    type: 'boolean'
  },
  
  privacy_mode: {
    key: 'privacy_mode',
    name: 'Privacy Mode',
    description: 'Enable enhanced privacy features',
    enabled: false,
    type: 'boolean'
  }
};
```

#### 5. Kill-Switches (Emergency Flags)
```typescript
const KILL_SWITCHES = {
  sync_emergency_stop: {
    key: 'sync_emergency_stop',
    name: 'Sync Emergency Stop',
    description: 'Stop all sync operations immediately',
    enabled: false,
    type: 'boolean',
    priority: 'critical'
  },
  
  push_emergency_stop: {
    key: 'push_emergency_stop',
    name: 'Push Emergency Stop',
    description: 'Stop all push notifications immediately',
    enabled: false,
    type: 'boolean',
    priority: 'critical'
  },
  
  analytics_emergency_stop: {
    key: 'analytics_emergency_stop',
    name: 'Analytics Emergency Stop',
    description: 'Stop all analytics processing',
    enabled: false,
    type: 'boolean',
    priority: 'critical'
  },
  
  maintenance_mode: {
    key: 'maintenance_mode',
    name: 'Maintenance Mode',
    description: 'Enable maintenance mode (read-only)',
    enabled: false,
    type: 'boolean',
    priority: 'high'
  }
};
```

## Flag Management System

### Flag Storage
```typescript
class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private subscribers: Map<string, Set<Function>> = new Map();
  
  constructor() {
    this.loadFlags();
    this.setupFlagSync();
  }
  
  async loadFlags(): Promise<void> {
    try {
      // Load from localStorage first
      const stored = localStorage.getItem('feature_flags');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, flag]) => {
          this.flags.set(key, flag);
        });
      }
      
      // Sync with server if online
      await this.syncFlagsFromServer();
    } catch (error) {
      console.warn('Failed to load feature flags:', error);
    }
  }
  
  async syncFlagsFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/features/flags');
      if (response.ok) {
        const serverFlags = await response.json();
        this.mergeFlags(serverFlags);
      }
    } catch (error) {
      console.warn('Failed to sync flags from server:', error);
    }
  }
  
  mergeFlags(serverFlags: FeatureFlag[]): void {
    serverFlags.forEach(flag => {
      const existing = this.flags.get(flag.key);
      
      // Server flags take precedence unless it's a kill-switch
      if (!existing || !flag.key.startsWith('emergency_')) {
        this.flags.set(flag.key, flag);
        this.notifySubscribers(flag.key, flag);
      }
    });
  }
  
  isFlagEnabled(flagKey: string, context?: FlagContext): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      return false;
    }
    
    // Check kill-switches first
    if (this.isKillSwitchActive()) {
      return false;
    }
    
    // Check dependencies
    if (flag.dependsOn) {
      for (const depKey of flag.dependsOn) {
        if (!this.isFlagEnabled(depKey, context)) {
          return false;
        }
      }
    }
    
    // Check conditions
    if (!this.meetsConditions(flag, context)) {
      return false;
    }
    
    // Check flag type
    if (flag.type === 'boolean') {
      return flag.enabled;
    }
    
    if (flag.type === 'percentage') {
      if (typeof flag.value !== 'number') {
        return false;
      }
      const hash = this.generateHash(flagKey, context);
      return (hash % 100) < flag.value;
    }
    
    if (flag.type === 'variant') {
      return flag.value === context?.variant;
    }
    
    return false;
  }
  
  private isKillSwitchActive(): boolean {
    return Array.from(this.flags.values()).some(flag => 
      flag.key.endsWith('_emergency_stop') && flag.enabled
    );
  }
  
  private meetsConditions(flag: FeatureFlag, context?: FlagContext): boolean {
    if (!flag.conditions || flag.conditions.length === 0) {
      return true;
    }
    
    return flag.conditions.every(condition => {
      return this.evaluateCondition(condition, context);
    });
  }
  
  private evaluateCondition(condition: FlagCondition, context?: FlagContext): boolean {
    const actualValue = this.getConditionValue(condition.type, context);
    
    switch (condition.operator) {
      case 'equals':
        return actualValue === condition.value;
      case 'contains':
        return String(actualValue).includes(String(condition.value));
      case 'between':
        if (typeof actualValue === 'number' && Array.isArray(condition.value)) {
          return actualValue >= condition.value[0] && actualValue <= condition.value[1];
        }
        return false;
      case 'greater_than':
        return Number(actualValue) > Number(condition.value);
      default:
        return false;
    }
  }
  
  private getConditionValue(type: string, context?: FlagContext): any {
    switch (type) {
      case 'device_id':
        return context?.deviceId || '';
      case 'user_agent':
        return navigator.userAgent;
      case 'date_range':
        return Date.now();
      case 'quota':
        return context?.quota || 0;
      default:
        return null;
    }
  }
  
  private generateHash(flagKey: string, context?: FlagContext): number {
    const input = `${flagKey}-${context?.deviceId || 'unknown'}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  subscribe(flagKey: string, callback: Function): () => void {
    if (!this.subscribers.has(flagKey)) {
      this.subscribers.set(flagKey, new Set());
    }
    this.subscribers.get(flagKey)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(flagKey);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(flagKey);
        }
      }
    };
  }
  
  private notifySubscribers(flagKey: string, flag: FeatureFlag): void {
    const subscribers = this.subscribers.get(flagKey);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(flag);
        } catch (error) {
          console.error(`Error in flag subscriber for ${flagKey}:`, error);
        }
      });
    }
  }
}

export const featureFlagManager = new FeatureFlagManager();
```

### Context Evaluation
```typescript
interface FlagContext {
  deviceId: string;
  userId?: string;
  quota: number;
  variant?: string;
  timestamp: number;
}

function createFlagContext(deviceId: string): FlagContext {
  return {
    deviceId,
    timestamp: Date.now(),
    quota: 0 // Will be filled in by storage manager
  };
}
```

## Usage Examples

### Basic Flag Check
```typescript
// Check if sync is enabled
const syncEnabled = featureFlagManager.isFlagEnabled('sync_enabled');

// Check with context
const context = createFlagContext(deviceId);
const downlinkEnabled = featureFlagManager.isFlagEnabled('sync_downlink', context);
```

### Feature Gating
```typescript
class SyncManager {
  async sync(): Promise<void> {
    if (!featureFlagManager.isFlagEnabled('sync_enabled')) {
      throw new Error('Sync is currently disabled');
    }
    
    if (!featureFlagManager.isFlagEnabled('sync_uplink')) {
      // Only download, don't upload
      await this.downloadChanges();
      return;
    }
    
    // Full sync
    await this.fullSync();
  }
}
```

### Percentage Rollout
```typescript
class PushNotificationManager {
  canShowNotifications(): boolean {
    const context = createFlagContext(this.deviceId);
    return featureFlagManager.isFlagEnabled('push_enabled', context);
  }
  
  getEnabledChannels(): string[] {
    const channels = [];
    const context = createFlagContext(this.deviceId);
    
    if (featureFlagManager.isFlagEnabled('push_channel_reminders', context)) {
      channels.push('reminders');
    }
    
    if (featureFlagManager.isFlagEnabled('push_channel_streak', context)) {
      channels.push('streak');
    }
    
    if (featureFlagManager.isFlagEnabled('push_channel_summary', context)) {
      channels.push('summary');
    }
    
    return channels;
  }
}
```

### Emergency Stop
```typescript
class EmergencyManager {
  private checkEmergencyFlags(): void {
    const emergencyFlags = [
      'sync_emergency_stop',
      'push_emergency_stop',
      'analytics_emergency_stop'
    ];
    
    emergencyFlags.forEach(flagKey => {
      if (featureFlagManager.isFlagEnabled(flagKey)) {
        this.handleEmergencyStop(flagKey);
      }
    });
  }
  
  private handleEmergencyStop(flagKey: string): void {
    console.warn(`Emergency stop triggered: ${flagKey}`);
    
    switch (flagKey) {
      case 'sync_emergency_stop':
        this.syncManager.stopAllOperations();
        break;
      case 'push_emergency_stop':
        this.pushManager.stopAllNotifications();
        break;
      case 'analytics_emergency_stop':
        this.analyticsManager.stopProcessing();
        break;
    }
    
    // Show user notification
    this.showEmergencyNotification(flagKey);
  }
}
```

## Flag Persistence & Sync

### Local Storage Format
```typescript
interface LocalFlagStorage {
  version: string;
  flags: Record<string, FeatureFlag>;
  lastSync: number;
  deviceId: string;
}

async function saveFlagsToStorage(flags: Map<string, FeatureFlag>): Promise<void> {
  const storage: LocalFlagStorage = {
    version: '1.0',
    flags: Object.fromEntries(flags),
    lastSync: Date.now(),
    deviceId: getCurrentDeviceId()
  };
  
  localStorage.setItem('feature_flags', JSON.stringify(storage));
}

async function loadFlagsFromStorage(): Promise<Map<string, FeatureFlag>> {
  const stored = localStorage.getItem('feature_flags');
  if (!stored) {
    return new Map();
  }
  
  try {
    const storage: LocalFlagStorage = JSON.parse(stored);
    return new Map(Object.entries(storage.flags));
  } catch (error) {
    console.warn('Failed to parse stored flags:', error);
    return new Map();
  }
}
```

### Server Sync API
```typescript
interface ServerFlagSyncRequest {
  deviceId: string;
  flags: FeatureFlag[];
  version: string;
}

interface ServerFlagSyncResponse {
  flags: FeatureFlag[];
  version: string;
  lastModified: number;
  requiresRestart: boolean;
}

async function syncFlagsWithServer(flags: Map<string, FeatureFlag>): Promise<void> {
  try {
    const request: ServerFlagSyncRequest = {
      deviceId: getCurrentDeviceId(),
      flags: Array.from(flags.values()),
      version: '1.0'
    };
    
    const response = await fetch('/api/features/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (response.ok) {
      const syncResponse: ServerFlagSyncResponse = await response.json();
      
      // Merge server flags
      const serverFlags = new Map(
        syncResponse.flags.map(flag => [flag.key, flag])
      );
      
      // Server flags take precedence for non-kill-switches
      serverFlags.forEach((serverFlag, key) => {
        if (!key.includes('emergency_stop') || !flags.has(key)) {
          flags.set(key, serverFlag);
        }
      });
      
      if (syncResponse.requiresRestart) {
        window.location.reload();
      }
    }
  } catch (error) {
    console.warn('Failed to sync flags with server:', error);
  }
}
```

## Testing with Flags

### Test Utilities
```typescript
class FeatureFlagTestHelper {
  private originalFlags: Map<string, FeatureFlag>;
  
  constructor() {
    this.originalFlags = new Map(featureFlagManager['flags']);
  }
  
  setFlag(key: string, enabled: boolean): void {
    const flag = featureFlagManager['flags'].get(key);
    if (flag) {
      flag.enabled = enabled;
    } else {
      featureFlagManager['flags'].set(key, {
        key,
        name: key,
        description: 'Test flag',
        enabled,
        type: 'boolean',
        conditions: [],
        lastModified: Date.now(),
        modifiedBy: 'test'
      });
    }
  }
  
  restore(): void {
    featureFlagManager['flags'] = new Map(this.originalFlags);
  }
}

// Usage in tests
describe('SyncManager', () => {
  let flagHelper: FeatureFlagTestHelper;
  
  beforeEach(() => {
    flagHelper = new FeatureFlagTestHelper();
  });
  
  afterEach(() => {
    flagHelper.restore();
  });
  
  it('should not sync when disabled', () => {
    flagHelper.setFlag('sync_enabled', false);
    
    const syncManager = new SyncManager();
    expect(() => syncManager.sync()).toThrow('Sync is currently disabled');
  });
});
```

## Monitoring & Alerting

### Flag Usage Metrics
```typescript
interface FlagUsageMetrics {
  flagKey: string;
  enabled: boolean;
  checkCount: number;
  enabledCount: number;
  timestamp: number;
  deviceId: string;
}

class FlagUsageTracker {
  private metrics: Map<string, FlagUsageMetrics> = new Map();
  
  trackFlagCheck(flagKey: string, enabled: boolean, context: FlagContext): void {
    const key = `${flagKey}-${context.deviceId}`;
    let metric = this.metrics.get(key);
    
    if (!metric) {
      metric = {
        flagKey,
        enabled,
        checkCount: 0,
        enabledCount: 0,
        timestamp: Date.now(),
        deviceId: context.deviceId
      };
      this.metrics.set(key, metric);
    }
    
    metric.checkCount++;
    if (enabled) {
      metric.enabledCount++;
    }
    metric.timestamp = Date.now();
  }
  
  getMetrics(): FlagUsageMetrics[] {
    return Array.from(this.metrics.values());
  }
  
  async reportMetrics(): Promise<void> {
    if (this.metrics.size === 0) {
      return;
    }
    
    try {
      await fetch('/api/features/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.getMetrics())
      });
      
      this.metrics.clear();
    } catch (error) {
      console.warn('Failed to report flag metrics:', error);
    }
  }
}
```