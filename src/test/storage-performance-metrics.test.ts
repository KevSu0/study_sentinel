import { StorageManagerV2 } from '../lib/storage-v2';

describe('Storage Performance Metrics', () => {
  let storage: StorageManagerV2;
  const testDeviceId = 'metrics-test-device';
  let consoleLogs: string[] = [];
  let consoleLogSpy: jest.SpyInstance<void, Parameters<typeof console.log>>;

  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((message?: unknown, ...args: unknown[]) => {
      const text = typeof message === 'string' ? message : String(message);
      consoleLogs.push(text);
    });
  });

  afterAll(() => {
    consoleLogSpy?.mockRestore();
  });

  afterEach(() => {
    consoleLogs = [];
  });
  beforeAll(async () => {
    // Set development environment for testing
    (process.env as any).NODE_ENV = 'development';
    
    await indexedDB.deleteDatabase('StudySentinelDB');
    storage = new StorageManagerV2(testDeviceId);
    await storage.initialize();
  });

  afterAll(async () => {
    if (storage) {
      await storage.cleanup();
    }
    await indexedDB.deleteDatabase('StudySentinelDB');
  });

  beforeEach(async () => {
    await storage.clearAllData();
    storage.clearPerformanceMetrics();
  });

  test('should collect performance metrics for operations', async () => {
    // Perform some operations to generate metrics
    await storage.addEvent({
      type: 'study_session_created' as any,
      deviceId: testDeviceId,
      sessionId: 'test-session',
      data: {
        subject: 'Test Subject',
        duration: 3600000,
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        sessionId: 'test-session'
      }
    });

    await storage.getEvents();
    await storage.getEvents({ type: 'study_session_created' as any });

    const metrics = storage.getPerformanceMetrics();
    expect(consoleLogs.some(line => line.includes('Storage v2 initialized successfully'))).toBe(true);
    expect(consoleLogs.some(line => line.includes('No v1 database found'))).toBe(true);
    // Should have metrics for the operations we performed
    expect(metrics).toHaveProperty('addEvent');
    expect(metrics).toHaveProperty('getEvents');

    // Each metric should have the expected structure
    for (const metric of Object.values(metrics)) {
      expect(metric).toHaveProperty('count');
      expect(metric).toHaveProperty('avg');
      expect(metric).toHaveProperty('min');
      expect(metric).toHaveProperty('max');
      expect(metric.count).toBeGreaterThan(0);
      expect(metric.avg).toBeGreaterThanOrEqual(0);
      expect(metric.min).toBeGreaterThanOrEqual(0);
      expect(metric.max).toBeGreaterThanOrEqual(0);
    }
  });

  test('should clear performance metrics', async () => {
    // Generate some metrics
    await storage.addEvent({
      type: 'study_session_created' as any,
      deviceId: testDeviceId,
      sessionId: 'test-session',
      data: {
        subject: 'Test Subject',
        duration: 3600000,
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        sessionId: 'test-session'
      }
    });

    // Verify metrics exist
    let metrics = storage.getPerformanceMetrics();
    expect(Object.keys(metrics).length).toBeGreaterThan(0);

    // Clear metrics
    storage.clearPerformanceMetrics();
    
    // Verify metrics are cleared
    metrics = storage.getPerformanceMetrics();
    expect(Object.keys(metrics).length).toBe(0);
  });

  test('should only collect metrics in development environment', async () => {
    // Store original NODE_ENV
    const originalNodeEnv = process.env.NODE_ENV;
    
    try {
      // Test in production mode (should not collect metrics)
      (process.env as any).NODE_ENV = 'production';
      
      const prodStorage = new StorageManagerV2('prod-test-device');
      await prodStorage.initialize();
      await prodStorage.addEvent({
        type: 'study_session_created' as any,
        deviceId: 'prod-test-device',
        sessionId: 'test-session',
        data: {
          subject: 'Test Subject',
          duration: 3600000,
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
          sessionId: 'test-session'
        }
      });

      const metrics = prodStorage.getPerformanceMetrics();
      expect(Object.keys(metrics).length).toBe(0);
      
      await prodStorage.cleanup();
    } finally {
      // Restore original NODE_ENV
      (process.env as any).NODE_ENV = originalNodeEnv;
    }
  });
});

