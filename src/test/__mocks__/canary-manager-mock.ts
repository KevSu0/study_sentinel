import type { CanaryDevice } from '@/lib/canary-manager';
import type { AlertThresholds, MonitoringMetrics } from '@/lib/monitoring-dashboard';

type RolloutCriteria = {
  minMigrationSuccess: number;
  maxResponseTime: number;
  maxErrorRate: number;
};

const DEFAULT_CRITERIA: RolloutCriteria = {
  minMigrationSuccess: 1,
  maxResponseTime: 1000,
  maxErrorRate: 0,
};

const DEFAULT_DEVICE: CanaryDevice = {
  id: 'mock-device',
  name: 'Mock Device',
  owner: 'mock-owner',
  deviceType: 'desktop',
  browser: 'Chrome',
  os: 'MockOS',
  enrolledAt: Date.now(),
  lastActive: Date.now(),
  status: 'active',
};

type MockRolloutConfig = {
  canaryDevices: string[];
  rolloutPercentage: number;
  enabled: boolean;
  startTime: number;
  criteria: RolloutCriteria;
};

export class MockCanaryManager {
  private rolloutPercentage = 0;
  private enabled = true;
  private startTime = Date.now();
  private devices: CanaryDevice[] = [{ ...DEFAULT_DEVICE }];
  private subscribers = new Set<() => void>();
  private currentDeviceId = DEFAULT_DEVICE.id;
  private criteria: RolloutCriteria = { ...DEFAULT_CRITERIA };
  private config: MockRolloutConfig = this.buildConfig();

  private buildConfig(): MockRolloutConfig {
    return {
      canaryDevices: this.devices.map(device => device.id),
      rolloutPercentage: this.rolloutPercentage,
      enabled: this.enabled,
      startTime: this.startTime,
      criteria: { ...this.criteria },
    };
  }

  private updateConfig(options: { notify?: boolean } = {}): void {
    const { notify = true } = options;
    this.config = this.buildConfig();
    if (notify) {
      this.notify();
    }
  }

  private upsertDevice(id: string, info: Partial<CanaryDevice>): CanaryDevice {
    const base: CanaryDevice = {
      ...DEFAULT_DEVICE,
      id,
      name: info.name ?? id,
      owner: info.owner ?? 'mock-owner',
      deviceType: info.deviceType ?? 'desktop',
      browser: info.browser ?? 'Chrome',
      os: info.os ?? 'MockOS',
      status: info.status ?? 'active',
    };

    const existing = this.devices.find(device => device.id === id);
    if (existing) {
      Object.assign(existing, base);
      existing.lastActive = Date.now();
      return existing;
    }

    const created: CanaryDevice = {
      ...base,
      enrolledAt: Date.now(),
      lastActive: Date.now(),
    };
    this.devices.push(created);
    return created;
  }

  updateCanaryDevices(deviceIds: string[]): void {
    this.devices = deviceIds.length
      ? deviceIds.map(id => ({ ...DEFAULT_DEVICE, id, name: id, enrolledAt: Date.now(), lastActive: Date.now() }))
      : [];
    this.updateConfig();
  }

  addCanaryDevice(id: string, info: Partial<CanaryDevice>): void {
    this.upsertDevice(id, info);
    this.updateConfig();
  }

  removeCanaryDevice(id: string): void {
    this.devices = this.devices.filter(device => device.id !== id);
    this.updateConfig();
  }

  updateThresholds(partial?: Partial<RolloutCriteria>): void {
    if (partial) {
      this.criteria = { ...this.criteria, ...partial };
      this.updateConfig();
    }
  }

  updateCanaryDevice(id: string, info: Partial<CanaryDevice>): void {
    this.upsertDevice(id, info);
    this.updateConfig();
  }

  updateCanaryDeviceMetrics(id: string, metrics: CanaryDevice['metrics']): void {
    this.reportDeviceMetrics(id, metrics);
  }

  reportDeviceMetrics(id: string, metrics: CanaryDevice['metrics']): void {
    const device = this.upsertDevice(id, {});
    device.metrics = metrics;
    this.updateConfig();
  }

  enableCanary(): void {
    this.enabled = true;
    this.rolloutPercentage = 0;
    this.startTime = Date.now();
    this.updateConfig();
  }

  enableRollout(): void {
    this.enableCanary();
  }

  disableRollout(): void {
    this.enabled = false;
    this.rolloutPercentage = 0;
    this.updateConfig();
  }

  optIn(id: string = this.currentDeviceId): void {
    this.enableCanary();
    this.upsertDevice(id, { status: 'active' });
    this.updateConfig();
  }

