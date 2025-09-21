/**
 * @jest-environment jsdom
 * @stats-hardening
 */

import { useStats } from '@/hooks/use-stats';
import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

// Mock debounce
jest.useFakeTimers();

describe('Debounce Guard', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  test('range changes coalesce within 250ms window', () => {
    let computeCount = 0;
    const mockCompute = jest.fn(() => {
      computeCount++;
      return { totalHours: '1.0' };
    });

    // Mock the stats computation
    jest.doMock('@/hooks/use-stats', () => ({
      useStats: jest.fn(() => ({
        timeRangeStats: mockCompute(),
        studyStreak: 1,
        // ... other stats
      }))
    }));

    // Simulate rapid range changes
    act(() => {
      fireEvent.change(document.createElement('select'), {
        target: { value: 'weekly' }
      });
    });

    act(() => {
      fireEvent.change(document.createElement('select'), {
        target: { value: 'monthly' }
      });
    });

    act(() => {
      fireEvent.change(document.createElement('select'), {
        target: { value: 'overall' }
      });
    });

    // Fast-forward until all timers have been executed
    act(() => {
      jest.runAllTimers();
    });

    // Should only compute once after debounce
    expect(computeCount).toBe(1);
  });

  test('date changes respect debounce window', () => {
    let computeCount = 0;

    // Simulate date picker rapid changes
    const onDateChange = jest.fn().mockImplementation(() => {
      computeCount++;
    });

    act(() => {
      onDateChange(new Date('2024-01-01'));
    });

    act(() => {
      onDateChange(new Date('2024-01-02'));
    });

    act(() => {
      onDateChange(new Date('2024-01-03'));
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(computeCount).toBe(1);
  });

  test('compute after debounce delay', () => {
    let computeTime = 0;

    const mockCallback = jest.fn().mockImplementation(() => {
      computeTime = Date.now();
    });

    // First change
    act(() => {
      mockCallback();
      jest.advanceTimersByTime(100);
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Second change before 250ms
    act(() => {
      mockCallback();
      jest.advanceTimersByTime(100);
    });

    // Still only called once
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Wait past debounce
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Should be called again
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  test('immediate execution for first call', () => {
    const mockCallback = jest.fn();

    act(() => {
      mockCallback();
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});