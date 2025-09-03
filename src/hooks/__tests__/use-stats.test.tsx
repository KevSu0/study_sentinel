import { renderHook } from '@testing-library/react';
import { useStats } from '../use-stats';

// Mock all dependencies
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn(() => []),
}));

jest.mock('@/lib/repositories', () => ({
  profileRepository: { getById: jest.fn(() => Promise.resolve(null)) },
  taskRepository: { getByDateRange: jest.fn(() => Promise.resolve([])) },
  sessionRepository: { getByDateRange: jest.fn(() => Promise.resolve([])) },
  badgeRepository: { getAll: jest.fn(() => Promise.resolve([])) },
}));

jest.mock('@/lib/repositories/log.repository', () => ({
  logRepository: { getLogsByDate: jest.fn(() => Promise.resolve([])) },
}));

jest.mock('@/lib/utils', () => ({
  getStudyDateForTimestamp: jest.fn(() => new Date()),
  getTimeSinceStudyDayStart: jest.fn(() => 0),
  getStudyDay: jest.fn(() => new Date()),
}));

describe('useStats Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (global.gc) {
      global.gc();
    }
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useStats({ timeRange: 'daily', selectedDate: new Date() }));
    expect(result.current).toBeDefined();
  });

  it('should handle different time ranges', () => {
    const ranges = ['daily', 'weekly', 'monthly', 'overall'];
    
    ranges.forEach(range => {
      const { result } = renderHook(() => 
        useStats({ timeRange: range as any, selectedDate: new Date() })
      );
      expect(result.current).toBeDefined();
    });
  });

  it('should return expected properties', () => {
    const { result } = renderHook(() => useStats({ timeRange: 'daily', selectedDate: new Date() }));
    
    expect(result.current).toHaveProperty('timeRangeStats');
    expect(result.current).toHaveProperty('badgeStats');
  });

  it('should handle daily range correctly', () => {
    const { result } = renderHook(() => useStats({ timeRange: 'daily', selectedDate: new Date() }));
    
    // The hook should not crash and return expected structure
    expect(result.current).toBeDefined();
    expect(result.current.timeRangeStats).toBeDefined();
  });

  it('should handle different date ranges', () => {
    const ranges = ['daily', 'weekly', 'monthly', 'overall'] as const;
    
    ranges.forEach(range => {
      const { result } = renderHook(() => useStats({ timeRange: range, selectedDate: new Date() }));
      expect(result.current).toBeDefined();
    });
  });
});