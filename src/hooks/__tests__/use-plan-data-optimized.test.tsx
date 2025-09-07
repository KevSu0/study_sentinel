import { renderHook } from '@testing-library/react';
import React from 'react';
import { useOptimizedPlanData } from '../use-plan-data-optimized';

// Mock the global state hook module with a factory function
jest.mock('../use-global-state', () => ({
  useGlobalState: jest.fn(), // Start with a plain mock function
}));

// Import the mocked function after the mock is defined
import { useGlobalState } from '../use-global-state';

// Cast it to the right type
const mockedUseGlobalState = useGlobalState as jest.Mock;

// A wrapper to provide the hook with a basic context
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

describe('useOptimizedPlanData with Study Day Logic', () => {
  beforeEach(() => {
    // Reset mocks and timers before each test
    mockedUseGlobalState.mockClear();
    jest.useFakeTimers();

    // Provide a default mock implementation for each test
    mockedUseGlobalState.mockReturnValue({
      state: {
        tasks: [],
        routines: [],
        completedWork: [],
        logs: [],
        todaysActivity: [],
        todaysLogs: [],
        allCompletedWork: [],
        todaysCompletedWork: [],
        todaysPoints: 0,
        todaysBadges: [],
      },
      actions: {},
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('dateInfo calculation', () => {
    it('should identify "Today" correctly when time is after 4 AM', () => {
      jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z')); // Monday 10 AM
      const selectedDate = new Date('2024-01-15T14:00:00.000Z'); // Monday 2 PM
      const { result } = renderHook(() => useOptimizedPlanData(selectedDate), { wrapper: AllTheProviders });
      expect(result.current.dateInfo.isToday).toBe(true);
      expect(result.current.dateInfo.relativeDate).toBe('Today');
    });

    it('should identify "Today" correctly when time is before 4 AM (part of previous study day)', () => {
      jest.setSystemTime(new Date('2024-01-16T03:00:00.000Z')); // Tuesday 3 AM
      const selectedDate = new Date('2024-01-15T23:00:00.000Z'); // Monday 11 PM
      const { result } = renderHook(() => useOptimizedPlanData(selectedDate), { wrapper: AllTheProviders });
      expect(result.current.dateInfo.isToday).toBe(true);
      expect(result.current.dateInfo.relativeDate).toBe('Today');
    });

    it('should identify "Yesterday" correctly', () => {
      jest.setSystemTime(new Date('2024-01-16T05:00:00.000Z')); // Tuesday 5 AM
      const selectedDate = new Date('2024-01-15T10:00:00.000Z'); // Monday 10 AM
      const { result } = renderHook(() => useOptimizedPlanData(selectedDate), { wrapper: AllTheProviders });
      expect(result.current.dateInfo.isYesterday).toBe(true);
      expect(result.current.dateInfo.relativeDate).toBe('Yesterday');
    });

    it('should identify "Tomorrow" correctly', () => {
      jest.setSystemTime(new Date('2024-01-15T05:00:00.000Z')); // Monday 5 AM
      const selectedDate = new Date('2024-01-16T10:00:00.000Z'); // Tuesday 10 AM
      const { result } = renderHook(() => useOptimizedPlanData(selectedDate), { wrapper: AllTheProviders });
      expect(result.current.dateInfo.isTomorrow).toBe(true);
      expect(result.current.dateInfo.relativeDate).toBe('Tomorrow');
    });
  });

  describe('Task Filtering', () => {
    it('should only return tasks for the selected study day', () => {
      // Set "now" to Jan 16, 10 AM. The current study day is Jan 16.
      jest.setSystemTime(new Date('2024-01-16T10:00:00.000Z'));
      
      mockedUseGlobalState.mockReturnValue({
        state: {
          // This task is for the study day of Jan 15
          tasks: [
            { id: 'task-1', title: 'Yesterday task', date: '2024-01-15', status: 'todo' },
            // This task is for the study day of Jan 16
            { id: 'task-2', title: 'Today task', date: '2024-01-16', status: 'todo' },
          ],
          routines: [],
          completedWork: [],
        },
        actions: {},
      });

      // Select the study day of Jan 16
      const selectedDate = new Date('2024-01-16T08:00:00.000Z');
      const { result } = renderHook(() => useOptimizedPlanData(selectedDate), { wrapper: AllTheProviders });
      
      expect(result.current.tasks.filtered.length).toBe(1);
      expect(result.current.tasks.filtered[0].id).toBe('task-2');
    });
  });
});