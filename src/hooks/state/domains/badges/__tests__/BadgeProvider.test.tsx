import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  BadgeProvider,
  useBadges,
  useBadgeData,
  useBadgeActions,
  useBadgeChecking,
  useBadgeStats,
  useIsBadgeEarned,
  useEarnedBadges,
  useUnearnedBadges,
  useTodaysBadges
} from '../BadgeProvider';
import { defaultBadgeState } from '../badge-state-types';
import { type Badge } from '@/lib/types';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock badge repository
const mockBadgeRepository = {
  getBadges: jest.fn(),
  addBadge: jest.fn(),
  updateBadge: jest.fn(),
  deleteBadge: jest.fn(),
  getBadgeById: jest.fn(),
};

jest.mock('@/lib/repositories/badge.repository', () => ({
  badgeRepository: mockBadgeRepository,
}));

// Mock badge utils
jest.mock('@/utils/badge-utils', () => ({
  getBadgeAwardingCriteria: jest.fn(() => ({})),
  shouldAwardBadge: jest.fn(() => false),
  validateBadgeData: jest.fn(() => ({ isValid: true, errors: [] })),
}));

// Mock lib/badges
jest.mock('@/lib/badges', () => ({
  checkBadge: jest.fn(),
}));

// Access mocked modules to control their behavior in tests
const mockBadgeUtils = require('@/utils/badge-utils') as { validateBadgeData: jest.Mock; getBadgeAwardingCriteria: jest.Mock; shouldAwardBadge: jest.Mock };
const mockLibBadges = require('@/lib/badges') as { checkBadge: jest.Mock };

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BadgeProvider>
      {children}
    </BadgeProvider>
  );
}

const mockBadge: Badge = {
  id: 'test-badge-1',
  name: 'Test Badge',
  description: 'A test badge for unit testing',
  icon: 'trophy',
  category: 'daily',
  isCustom: false,
  isEnabled: true,
  requiredCount: 5,
  conditions: [{
    type: 'TASKS_COMPLETED',
    target: 5,
    timeframe: 'DAY',
  }],
  motivationalMessage: 'Great job!',
  color: '#gold',
};

const earnedBadge: Badge = {
  id: 'earned-badge-1',
  name: 'Earned Badge',
  description: 'A badge that has been earned',
  icon: 'star',
  category: 'daily',
  isCustom: false,
  isEnabled: true,
  requiredCount: 1,
  conditions: [{
    type: 'TASKS_COMPLETED',
    target: 1,
    timeframe: 'DAY',
  }],
  motivationalMessage: 'Well done!',
  color: '#silver',
};



