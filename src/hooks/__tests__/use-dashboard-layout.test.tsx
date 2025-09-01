import React from 'react';
import { renderHook, act, render, screen } from '@testing-library/react';
import {
  useDashboardLayout,
  DashboardLayoutProvider,
  DashboardWidget,
  DashboardWidgetType,
  WIDGET_NAMES,
} from '../use-dashboard-layout';

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

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DashboardLayoutProvider>{children}</DashboardLayoutProvider>
);

// Test component to access hook
const TestComponent: React.FC = () => {
  const { layout, setLayout, toggleWidgetVisibility, isLoaded } = useDashboardLayout();
  
  return (
    <div>
      <div data-testid="is-loaded">{isLoaded.toString()}</div>
      <div data-testid="layout-length">{layout.length}</div>
      <div data-testid="visible-widgets">
        {layout.filter(w => w.isVisible).length}
      </div>
      <button
        data-testid="toggle-daily-briefing"
        onClick={() => toggleWidgetVisibility('daily_briefing')}
      >
        Toggle Daily Briefing
      </button>
      <button
        data-testid="set-custom-layout"
        onClick={() => setLayout([
          { id: 'daily_briefing', isVisible: true },
          { id: 'stats_overview', isVisible: false },
        ])}
      >
        Set Custom Layout
      </button>
      <button
        data-testid="set-layout-function"
        onClick={() => setLayout(prev => prev.map(w => ({ ...w, isVisible: false })))}
      >
        Hide All Widgets
      </button>
    </div>
  );
};

