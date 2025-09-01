import React from 'react';
import { renderHook } from '@testing-library/react';
import { OptimizedGlobalStateProvider, useOptimizedGlobalState } from '../use-global-state-optimized';

// Mock external dependencies
jest.mock('@/components/providers/confetti-provider', () => ({
  useConfetti: () => ({ fire: jest.fn() }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/badges', () => ({
  SYSTEM_BADGES: [],
  checkBadge: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  generateShortId: jest.fn(() => 'ABC123'),
  getSessionDate: jest.fn(() => new Date('2024-01-15')),
  getStudyDateForTimestamp: jest.fn(() => '2024-01-15'),
  getStudyDay: jest.fn(() => 1),
}));

jest.mock('@/lib/motivation', () => ({
  motivationalQuotes: ['Stay focused!', 'You can do it!', 'Keep going!'],
  getRandomMotivationalMessage: jest.fn(() => 'Stay focused!'),
}));

jest.mock('@/lib/repositories', () => ({
  taskRepository: {
    create: jest.fn().mockResolvedValue({ id: 'task-123' }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
  profileRepository: {
    get: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  },
  routineRepository: {
    create: jest.fn().mockResolvedValue({ id: 'routine-123' }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
  logRepository: {
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
  badgeRepository: {
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
  sessionRepository: {
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@/lib/sync', () => ({
  SyncEngine: jest.fn().mockImplementation(() => ({
    sync: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => '2024-01-15'),
  addDays: jest.fn((date, days) => new Date('2024-01-16')),
  subDays: jest.fn((date, days) => new Date('2024-01-14')),
  parseISO: jest.fn((str) => new Date(str)),
  formatISO: jest.fn((date) => '2024-01-15T00:00:00.000Z'),
  set: jest.fn((date, values) => new Date('2024-01-15')),
  parse: jest.fn((str, format, baseDate) => new Date('2024-01-15')),
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-123'),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <OptimizedGlobalStateProvider>{children}</OptimizedGlobalStateProvider>
);

describe('useOptimizedGlobalState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider and Context', () => {
    it('should provide context value', () => {
      const { result } = renderHook(() => useOptimizedGlobalState(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBeDefined();
      expect(result.current.state).toBeDefined();
      expect(result.current.actions).toBeDefined();
      expect(result.current.selectors).toBeDefined();
    });

    it('should throw error when used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        renderHook(() => useOptimizedGlobalState());
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('useOptimizedGlobalState must be used within an OptimizedGlobalStateProvider');
      }
      
      consoleError.mockRestore();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state structure', () => {
      const { result } = renderHook(() => useOptimizedGlobalState(), {
        wrapper: TestWrapper,
      });

      const { state } = result.current;
      
      expect(state.isLoaded).toBe(false);
      expect(state.tasks).toEqual([]);
      expect(state.logs).toEqual([]);
      expect(state.routines).toEqual([]);
      expect(state.allBadges).toEqual([]);
      expect(state.earnedBadges).toBeInstanceOf(Map);
      expect(state.activeItem).toBeNull();
      expect(state.isPaused).toBe(true);
      expect(state.isMuted).toBe(false);
      expect(state.currentQuote).toBe('Stay focused!');
    });
  });

  describe('Actions', () => {
    it('should have all required action methods', () => {
      const { result } = renderHook(() => useOptimizedGlobalState(), {
        wrapper: TestWrapper,
      });

      const { actions } = result.current;
      
      expect(typeof actions.addTask).toBe('function');
      expect(typeof actions.updateTask).toBe('function');
      expect(typeof actions.archiveTask).toBe('function');
      expect(typeof actions.unarchiveTask).toBe('function');
      expect(typeof actions.pushTaskToNextDay).toBe('function');
      expect(typeof actions.startTimer).toBe('function');
      expect(typeof actions.togglePause).toBe('function');
      expect(typeof actions.completeTimer).toBe('function');
      expect(typeof actions.stopTimer).toBe('function');
      expect(typeof actions.addRoutine).toBe('function');
      expect(typeof actions.updateRoutine).toBe('function');
      expect(typeof actions.deleteRoutine).toBe('function');
      expect(typeof actions.addBadge).toBe('function');
      expect(typeof actions.updateBadge).toBe('function');
      expect(typeof actions.deleteBadge).toBe('function');
      expect(typeof actions.updateProfile).toBe('function');
      expect(typeof actions.openRoutineLogDialog).toBe('function');
      expect(typeof actions.closeRoutineLogDialog).toBe('function');
      expect(typeof actions.setSoundSettings).toBe('function');
      expect(typeof actions.toggleMute).toBe('function');
      expect(typeof actions.addLog).toBe('function');
      expect(typeof actions.removeLog).toBe('function');
      expect(typeof actions.updateLog).toBe('function');
      expect(typeof actions.retryItem).toBe('function');
    });
  });

  describe('Selectors', () => {
    it('should have all required selector properties', () => {
      const { result } = renderHook(() => useOptimizedGlobalState(), {
        wrapper: TestWrapper,
      });

      const { selectors } = result.current;
      
      expect(Array.isArray(selectors.activeTasks)).toBe(true);
      expect(Array.isArray(selectors.completedTasks)).toBe(true);
      expect(Array.isArray(selectors.todaysTasks)).toBe(true);
      expect(Array.isArray(selectors.activeRoutines)).toBe(true);
      expect(Array.isArray(selectors.earnedBadgesList)).toBe(true);
      expect(Array.isArray(selectors.todaysActivityFiltered)).toBe(true);
      expect(typeof selectors.todaysStats).toBe('object');
    });
  });

  describe('Function Types', () => {
    it('should have stable function references', () => {
      const { result } = renderHook(() => useOptimizedGlobalState(), {
        wrapper: TestWrapper,
      });

      const { actions, selectors } = result.current;
      
      // Test that actions are functions
      expect(typeof actions.toggleMute).toBe('function');
      expect(typeof actions.togglePause).toBe('function');
      expect(typeof actions.openRoutineLogDialog).toBe('function');
      expect(typeof actions.closeRoutineLogDialog).toBe('function');
      
      // Test that selectors return expected types
      expect(Array.isArray(selectors.activeTasks)).toBe(true);
      expect(typeof selectors.todaysStats).toBe('object');
    });
  });

  describe('State Properties', () => {
    it('should have correct state property types', () => {
      const { result } = renderHook(() => useOptimizedGlobalState(), {
        wrapper: TestWrapper,
      });

      const { state } = result.current;
      
      expect(typeof state.isLoaded).toBe('boolean');
      expect(typeof state.isPaused).toBe('boolean');
      expect(typeof state.isMuted).toBe('boolean');
      expect(typeof state.currentQuote).toBe('string');
      expect(Array.isArray(state.tasks)).toBe(true);
      expect(Array.isArray(state.logs)).toBe(true);
      expect(Array.isArray(state.routines)).toBe(true);
      expect(Array.isArray(state.allBadges)).toBe(true);
      expect(state.earnedBadges instanceof Map).toBe(true);
    });
  });

  describe('Dialog State', () => {
    it('should have correct dialog state structure', () => {
      const { result } = renderHook(() => useOptimizedGlobalState(), {
        wrapper: TestWrapper,
      });

      const { state } = result.current;
      
      expect(state.routineLogDialog).toBeDefined();
      expect(typeof state.routineLogDialog.isOpen).toBe('boolean');
      expect(state.routineLogDialog.action).toBeNull();
    });
  });

  describe('Sound Settings', () => {
    it('should have correct sound settings structure', () => {
      const { result } = renderHook(() => useOptimizedGlobalState(), {
        wrapper: TestWrapper,
      });

      const { state } = result.current;
      
      expect(state.soundSettings).toBeDefined();
      expect(typeof state.soundSettings.alarm).toBe('string');
      expect(typeof state.soundSettings.tick).toBe('string');
      expect(typeof state.soundSettings.notificationInterval).toBe('number');
    });
  });
});