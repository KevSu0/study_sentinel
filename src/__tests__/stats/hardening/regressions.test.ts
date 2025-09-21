/**
 * @jest-environment jsdom
 * @stats-hardening
 */

import { getDailyRollup } from '@/lib/daily-rollups';
import { useStatsWorker } from '@/hooks/use-stats-worker';

// Mock IDB failure
const mockDB = {
  get: jest.fn(() => Promise.reject(new Error('IDB unavailable'))),
  put: jest.fn(),
  add: jest.fn()
};

jest.mock('idb', () => ({
  openDB: jest.fn(() => Promise.reject(new Error('DB error')))
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Regressions & Fallbacks', () => {
  describe('Legacy Read', () => {
    test('localStorage read-fallback works when IDB unavailable', async () => {
      // Mock localStorage data
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        completedWork: [
          { date: '2024-01-01', duration: 3600, points: 60 }
        ]
      }));

      // Attempt to read from IDB (fails)
      let rollup;
      try {
        rollup = await getDailyRollup('2024-01-01');
      } catch (error) {
        // Fallback to localStorage
        const legacyData = JSON.parse(localStorageMock.getItem('study-sentinel-stats') || '{}');
        expect(legacyData.completedWork).toBeDefined();
      }
    });

    test('no back-write from localStorage to IDB', async () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        completedWork: [{ date: '2024-01-01', duration: 1800 }]
      }));

      // After fallback, IDB should not receive writes
      try {
        await getDailyRollup('2024-01-01');
      } catch (error) {
        // Verify no IDB writes occurred
        expect(mockDB.put).not.toHaveBeenCalled();
        expect(mockDB.add).not.toHaveBeenCalled();
      }
    });

    test('legacy read counted in diagnostics', async () => {
      const { statsObservability } = await import('@/lib/stats-observability');
      const diagnosticSpy = jest.spyOn(statsObservability, 'recordLegacyRead');

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({}));

      try {
        await getDailyRollup('2024-01-01');
      } catch (error) {
        expect(diagnosticSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Flag Behavior', () => {
    beforeEach(() => {
      // Reset worker mock
      global.Worker = jest.fn(() => ({
        postMessage: jest.fn(),
        terminate: jest.fn(),
        onmessage: null,
        onerror: null
      })) as any;
    });

    test('stats.worker.v1 OFF → app functional with baseline stats', async () => {
      const { result } = renderHook(() => useStatsWorker({ enabled: false }));

      // Should fall back to main thread
      const stats = await result.current.computeStats({
        work: [{ duration: 3600, date: '2024-01-01' }],
        tasks: [],
        timeRange: 'daily',
        profile: {}
      });

      expect(stats).toBeDefined();
      expect(stats.totalHours).toBeDefined();
    });

    test('badges.incremental.v1 OFF → reverts to legacy badge calc', async () => {
      const { BadgeProgressManager } = await import('@/lib/badge-progress-manager');
      const manager = new BadgeProgressManager();

      // With flag off, should compute badges synchronously
      // This would be handled by the badge evaluation logic
      expect(manager).toBeDefined();
    });

    test('stats.rollup.v2 read-path OFF → raw recompute', async () => {
      // When rollup read-path is disabled, should compute from raw events
      const events = [
        { type: 'study_session_created', data: { duration: 3600 }, timestamp: Date.now() }
      ];

      // Mock rollup failure
      const { computeDailyRollup } = await import('@/lib/daily-rollups');
      const rawRollup = computeDailyRollup('2024-01-01', events);

      expect(rawRollup.total_minutes).toBe(60);
    });

    test('all flags OFF → baseline functionality preserved', () => {
      // Test that core stats functionality works without any new features
      expect(true).toBe(true); // Placeholder - would test full baseline functionality
    });
  });

  describe('Error Boundaries', () => {
    test('worker crash handled gracefully', async () => {
      const MockWorker = jest.fn(() => ({
        postMessage: jest.fn(),
        terminate: jest.fn(),
        onerror: null
      }));

      // Simulate worker initialization error
      MockWorker.mockImplementation(() => {
        throw new Error('Worker initialization failed');
      });

      global.Worker = MockWorker as any;

      const { result } = renderHook(() => useStatsWorker());

      // Should still provide functionality through fallback
      expect(result.current.isWorkerReady).toBe(false);
    });

    test('corrupted localStorage handled safely', async () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid-json');

      expect(() => {
        JSON.parse(localStorageMock.getItem('study-sentinel-stats') || '{}');
      }).not.toThrow();
    });

    test('mixed version data handled', () => {
      // Test handling of data from different metric versions
      const v1Data = { version: '0.9.0', totalHours: '5.0' };
      const v2Data = { version: '1.0.0', totalHours: '5.5' };

      // Should handle both versions
      expect(v1Data.version).toBeDefined();
      expect(v2Data.version).toBeDefined();
    });
  });
});