describe('useDashboardLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Provider and Context', () => {
    it('should throw error when used outside provider', () => {
      const TestComponentWithoutProvider = () => {
        useDashboardLayout();
        return null;
      };

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useDashboardLayout must be used within a DashboardLayoutProvider');

      console.error = originalError;
    });

    it('should provide context value when used within provider', () => {
      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toHaveProperty('layout');
      expect(result.current).toHaveProperty('setLayout');
      expect(result.current).toHaveProperty('toggleWidgetVisibility');
      expect(result.current).toHaveProperty('isLoaded');
    });
  });

  describe('Initial State', () => {
    it('should initialize with default layout when no stored layout', () => {
      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      expect(result.current.layout).toHaveLength(8);
      expect(result.current.isLoaded).toBe(true);
      
      // Check default visibility states
      const visibleWidgets = result.current.layout.filter(w => w.isVisible);
      const hiddenWidgets = result.current.layout.filter(w => !w.isVisible);
      
      expect(visibleWidgets).toHaveLength(6);
      expect(hiddenWidgets).toHaveLength(2);
      
      // Check specific default states
      expect(result.current.layout.find(w => w.id === 'daily_briefing')?.isVisible).toBe(true);
      expect(result.current.layout.find(w => w.id === 'todays_routines')?.isVisible).toBe(false);
      expect(result.current.layout.find(w => w.id === 'todays_plan')?.isVisible).toBe(false);
    });

    it('should start with isLoaded as false and then set to true', () => {
      render(<TestComponent />, { wrapper: TestWrapper });
      
      // After initial render, isLoaded should be true
      expect(screen.getByTestId('is-loaded')).toHaveTextContent('true');
    });
  });

  describe('Loading from localStorage', () => {
    it('should load and merge saved layout with defaults', () => {
      const savedLayout: DashboardWidget[] = [
        { id: 'daily_briefing', isVisible: false }, // Changed from default
        { id: 'stats_overview', isVisible: false }, // Changed from default
        { id: 'unlocked_badges', isVisible: true },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedLayout));

      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      expect(result.current.layout).toHaveLength(8); // Should still have all widgets
      expect(result.current.layout.find(w => w.id === 'daily_briefing')?.isVisible).toBe(false);
      expect(result.current.layout.find(w => w.id === 'stats_overview')?.isVisible).toBe(false);
      expect(result.current.layout.find(w => w.id === 'unlocked_badges')?.isVisible).toBe(true);
      
      // Widgets not in saved layout should use defaults
      expect(result.current.layout.find(w => w.id === 'achievement_countdown')?.isVisible).toBe(true);
    });

    it('should handle invalid JSON in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      expect(result.current.layout).toHaveLength(8);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to parse layout from storage',
        expect.any(Error)
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('studySentinelDashboardLayout_v3');
    });

    it('should handle localStorage.getItem throwing an error', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      expect(result.current.layout).toHaveLength(8);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to parse layout from storage',
        expect.any(Error)
      );
    });

    it('should preserve order from saved layout when merging', () => {
      const savedLayout: DashboardWidget[] = [
        { id: 'stats_overview', isVisible: true },
        { id: 'daily_briefing', isVisible: true },
        { id: 'unlocked_badges', isVisible: false },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedLayout));

      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      // First three should match saved order
      expect(result.current.layout[0].id).toBe('stats_overview');
      expect(result.current.layout[1].id).toBe('daily_briefing');
      expect(result.current.layout[2].id).toBe('unlocked_badges');
    });
  });

  describe('Setting Layout', () => {
    it('should update layout with new array', () => {
      render(<TestComponent />, { wrapper: TestWrapper });
      
      act(() => {
        screen.getByTestId('set-custom-layout').click();
      });

      expect(screen.getByTestId('layout-length')).toHaveTextContent('2');
      expect(screen.getByTestId('visible-widgets')).toHaveTextContent('1');
    });

    it('should update layout with function', () => {
      render(<TestComponent />, { wrapper: TestWrapper });
      
      act(() => {
        screen.getByTestId('set-layout-function').click();
      });

      expect(screen.getByTestId('visible-widgets')).toHaveTextContent('0');
    });

    it('should save layout to localStorage when updated', () => {
      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      const newLayout: DashboardWidget[] = [
        { id: 'daily_briefing', isVisible: true },
        { id: 'stats_overview', isVisible: false },
      ];

      act(() => {
        result.current.setLayout(newLayout);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'studySentinelDashboardLayout_v3',
        JSON.stringify(newLayout)
      );
    });

    it('should handle localStorage.setItem errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage full');
      });

      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      const newLayout: DashboardWidget[] = [
        { id: 'daily_briefing', isVisible: true },
      ];

      act(() => {
        result.current.setLayout(newLayout);
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save dashboard layout',
        expect.any(Error)
      );
      expect(result.current.layout).toEqual(newLayout); // Should still update state
    });
  });

  describe('Toggle Widget Visibility', () => {
    it('should toggle widget visibility', () => {
      render(<TestComponent />, { wrapper: TestWrapper });
      
      // Initially daily_briefing should be visible (default)
      expect(screen.getByTestId('visible-widgets')).toHaveTextContent('6');
      
      act(() => {
        screen.getByTestId('toggle-daily-briefing').click();
      });

      expect(screen.getByTestId('visible-widgets')).toHaveTextContent('5');
      
      // Toggle back
      act(() => {
        screen.getByTestId('toggle-daily-briefing').click();
      });

      expect(screen.getByTestId('visible-widgets')).toHaveTextContent('6');
    });

    it('should save to localStorage when toggling', () => {
      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.toggleWidgetVisibility('daily_briefing');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'studySentinelDashboardLayout_v3',
        expect.stringContaining('daily_briefing')
      );
    });

    it('should only toggle the specified widget', () => {
      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      const initialLayout = result.current.layout;
      const dailyBriefingInitialState = initialLayout.find(w => w.id === 'daily_briefing')?.isVisible;
      const statsOverviewInitialState = initialLayout.find(w => w.id === 'stats_overview')?.isVisible;

      act(() => {
        result.current.toggleWidgetVisibility('daily_briefing');
      });

      expect(result.current.layout.find(w => w.id === 'daily_briefing')?.isVisible)
        .toBe(!dailyBriefingInitialState);
      expect(result.current.layout.find(w => w.id === 'stats_overview')?.isVisible)
        .toBe(statsOverviewInitialState); // Should remain unchanged
    });
  });

  describe('Function Stability', () => {
    it('should maintain function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });
      
      const initialSetLayout = result.current.setLayout;
      const initialToggleWidgetVisibility = result.current.toggleWidgetVisibility;

      rerender();

      expect(result.current.setLayout).toBe(initialSetLayout);
      expect(result.current.toggleWidgetVisibility).toBe(initialToggleWidgetVisibility);
    });
  });

  describe('Widget Names and Types', () => {
    it('should have correct widget names mapping', () => {
      expect(WIDGET_NAMES.daily_briefing).toBe('Daily Briefing / Quote');
      expect(WIDGET_NAMES.stats_overview).toBe('Statistics Overview');
      expect(WIDGET_NAMES.unlocked_badges).toBe('Badges Unlocked Today');
      expect(WIDGET_NAMES.todays_routines).toBe("Today's Routines");
      expect(WIDGET_NAMES.todays_plan).toBe("Today's Plan");
      expect(WIDGET_NAMES.completed_today).toBe("Today's Activity");
      expect(WIDGET_NAMES.achievement_countdown).toBe('Achievement Countdown');
      expect(WIDGET_NAMES.daily_active_productivity).toBe('Daily Active Productivity');
    });

    it('should have all widget types in WIDGET_NAMES', () => {
      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      result.current.layout.forEach(widget => {
        expect(WIDGET_NAMES[widget.id]).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty saved layout', () => {
      mockLocalStorage.getItem.mockReturnValue('[]');

      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      expect(result.current.layout).toHaveLength(8); // Should use defaults
    });

    it('should handle saved layout with unknown widget IDs', () => {
      const savedLayout = [
        { id: 'daily_briefing', isVisible: true },
        { id: 'unknown_widget', isVisible: true }, // Unknown widget
        { id: 'stats_overview', isVisible: false },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedLayout));

      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      // Should only include known widgets
      expect(result.current.layout).toHaveLength(8);
      expect(result.current.layout.find(w => w.id === 'unknown_widget' as DashboardWidgetType)).toBeUndefined();
    });

    it('should handle rapid successive toggles', () => {
      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      const initialState = result.current.layout.find(w => w.id === 'daily_briefing')?.isVisible;

      act(() => {
        result.current.toggleWidgetVisibility('daily_briefing');
        result.current.toggleWidgetVisibility('daily_briefing');
        result.current.toggleWidgetVisibility('daily_briefing');
      });

      expect(result.current.layout.find(w => w.id === 'daily_briefing')?.isVisible)
        .toBe(!initialState); // Should be toggled once from initial
    });

    it('should handle server-side rendering (window undefined)', () => {
      // Mock window as undefined
      const originalWindow = global.window;
      delete (global as any).window;

      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      expect(result.current.layout).toHaveLength(8); // Should use defaults
      
      // Restore window
      global.window = originalWindow;
    });

    it('should handle multiple rapid layout updates', () => {
      const { result } = renderHook(() => useDashboardLayout(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setLayout([{ id: 'daily_briefing', isVisible: true }]);
        result.current.setLayout([{ id: 'stats_overview', isVisible: false }]);
        result.current.setLayout([{ id: 'unlocked_badges', isVisible: true }]);
      });

      expect(result.current.layout).toHaveLength(1);
      expect(result.current.layout[0].id).toBe('unlocked_badges');
    });
  });
});