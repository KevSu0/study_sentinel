// Canary Rollout Execution Test
// Tests the canary rollout execution for Slice 1: Storage & Analytics

import { CanaryRolloutExecutor, DEFAULT_CANARY_PLAN } from '../lib/canary-rollout-executor';

describe('Canary Rollout Execution', () => {
  let executor: CanaryRolloutExecutor;

  beforeEach(() => {
    executor = new CanaryRolloutExecutor(DEFAULT_CANARY_PLAN);
  });

  afterEach(() => {
    // Clean up any test data
    jest.clearAllMocks();
  });

  test('should create executor with default plan', () => {
    expect(executor).toBeDefined();
    expect(DEFAULT_CANARY_PLAN.canaryDevices).toHaveLength(5);
    expect(DEFAULT_CANARY_PLAN.thresholds.coldStartMs).toBe(2000);
  });

  test('should initialize successfully', async () => {
    // Mock the internal cohort rollout create method
    const createMock = jest.fn().mockResolvedValue({
      initialize: jest.fn().mockResolvedValue(undefined),
      getRolloutStatus: jest.fn().mockReturnValue({
        stage: 'canary',
        enabled: true,
        deviceId: 'test-device',
        isCanary: true,
        isInRollout: true,
        migrationComplete: true,
        lastCheck: Date.now(),
        metrics: null,
        alerts: []
      })
    });

    // Temporarily replace the create method
    const originalCreate = require('../lib/internal-cohort-rollout').InternalCohortRollout.create;
    require('../lib/internal-cohort-rollout').InternalCohortRollout.create = createMock;

    try {
      await expect(executor.initialize()).resolves.not.toThrow();
      expect(createMock).toHaveBeenCalled();
    } finally {
      // Restore original method
      require('../lib/internal-cohort-rollout').InternalCohortRollout.create = originalCreate;
    }
  });

  test('should execute canary rollout', async () => {
    // Mock the initialize method
    executor.initialize = jest.fn().mockResolvedValue(undefined);

    // Mock the internal methods
    const mockVerifyFreeze = jest.fn().mockResolvedValue({
      success: true,
      message: 'Freeze state verified',
      data: { codeFrozen: true, targetingValid: true, backupsExist: true }
    });

    const mockCaptureBaseline = jest.fn().mockResolvedValue({
      success: true,
      message: 'Baseline captured successfully',
      data: { timestamp: Date.now(), devices: {} }
    });

    const mockFlipFlags = jest.fn().mockResolvedValue({
      success: true,
      message: 'Canary flags flipped successfully',
      data: { enabledDevices: ['canary-desktop-001'], rolloutStage: 'canary' }
    });

    const mockRunSmokeTests = jest.fn().mockResolvedValue({
      success: true,
      message: 'All smoke tests passed',
      data: { devices: {}, summary: { total: 1, passed: 1, failed: 0 } }
    });

    // Replace private methods with mocks
    (executor as any).verifyFreezeState = mockVerifyFreeze;
    (executor as any).captureBaseline = mockCaptureBaseline;
    (executor as any).flipCanaryFlags = mockFlipFlags;
    (executor as any).runSmokeTests = mockRunSmokeTests;
    (executor as any).startMonitoring = jest.fn();

    const result = await executor.executeCanaryRollout();

    expect(result.success).toBe(true);
    expect(result.message).toBe('Canary rollout executed successfully');
    expect(result.results).toBeDefined();
    expect(result.results.devices).toEqual(['canary-desktop-001', 'canary-mobile-001', 'canary-tablet-001', 'canary-desktop-002', 'canary-mobile-002']);
  });

  test('should handle execution failures', async () => {
    // Mock the initialize method
    executor.initialize = jest.fn().mockResolvedValue(undefined);

    // Mock freeze verification to fail
    (executor as any).verifyFreezeState = jest.fn().mockResolvedValue({
      success: false,
      message: 'Freeze verification failed',
      data: { codeFrozen: false, targetingValid: true, backupsExist: true }
    });

    const result = await executor.executeCanaryRollout();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Freeze verification failed');
  });

  test('should generate execution report', () => {
    const report = executor.generateReport();
    
    expect(report).toBeDefined();
    expect(report).toContain('Canary Rollout Execution Report');
    expect(report).toContain('Gate Owner: engineering-lead@company.com');
    expect(report).toContain('Cold Start: 2000ms');
    expect(report).toContain('TTR: 1200ms');
  });

  test('should get execution status', () => {
    const status = executor.getStatus();
    
    expect(status).toBeDefined();
    expect(status).toHaveProperty('startTime');
    expect(status).toHaveProperty('uptime');
    expect(status).toHaveProperty('devices');
    expect(status.devices).toBe(5);
  });
});