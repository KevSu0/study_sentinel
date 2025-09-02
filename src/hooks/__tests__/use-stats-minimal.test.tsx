import { renderHook, waitFor } from '@testing-library/react';
import { format, startOfDay, subDays } from 'date-fns';

// Mock the repositories
jest.mock('../../lib/repositories', () => ({
  taskRepository: {
    getByDateRange: jest.fn().mockResolvedValue([]),
  },
  sessionRepository: {
    getByDateRange: jest.fn().mockResolvedValue([]),
  },
  profileRepository: {
    getProfile: jest.fn().mockResolvedValue(null),
  },
  eventRepository: {
    getByDateRange: jest.fn().mockResolvedValue([]),
  },
}));

// Mock useLiveQuery to return static data
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn((fn) => {
    // Return empty arrays for all queries to minimize memory usage
    return [];
  }),
}));

import { useStats } from '../use-stats';
import { taskRepository } from '../../lib/repositories';

describe('useStats - Minimal Memory Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const selectedDate = new Date();
    const { result, unmount } = renderHook(() =>
      useStats({ timeRange: 'daily', selectedDate })
    );

    try {
      // Just verify the hook returns an object with expected properties
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('object');
    } finally {
      unmount();
    }
  });

  it('should handle different time ranges without memory issues', () => {
    const selectedDate = new Date();
    const timeRanges = ['daily', 'weekly', 'monthly', 'overall'] as const;
    
    timeRanges.forEach(timeRange => {
      const { result, unmount } = renderHook(() =>
        useStats({ timeRange, selectedDate })
      );
      
      try {
        expect(result.current).toBeDefined();
      } finally {
        unmount();
      }
    });
  });
});