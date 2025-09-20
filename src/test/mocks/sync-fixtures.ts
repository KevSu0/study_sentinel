import type { SyncStatus } from '@/lib/sync-engine';
import type { NotificationSettings } from '@/lib/notifications';
import type { StorageUsage, SystemHealthReport } from '@/lib/diagnostics';

type SyncDiagnosticsFixture = {
  lastSyncAt: string | null;
  queueDepth: number;
  failures: number;
  status: 'idle' | 'running' | 'error';
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const DEFAULT_SYNC_STATUS: SyncStatus = {
  isOnline: true,
  syncInProgress: false,
  pendingEvents: 3,
  failedEvents: 1,
  lastSync: new Date('2024-01-15T09:00:00Z').getTime(),
};

const DEFAULT_DIAGNOSTICS: SyncDiagnosticsFixture = {
  lastSyncAt: new Date('2024-01-15T09:00:00Z').toISOString(),
  queueDepth: DEFAULT_SYNC_STATUS.pendingEvents,
  failures: DEFAULT_SYNC_STATUS.failedEvents,
  status: 'idle',
};

const mapDiagnosticsStatusToHealth = (status: SyncDiagnosticsFixture['status']): 'healthy' | 'warning' | 'critical' => {
  switch (status) {
    case 'error':
      return 'critical';
    case 'running':
      return 'warning';
    default:
      return 'healthy';
  }
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  studyReminders: true,
  streakProtection: false,
  sessionSummaries: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
  dailyCap: 5,
  channels: {
    studyReminders: true,
    streakProtection: false,
    sessionSummaries: true,
  },
};

const DEFAULT_STORAGE_USAGE: StorageUsage = {
  totalUsage: 25,
  totalQuota: 100,
  usagePercent: 25,
  breakdown: {
    events: 10,
    outbox: 5,
    rollups: 8,
    other: 2,
  },
};

const DEFAULT_E2EE_INFO = {
  hasKey: true,
  hasRecoveryPhrase: false,
  createdAt: new Date('2023-12-01T10:00:00Z').toISOString(),
};

let syncStatusFixture: SyncStatus = { ...DEFAULT_SYNC_STATUS };
let diagnosticsFixture: SyncDiagnosticsFixture = { ...DEFAULT_DIAGNOSTICS };
let notificationSettingsFixture: NotificationSettings = clone(DEFAULT_NOTIFICATION_SETTINGS);
let e2eeInfoFixture = { ...DEFAULT_E2EE_INFO };
let isE2eeUnlocked = true;
let forceSyncResult: { success: boolean; error?: string } = { success: true };

const buildSystemHealthReport = (): SystemHealthReport => ({
  overallStatus: mapDiagnosticsStatusToHealth(diagnosticsFixture.status),
  healthChecks: {
    sync: {
      status: mapDiagnosticsStatusToHealth(diagnosticsFixture.status),
      message: `Queue depth ${diagnosticsFixture.queueDepth}, failures ${diagnosticsFixture.failures}`,
    },
  },
  metrics: {
    syncQueueDepth: {
      name: 'Sync queue depth',
      value: diagnosticsFixture.queueDepth,
      unit: 'events',
      timestamp: Date.now(),
    },
    syncFailures: {
      name: 'Sync failures',
      value: diagnosticsFixture.failures,
      unit: 'events',
      timestamp: Date.now(),
    },
  },
  timestamp: Date.now(),
});

const applySuccessfulSyncMutation = () => {
  const now = Date.now();
  syncStatusFixture = {
    ...syncStatusFixture,
    pendingEvents: Math.max(0, syncStatusFixture.pendingEvents - 1),
    failedEvents: 0,
    lastSync: now,
    syncInProgress: false,
  };

  diagnosticsFixture = {
    ...diagnosticsFixture,
    status: 'idle',
    queueDepth: Math.max(0, diagnosticsFixture.queueDepth - 1),
    failures: 0,
    lastSyncAt: new Date(now).toISOString(),
  };
};

const applyFailedSyncMutation = () => {
  syncStatusFixture = {
    ...syncStatusFixture,
    failedEvents: syncStatusFixture.failedEvents + 1,
    syncInProgress: false,
  };

  diagnosticsFixture = {
    ...diagnosticsFixture,
    failures: diagnosticsFixture.failures + 1,
    status: 'error',
  };
};

const forceSyncImpl = async () => {
  if (forceSyncResult.success) {
    applySuccessfulSyncMutation();
  } else {
    applyFailedSyncMutation();
  }
  return forceSyncResult;
};

export const syncEngineMock = {
  getSyncStatus: jest.fn(async () => ({ ...syncStatusFixture })),
  forceSync: jest.fn(forceSyncImpl),
  clearFailedEvents: jest.fn(async () => {
    const cleared = syncStatusFixture.failedEvents;
    syncStatusFixture = { ...syncStatusFixture, failedEvents: 0 };
    diagnosticsFixture = { ...diagnosticsFixture, failures: 0, status: 'idle' };
    return cleared;
  }),
  exportData: jest.fn(async () => ({
    version: '1.0',
    exportedAt: Date.now(),
    deviceId: 'test-device',
    events: [],
    settings: null,
    checkpoint: null,
  })),
  importData: jest.fn(),
};

export const diagnosticsManagerMock = {
  getStorageUsage: jest.fn(async () => clone(DEFAULT_STORAGE_USAGE)),
  getSystemHealth: jest.fn(async () => buildSystemHealthReport()),
};

export const cacheManagerMock = {
  clearPublicityCaches: jest.fn(async () => true),
};

export const notificationManagerMock = {
  pushManager: {},
  scheduler: {},
  settingsManager: {
    getSettings: jest.fn(async () => clone(notificationSettingsFixture)),
    enableChannel: jest.fn(async (channel: keyof NotificationSettings['channels']) => {
      notificationSettingsFixture = {
        ...notificationSettingsFixture,
        [channel]: true,
        channels: {
          ...notificationSettingsFixture.channels,
          [channel]: true,
        },
      };
    }),
    disableChannel: jest.fn(async (channel: keyof NotificationSettings['channels']) => {
      notificationSettingsFixture = {
        ...notificationSettingsFixture,
        [channel]: false,
        channels: {
          ...notificationSettingsFixture.channels,
          [channel]: false,
        },
      };
    }),
  },
};

export const e2eeManagerMock = {
  getKeyInfo: jest.fn(async () => ({ ...e2eeInfoFixture })),
  isKeyUnlocked: jest.fn(() => isE2eeUnlocked),
  lock: jest.fn(() => {
    isE2eeUnlocked = false;
  }),
  unlock: jest.fn(async () => {
    isE2eeUnlocked = true;
    return true;
  }),
};

export const getSyncStatusFixture = () => ({ ...syncStatusFixture });
export const getDiagnosticsFixture = () => ({ ...diagnosticsFixture });
export const getNotificationSettingsFixture = () => clone(notificationSettingsFixture);

export const setSyncStatusFixture = (overrides: Partial<SyncStatus>) => {
  syncStatusFixture = { ...syncStatusFixture, ...overrides };
};

export const setDiagnosticsFixture = (overrides: Partial<SyncDiagnosticsFixture>) => {
  diagnosticsFixture = { ...diagnosticsFixture, ...overrides };
};

export const setNotificationSettingsFixture = (overrides: Partial<NotificationSettings>) => {
  notificationSettingsFixture = {
    ...notificationSettingsFixture,
    ...overrides,
    channels: {
      ...notificationSettingsFixture.channels,
      ...(overrides.channels ?? {}),
    },
  };
};

export const setE2eeInfoFixture = (overrides: Partial<typeof DEFAULT_E2EE_INFO>) => {
  e2eeInfoFixture = { ...e2eeInfoFixture, ...overrides };
};

export const setForceSyncResult = (result: { success: boolean; error?: string }) => {
  forceSyncResult = result;
};

export const setE2eeUnlocked = (unlocked: boolean) => {
  isE2eeUnlocked = unlocked;
};

export const resetSyncFixtures = () => {
  syncStatusFixture = { ...DEFAULT_SYNC_STATUS };
  diagnosticsFixture = { ...DEFAULT_DIAGNOSTICS };
  notificationSettingsFixture = clone(DEFAULT_NOTIFICATION_SETTINGS);
  e2eeInfoFixture = { ...DEFAULT_E2EE_INFO };
  isE2eeUnlocked = true;
  forceSyncResult = { success: true };

  syncEngineMock.getSyncStatus.mockClear();
  syncEngineMock.forceSync.mockClear();
  syncEngineMock.forceSync.mockImplementation(forceSyncImpl);
  syncEngineMock.clearFailedEvents.mockClear();
  syncEngineMock.exportData.mockClear();
  syncEngineMock.importData.mockClear();

  diagnosticsManagerMock.getStorageUsage.mockClear();
  diagnosticsManagerMock.getSystemHealth.mockClear();

  cacheManagerMock.clearPublicityCaches.mockClear();

  notificationManagerMock.settingsManager.getSettings.mockClear();
  notificationManagerMock.settingsManager.enableChannel.mockClear();
  notificationManagerMock.settingsManager.disableChannel.mockClear();

  e2eeManagerMock.getKeyInfo.mockClear();
  e2eeManagerMock.isKeyUnlocked.mockClear();
  e2eeManagerMock.lock.mockClear();
  e2eeManagerMock.unlock.mockClear();
};

resetSyncFixtures();
