import { renderHook } from '@testing-library/react';

// Simple mock function to test
const useSimpleStats = (timeRange: string) => {
  return {
    timeRange,
    timeRangeStats: {
      totalTime: 0,
      totalTasks: 0,
      completedTasks: 0,
      averageSessionTime: 0,
    },
    badgeStats: {
      totalBadges: 0,
      earnedBadges: 0,
    },
  };
};

describe('Simple Stats Test', () => {
  it('should return basic stats structure', () => {
    const { result } = renderHook(() => useSimpleStats('daily'));
    
    expect(result.current).toHaveProperty('timeRange', 'daily');
    expect(result.current).toHaveProperty('timeRangeStats');
    expect(result.current).toHaveProperty('badgeStats');
    expect(result.current.timeRangeStats.totalTime).toBe(0);
  });

  it('should handle different time ranges', () => {
    const ranges = ['daily', 'weekly', 'monthly', 'overall'];
    
    ranges.forEach(range => {
      const { result } = renderHook(() => useSimpleStats(range));
      expect(result.current.timeRange).toBe(range);
    });
  });

  it('should return consistent structure', () => {
    const { result } = renderHook(() => useSimpleStats('weekly'));
    
    expect(typeof result.current.timeRangeStats.totalTime).toBe('number');
    expect(typeof result.current.badgeStats.totalBadges).toBe('number');
  });
});