/**
 * @jest-environment jsdom
 * @stats-hardening
 */

import { statsObservability } from '@/lib/stats-observability';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock performance.memory
const mockMemory = {
  used: 50 * 1024 * 1024, // 50MB
  total: 60 * 1024 * 1024,
  limit: 100 * 1024 * 1024
};

Object.defineProperty(performance, 'memory', {
  value: mockMemory,
  writable: true
});

describe('Observability & Consent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear telemetry buffer
    (statsObservability as any).telemetryBuffer = [];
  });

  test('telemetry gating: only logs when consent true', () => {
    // No consent initially
    statsObservability.recordComputeTime('test', 100);

    expect((statsObservability as any).telemetryBuffer).toHaveLength(0);

    // Grant consent
    statsObservability.grantConsent();
    statsObservability.recordComputeTime('test', 100);

    expect((statsObservability as any).telemetryBuffer).toHaveLength(1);
  });

  test('5% sampling applied', () => {
    statsObservability.grantConsent();

    // Record many events
    for (let i = 0; i < 100; i++) {
      statsObservability.recordComputeTime('test', 100);
    }

    // Should have approximately 5% sampled
    const bufferLength = (statsObservability as any).telemetryBuffer.length;
    expect(bufferLength).toBeGreaterThan(0);
    expect(bufferLength).toBeLessThan(15); // Allow some variance
  });

  test('no PII in telemetry', () => {
    statsObservability.grantConsent();

    statsObservability.recordComputeTime('test', 100, {
      userId: 'should-not-be-included',
      sessionId: 'secret'
    });

    const event = (statsObservability as any).telemetryBuffer[0];
    expect(event.metadata.userId).toBeUndefined();
    expect(event.metadata.sessionId).toBeUndefined();
    expect(event.metadata.deviceClass).toBeDefined();
    expect(event.metadata.metricsVersion).toBeDefined();
  });

  test('budget monitors record metrics', () => {
    statsObservability.grantConsent();

    // Record within budget
    statsObservability.recordComputeTime('useStats30Day', 40);
    statsObservability.recordWorkerStats({ computeTime: 70, memoryUsage: mockMemory });

    const diagnostics = statsObservability.getDiagnostics();
    expect(diagnostics).toBeDefined();
    expect(diagnostics?.computeTime).toBe(40);
    expect(diagnostics?.workerTime).toBe(70);
    expect(diagnostics?.memoryDelta).toBe(50);
  });

  test('budget violations trigger alerts', () => {
    const alertSpy = jest.spyOn(window, 'dispatchEvent');

    // Exceed budget
    statsObservability.recordComputeTime('useStats30Day', 60); // Over 50ms budget

    expect(alertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          budgetId: 'useStats30Day',
          percentageOver: expect.any(Number)
        })
      })
    );
  });

  test('legacy read counter increments', () => {
    statsObservability.recordLegacyRead();

    const diagnostics = statsObservability.getDiagnostics();
    expect(diagnostics?.legacyReads).toBe(1);
  });

  test('consent can be revoked', () => {
    statsObservability.grantConsent();
    statsObservability.recordComputeTime('test', 100);

    expect((statsObservability as any).telemetryBuffer).toHaveLength(1);

    statsObservability.revokeConsent();
    statsObservability.recordComputeTime('test', 100);

    // Buffer should be cleared after revocation
    expect((statsObservability as any).telemetryBuffer).toHaveLength(0);
  });

  test('telemetry includes required fields', () => {
    statsObservability.grantConsent();
    statsObservability.recordComputeTime('test-op', 150);

    const event = (statsObservability as any).telemetryBuffer[0];
    expect(event.type).toBe('compute_time');
    expect(event.timestamp).toBeInstanceOf(Number);
    expect(event.metrics).toEqual({ operation: 'test-op', duration: 150 });
    expect(event.sampled).toBe(true);
    expect(event.metadata.metricsVersion).toBe('1.0.0');
    expect(event.metadata.statsCodeVersion).toBe('1.0.0');
  });

  test('debug panel provides visibility', () => {
    const debugData = statsObservability.getDebugData();

    expect(debugData).toHaveProperty('budgets');
    expect(debugData).toHaveProperty('diagnostics');
    expect(debugData).toHaveProperty('consent');
    expect(debugData).toHaveProperty('sampleRate');
    expect(debugData.sampleRate).toBe(0.05);
  });
});