  optOut(id: string = this.currentDeviceId): void {
    const device = this.devices.find(d => d.id === id);
    if (device) {
      device.status = 'inactive';
      device.lastActive = Date.now();
      this.updateConfig();
    }
  }

  canProgressToNextStage(): boolean {
    return this.enabled && this.rolloutPercentage < 100 && this.getActiveCanaries().length > 0;
  }

  progressToSmallCohort(): boolean {
    this.rolloutPercentage = 15;
    this.updateConfig();
    return true;
  }

  progressToFullInternal(): boolean {
    this.rolloutPercentage = 100;
    this.updateConfig();
    return true;
  }

  getRolloutStage(): 'disabled' | 'canary' | 'small-cohort' | 'full-internal' {
    if (!this.enabled) return 'disabled';
    if (this.rolloutPercentage === 0) return 'canary';
    if (this.rolloutPercentage < 100) return 'small-cohort';
    return 'full-internal';
  }

  getRolloutStatus(): {
    enabled: boolean;
    canaryCount: number;
    rolloutPercentage: number;
    startTime: number;
    uptime: number;
  } {
    return {
      enabled: this.enabled,
      canaryCount: this.config.canaryDevices.length,
      rolloutPercentage: this.rolloutPercentage,
      startTime: this.startTime,
      uptime: Date.now() - this.startTime,
    };
  }

  getAllDevices(): CanaryDevice[] {
    return this.devices.map(device => ({ ...device }));
  }

  getActiveCanaries(): CanaryDevice[] {
    return this.devices.filter(device => device.status === 'active');
  }

  getDeviceStatus(id: string): CanaryDevice | undefined {
    return this.devices.find(device => device.id === id);
  }

  isEligibleForRollout(deviceId: string): boolean {
    return this.enabled && this.config.canaryDevices.includes(deviceId);
  }

  isCanaryDevice(deviceId: string): boolean {
    return this.config.canaryDevices.includes(deviceId);
  }

  getConfig(): MockRolloutConfig {
    return { ...this.config, criteria: { ...this.config.criteria } };
  }

  getCanaryReport(): string {
    return this.generateReport();
  }

  generateReport(): string {
    const status = this.getRolloutStatus();
    const active = this.getActiveCanaries();
    const lines = active.length
      ? active.map(device => `  - ${device.name} (${device.id})`).join('\n')
      : '  (none)';

    return `Canary Rollout Report\nEnabled: ${status.enabled}\nStage: ${this.getRolloutStage()}\nRollout: ${status.rolloutPercentage}%\nCanaries: ${status.canaryCount}\nActive:\n${lines}`;
  }

  onConfigChange(handler: () => void): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  initializeForCurrentDevice(): void {
    this.upsertDevice(this.currentDeviceId, { status: 'active' });
    this.updateConfig();
  }

  getCurrentDeviceId(): string {
    return this.currentDeviceId;
  }

  shouldEnableAnalyticsV2(): boolean {
    return this.enabled;
  }

  hashString(value: string): number {
    return value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }

  private notify(): void {
    for (const handler of this.subscribers) {
      handler();
    }
  }
}

export class MockMonitoringDashboard {
  private alerts: string[] = [];
  private thresholds: Partial<AlertThresholds> = {};
  private metrics: MonitoringMetrics = {
    timestamp: Date.now(),
    migration: {
      successRate: 1,
      inProgress: 0,
      failed: 0,
      lastMigration: Date.now(),
      totalEvents: 1,
      migratedEvents: 1,
    },
    performance: {
      coldStart: 1000,
      ttr: 1000,
      compaction: 100,
      memoryUsage: 1,
      storageUsage: 1,
      storageQuota: 10,
    },
    errors: {
      rollup: 0,
      migration: 0,
      storage: 0,
      total: 0,
    },
    storage: {
      used: 1,
      quota: 10,
      growthRate: 0,
      backups: 1,
    },
    userExperience: {
      regressionRate: 0,
      satisfaction: 1,
      reportedIssues: 0,
    },
  };

  updateThresholds(partial?: Partial<AlertThresholds>): void {
    if (partial) {
      this.thresholds = { ...this.thresholds, ...partial };
    }
  }

  log(): void {}

  clearAlerts(): void {
    this.alerts = [];
  }

  notifyAlert(message: string, _severity: 'critical' | 'warning' = 'critical'): void {
    this.alerts.push(message);
  }

  getAlerts(): string[] {
    return [...this.alerts];
  }

  getCurrentMetrics(): MonitoringMetrics {
    return { ...this.metrics, timestamp: Date.now() };
  }

  generateReport(): string {
    return 'Mock monitoring report';
  }
}