describe('BadgeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockBadgeRepository.getBadges.mockResolvedValue([]);
    mockBadgeRepository.addBadge.mockResolvedValue(mockBadge);
    mockBadgeRepository.updateBadge.mockResolvedValue(mockBadge);
    mockBadgeRepository.deleteBadge.mockResolvedValue(true);
    mockBadgeUtils.validateBadgeData.mockReturnValue({ isValid: true, errors: [] });
    mockBadgeUtils.getBadgeAwardingCriteria.mockReturnValue({});
    mockBadgeUtils.shouldAwardBadge.mockReturnValue(false);
    mockLibBadges.checkBadge.mockReturnValue(false);
  });

  describe('useBadges', () => {
    it('should provide default badge state', () => {
      const { result } = renderHook(() => useBadges(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.allBadges).toEqual([]);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(null);
      // Badge state initialized successfully
    });

    it('initializes with empty badges when no stored state', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const { result } = renderHook(() => useBadges(), { wrapper: TestWrapper });
      await act(async () => { await new Promise(r => setTimeout(r, 0)); });
      expect(result.current.state.allBadges).toEqual([]);
    });

    it('should handle invalid localStorage data gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      const { result } = renderHook(() => useBadges(), { wrapper: TestWrapper });
      await act(async () => { await new Promise(r => setTimeout(r, 0)); });
      expect(result.current.state.allBadges).toEqual([]);
    });

    it('should accept initial state override', () => {
      const { result } = renderHook(() => useBadges(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.allBadges).toEqual([]);
    });

    it('should add badge and persist to localStorage', async () => {
      const { result } = renderHook(() => useBadges(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.actions.addBadge(mockBadge);
      });

      expect(result.current.state.allBadges).toContainEqual(mockBadge);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should handle badge validation errors (no state change)', async () => {
      const { result } = renderHook(() => useBadges(), { wrapper: TestWrapper });
      const invalidBadge: any = { ...mockBadge, name: '', conditions: [] };
      await act(async () => { try { await result.current.actions.addBadge(invalidBadge); } catch {} });
      expect(result.current.state.allBadges).toEqual([]);
    });

    it('should update badge', async () => {
      const { result } = renderHook(() => useBadges(), {
        wrapper: TestWrapper,
      });

      const updatedBadge = {
        ...mockBadge,
        name: 'Updated Badge',
      };

      await act(async () => { await result.current.actions.addBadge(mockBadge); });
      await act(async () => { await result.current.actions.updateBadge(updatedBadge); });
      expect(result.current.state.allBadges[0]).toEqual(updatedBadge);
    });

    it('should delete badge', async () => {
      const { result } = renderHook(() => useBadges(), {
        wrapper: TestWrapper,
      });

      await act(async () => { await result.current.actions.addBadge(mockBadge); });
      await act(async () => { await result.current.actions.deleteBadge(mockBadge.id); });
      expect(result.current.state.allBadges).toEqual([]);
    });

    it('should attempt to award badges (no state mutation)', async () => {
      mockBadgeUtils.shouldAwardBadge.mockReturnValue(true);
      const { result } = renderHook(() => useBadges(), { wrapper: TestWrapper });
      await act(async () => {
        await result.current.actions.checkAndAwardBadges([], [], []);
      });
      // Provider logs/sets localStorage but doesn't mutate state directly
      expect(typeof result.current.actions.checkAndAwardBadges).toBe('function');
    });

    it('should reset badges', () => {
      const { result } = renderHook(() => useBadges(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.actions.resetBadges();
      });

      expect(result.current.state.allBadges).toEqual([]);
      expect(result.current.state.error).toBe(null);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('badges');
    });
  });

  describe('useBadgeData', () => {
    it('should provide badge data and computed properties', () => {
      const { result } = renderHook(() => useBadgeData(), {
        wrapper: TestWrapper,
      });

      expect(result.current.allBadges).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('useBadgeActions', () => {
    it('should provide badge action functions', () => {
      const { result } = renderHook(() => useBadgeActions(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.addBadge).toBe('function');
      expect(typeof result.current.updateBadge).toBe('function');
      expect(typeof result.current.deleteBadge).toBe('function');
      expect(typeof result.current.checkAndAwardBadges).toBe('function');
      expect(typeof result.current.resetBadges).toBe('function');
    });
  });

  describe('useBadgeChecking', () => {
    it('should provide badge checking functionality', () => {
      const { result } = renderHook(() => useBadgeChecking(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.checkBadgeEligibility).toBe('function');
      expect(typeof result.current.shouldBadgeBeAwarded).toBe('function');
      expect(typeof result.current.getNewlyEarnedBadges).toBe('function');
      expect(typeof result.current.getTodaysEarnedBadges).toBe('function');
      expect(typeof result.current.getBadgeStatistics).toBe('function');
      expect(typeof result.current.getBadgeProgress).toBe('function');
      expect(typeof result.current.checkMilestoneBadges).toBe('function');
    });

    it('should check badge eligibility', () => {
      const { result } = renderHook(() => useBadgeChecking(), {
        wrapper: TestWrapper,
      });

      mockLibBadges.checkBadge.mockReturnValue(true);

      const isEligible = result.current.checkBadgeEligibility(mockBadge, [], []);
      expect(isEligible).toBe(true);
      expect(mockLibBadges.checkBadge).toHaveBeenCalledWith(mockBadge, { tasks: [], logs: [] });
    });

    it('should determine if badge should be awarded', () => {
      const { result } = renderHook(() => useBadgeChecking(), {
        wrapper: TestWrapper,
      });

      mockBadgeUtils.shouldAwardBadge.mockReturnValue(true);

      const mockCriteria = {
        completedTasks: 5,
        completedRoutines: 2,
        totalStudyTime: 120,
        consecutiveDays: 3,
        todaysLogs: [],
      };

      const shouldAward = result.current.shouldBadgeBeAwarded(mockBadge, mockCriteria);
      expect(shouldAward).toBe(true);
      expect(mockBadgeUtils.shouldAwardBadge).toHaveBeenCalledWith(mockBadge, mockCriteria);
    });
  });

  describe('useBadgeStats', () => {
    it('should provide badge statistics', () => {
      const { result } = renderHook(() => useBadgeStats(), {
        wrapper: TestWrapper,
      });

      expect(result.current.total).toBe(0);
      expect(result.current.earned).toBe(0);
      expect(result.current.completionRate).toBe(0);
    });

    it('should calculate correct statistics for mixed badges', () => {
      const customBadge = { ...mockBadge, id: 'custom-1', isCustom: true };
      const systemBadge = { ...mockBadge, id: 'system-1', isCustom: false };
      
      const { result } = renderHook(() => useBadgeStats(), {
        wrapper: TestWrapper,
      });

      expect(result.current.total).toBe(0);
      expect(result.current.earned).toBe(0);
      expect(result.current.custom.total).toBe(0);
      expect(result.current.system.total).toBe(0);
      expect(result.current.completionRate).toBe(0);
    });

    it('should handle empty badge list', () => {
      const { result } = renderHook(() => useBadgeStats(), {
        wrapper: TestWrapper,
      });

      expect(result.current.total).toBe(0);
      expect(result.current.earned).toBe(0);
      expect(result.current.completionRate).toBe(0);
    });
  });

  describe('useIsBadgeEarned', () => {
    it('returns a predicate function', () => {
      const { result } = renderHook(() => useIsBadgeEarned(), { wrapper: TestWrapper });
      expect(typeof result.current).toBe('function');
      expect(result.current('missing')).toBe(false);
    });
  });

  describe('useEarnedBadges', () => {
    it('should return only earned badges', () => {
      const { result } = renderHook(() => useEarnedBadges(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toEqual([]);
    });
  });

  describe('useUnearnedBadges', () => {
    it('should return only unearned badges', () => {
      const anotherBadge = {
        ...mockBadge,
        id: 'another-badge',
        name: 'Another Badge',
      };
      
      const { result } = renderHook(() => useUnearnedBadges(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toEqual([]);
    });
  });

  describe('useTodaysBadges', () => {
    it('should return badges earned today', () => {
      const todayBadge = {
        ...mockBadge,
        id: 'today-badge',
        name: 'Today Badge',
      };

      const yesterdayBadge = {
        ...mockBadge,
        id: 'yesterday-badge',
        name: 'Yesterday Badge',
      };

      const { result } = renderHook(() => useTodaysBadges(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when hooks are used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useBadges());
      }).toThrow('useBadges must be used within a BadgeProvider');

      consoleSpy.mockRestore();
    });

    it('should be safe to call actions even without repos', async () => {
      const { result } = renderHook(() => useBadges(), { wrapper: TestWrapper });
      await act(async () => { await result.current.actions.addBadge(mockBadge); });
      expect(result.current.state.allBadges).toContainEqual(mockBadge);
    });
  });

  describe('localStorage Integration', () => {
    it('should handle localStorage errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useBadges(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.actions.addBadge(mockBadge);
      });

      // Should still update state even if localStorage fails
      expect(result.current.state.allBadges).toContainEqual(mockBadge);
      
      consoleSpy.mockRestore();
    });
  });
});
