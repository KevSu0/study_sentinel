/**
 * @jest-environment jsdom
 * @stats-hardening
 */

import { useStatsWorker } from '@/hooks/use-stats-worker';
import { renderHook, act } from '@testing-library/react';

// Mock worker implementation for testing
const mockWorker = {
  postMessage: jest.fn(),
  terminate: jest.fn(),
  onmessage: null,
  onerror: null
};

global.Worker = jest.fn(() => mockWorker) as any;

describe('Worker Offload Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('worker receives range + versions, returns aggregates', async () => {
    const mockResponse = {
      totalHours: '5.5',
      totalPoints: 330,
      completedCount: 5,
      completionRate: 80,
      avgSessionDuration: '66',
      studyStreak: 3
    };

    const { result } = renderHook(() => useStatsWorker());

    // Simulate worker response
    mockWorker.onmessage?.({
      data: {
        id: 'test-123',
        success: true,
        data: mockResponse,
        computeTime: 25,
        metricsVersion: '1.0.0'
      }
    });

    await act(async () => {
      const stats = await result.current.computeStats({
        work: [],
        tasks: [],
        timeRange: 'weekly',
        profile: {}
      });

      expect(stats).toEqual(mockResponse);
    });

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'COMPUTE_STATS',
        payload: expect.objectContaining({
          timeRange: 'weekly'
        }),
        metricsVersion: '1.0.0'
      })
    );
  });

  test('main thread idle within budget during worker computation', async () => {
    const { result } = renderHook(() => useStatsWorker());

    const startTime = performance.now();

    await act(async () => {
      // Simulate slow worker response
      setTimeout(() => {
        mockWorker.onmessage?.({
          data: {
            id: 'test-123',
            success: true,
            data: { totalHours: '2.0' },
            computeTime: 45,
            metricsVersion: '1.0.0'
          }
        });
      }, 10);

      await result.current.computeStats({
        work: [],
        tasks: [],
        timeRange: 'daily',
        profile: {}
      });
    });

    const endTime = performance.now();
    const mainThreadTime = endTime - startTime;

    // Main thread should be idle (just waiting for promise)
    expect(mainThreadTime).toBeLessThan(5);
  });

  test('worker timeout triggers fallback', async () => {
    const { result } = renderHook(() => useStatsWorker({
      timeout: 50
    }));

    await expect(
      act(async () => {
        // Don't send response - should timeout
        return result.current.computeStats({
          work: [],
          tasks: [],
          timeRange: 'weekly',
          profile: {}
        });
      })
    ).rejects.toThrow('Worker request timeout');
  });

  test('worker crash triggers graceful degradation', async () => {
    const { result } = renderHook(() => useStatsWorker());

    // Simulate worker crash
    mockWorker.onerror?.(new ErrorEvent('error'));

    await expect(
      act(async () => {
        return result.current.computeStats({
          work: [],
          tasks: [],
          timeRange: 'weekly',
          profile: {}
        });
      })
    ).rejects.toThrow('WORKER_UNAVAILABLE');
  });
});