// Canary Rollout Execution Test
// Tests the canary rollout execution for Slice 1: Storage & Analytics

import { CanaryRolloutExecutor, DEFAULT_CANARY_PLAN } from '../lib/canary-rollout-executor';
import { MockCanaryManager, MockMonitoringDashboard } from './__mocks__/canary-manager-mock';
import { CanaryManager } from '../lib/canary-manager';
import { MonitoringDashboard } from '../lib/monitoring-dashboard';

const createMock = jest.fn();

let consoleLogs: string[] = [];
let consoleLogSpy: jest.SpyInstance<void, Parameters<typeof console.log>>;

beforeEach(() => {
  consoleLogs = [];
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((message?: unknown, ...args: unknown[]) => {
    const text = typeof message === 'string' ? message : String(message);
    consoleLogs.push(text);
  });
});

jest.mock('../lib/internal-cohort-rollout', () => ({
  InternalCohortRollout: {
    create: (...args: any[]) => createMock(...args),
  },
}));

describe('Canary Rollout Execution', () => {
  let executor: CanaryRolloutExecutor;

  beforeEach(() => {
    const canaryManager = new MockCanaryManager() as unknown as CanaryManager;
    const monitoring = new MockMonitoringDashboard() as unknown as MonitoringDashboard;

    createMock.mockResolvedValue({
      canaryManager,
      monitoring,
      getRolloutStatus: jest.fn().mockReturnValue({
        stage: 'canary',
        enabled: true,
        deviceId: 'test-device',
        isCanary: true,
        isInRollout: true,
        migrationComplete: true,
        lastCheck: Date.now(),
        metrics: monitoring.getCurrentMetrics(),
        alerts: monitoring.getAlerts(),
      }),
    });

    executor = new CanaryRolloutExecutor(DEFAULT_CANARY_PLAN);
  });

  afterEach(() => {
    jest.clearAllMocks();
    createMock.mockReset();
    consoleLogSpy?.mockRestore();
  });

  test('should create executor with default plan', () => {
    expect(executor).toBeDefined();
    expect(DEFAULT_CANARY_PLAN.canaryDevices).toHaveLength(5);
    expect(DEFAULT_CANARY_PLAN.thresholds.coldStartMs).toBe(2000);
  });

  test('should initialize successfully', async () => {
    await expect(executor.initialize()).resolves.not.toThrow();
    expect(createMock).toHaveBeenCalled();
    expect(consoleLogs).toEqual(expect.arrayContaining([
      expect.stringContaining('🚀 Initializing Canary Rollout Executor'),
      expect.stringContaining('✅ Configured 5 canary devices'),
    ]));
  });

  test('should execute canary rollout', async () => {
    executor['canaryManager'] = new MockCanaryManager() as unknown as CanaryManager;
    executor['monitoring'] = new MockMonitoringDashboard() as unknown as MonitoringDashboard;

    // Mock the internal methods
    const mockVerifyFreeze = jest.fn().mockResolvedValue({
      success: true,
      message: 'Freeze state verified',
      data: { codeFrozen: true, targetingValid: true, backupsExist: true },
    });

    const mockCaptureBaseline = jest.fn().mockResolvedValue({
      success: true,
      message: 'Baseline captured successfully',
      data: { timestamp: Date.now(), devices: {} },
    });

    const mockFlipFlags = jest.fn().mockResolvedValue({
      success: true,
      message: 'Canary flags flipped successfully',
      data: { enabledDevices: ['canary-desktop-001'], rolloutStage: 'canary' },
    });

    const mockRunSmokeTests = jest.fn().mockResolvedValue({
      success: true,
      message: 'All smoke tests passed',
      data: { devices: {}, summary: { total: 1, passed: 1, failed: 0 } },
    });

    (executor as any).verifyFreezeState = mockVerifyFreeze;
    (executor as any).captureBaseline = mockCaptureBaseline;
    (executor as any).flipCanaryFlags = mockFlipFlags;
    (executor as any).runSmokeTests = mockRunSmokeTests;
    (executor as any).startMonitoring = jest.fn();

    const result = await executor.executeCanaryRollout();

    expect(result.success).toBe(true);
    expect(result.message).toBe('Canary rollout executed successfully');
    expect(result.results).toBeDefined();
    expect(result.results.devices).toEqual([
      'canary-desktop-001',
      'canary-mobile-001',
      'canary-tablet-001',
      'canary-desktop-002',
      'canary-mobile-002',
    ]);
    expect(consoleLogs.some(line => line.includes('Canary Rollout Execution completed successfully'))).toBe(true);
  });

  test('should handle execution failures', async () => {
    executor['canaryManager'] = new MockCanaryManager() as unknown as CanaryManager;

    (executor as any).verifyFreezeState = jest.fn().mockResolvedValue({
      success: false,
      message: 'Freeze verification failed',
      data: { codeFrozen: false, targetingValid: true, backupsExist: true },
    });

    const result = await executor.executeCanaryRollout();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Freeze verification failed');
  });

  test('should generate execution report', () => {
    const canaryManager = new MockCanaryManager() as unknown as CanaryManager;
    const monitoring = new MockMonitoringDashboard() as unknown as MonitoringDashboard;

    executor['canaryManager'] = canaryManager;
    executor['monitoring'] = monitoring;

    const report = executor.generateReport();

    expect(report).toBeDefined();
    expect(report).toContain('Canary Rollout Execution Report');
    expect(report).toContain('Gate Owner: engineering-lead@company.com');
    expect(report).toContain('Cold Start: 2000ms');
    expect(report).toContain('TTR: 1200ms');
  });

  test('should get execution status', () => {
    const canaryManager = new MockCanaryManager() as unknown as CanaryManager;
    const monitoring = new MockMonitoringDashboard() as unknown as MonitoringDashboard;

    executor['canaryManager'] = canaryManager;
    executor['monitoring'] = monitoring;

    const status = executor.getStatus();

    expect(status).toBeDefined();
    expect(status).toHaveProperty('startTime');
    expect(status).toHaveProperty('uptime');
    expect(status).toHaveProperty('devices');
    expect(status.devices).toBe(5);
  });
});
