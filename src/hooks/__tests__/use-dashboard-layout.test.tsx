import { renderHook, act } from '@testing-library/react';
import { DashboardLayoutProvider, useDashboardLayout, DashboardWidget } from '../use-dashboard-layout';
import React, { ReactNode } from 'react';

const LAYOUT_KEY = 'studySentinelDashboardLayout_v3';

const wrapper = ({ children }: { children: ReactNode }) => (
  <DashboardLayoutProvider>{children}</DashboardLayoutProvider>
);

describe('useDashboardLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should throw an error if used outside of a DashboardLayoutProvider', () => {
    // Suppress console.error for this specific test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => renderHook(() => useDashboardLayout())).toThrow(
      'useDashboardLayout must be used within a DashboardLayoutProvider'
    );
    
    // Restore original console.error
    console.error = originalError;
  });

  it('should initialize with the default layout if localStorage is empty', () => {
    const { result } = renderHook(() => useDashboardLayout(), { wrapper });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.layout).toBeInstanceOf(Array);
    expect(result.current.layout.length).toBe(7);
  });

  it('should load layout from localStorage if available', () => {
    const storedLayout: DashboardWidget[] = [
      { id: 'daily_briefing', isVisible: false },
    ];
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(storedLayout));

    const { result } = renderHook(() => useDashboardLayout(), { wrapper });

    expect(result.current.layout.find(w => w.id === 'daily_briefing')?.isVisible).toBe(false);
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorage.setItem(LAYOUT_KEY, 'invalid-json');
    const { result } = renderHook(() => useDashboardLayout(), { wrapper });

    expect(result.current.layout).toBeInstanceOf(Array);
    expect(console.error).toHaveBeenCalledWith(
      'Failed to parse layout from storage',
      expect.any(Error)
    );
  });

  it('should merge stored layout with default layout, preserving order and adding new widgets', () => {
    const storedLayout: DashboardWidget[] = [
      { id: 'todays_plan', isVisible: true },
      { id: 'stats_overview', isVisible: false },
    ];
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(storedLayout));

    const { result } = renderHook(() => useDashboardLayout(), { wrapper });

    const statsOverview = result.current.layout.find(w => w.id === 'stats_overview');
    const todaysPlan = result.current.layout.find(w => w.id === 'todays_plan');
    const newWidget = result.current.layout.find(w => w.id === 'achievement_countdown');

    expect(statsOverview?.isVisible).toBe(false);
    expect(todaysPlan?.isVisible).toBe(true);
    expect(newWidget).toBeDefined();
    expect(result.current.layout.length).toBeGreaterThan(storedLayout.length);
    // Check order
    expect(result.current.layout[0].id).toBe('todays_plan');
    expect(result.current.layout[1].id).toBe('stats_overview');
  });

  it('should toggle widget visibility', () => {
    const { result } = renderHook(() => useDashboardLayout(), { wrapper });
    const widgetId = 'daily_briefing';
    const initialVisibility = result.current.layout.find(w => w.id === widgetId)!.isVisible;

    act(() => {
      result.current.toggleWidgetVisibility(widgetId);
    });

    expect(result.current.layout.find(w => w.id === widgetId)!.isVisible).toBe(!initialVisibility);
  });

  it('should allow setting the layout directly', () => {
    const { result } = renderHook(() => useDashboardLayout(), { wrapper });
    const newLayout: DashboardWidget[] = [
      { id: 'unlocked_badges', isVisible: false },
    ];

    act(() => {
      result.current.setLayout(newLayout);
    });

    expect(result.current.layout).toEqual(newLayout);
  });

  it('should allow setting the layout with a function', () => {
    const { result } = renderHook(() => useDashboardLayout(), { wrapper });
    
    act(() => {
      result.current.setLayout(prev => prev.filter(w => w.id === 'daily_briefing'));
    });

    expect(result.current.layout.length).toBe(1);
    expect(result.current.layout[0].id).toBe('daily_briefing');
  });

  it('should handle localStorage.setItem failure gracefully when setting layout', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    const { result } = renderHook(() => useDashboardLayout(), { wrapper });

    act(() => {
      result.current.toggleWidgetVisibility('daily_briefing');
    });

    expect(console.error).toHaveBeenCalledWith(
      'Failed to save dashboard layout',
      expect.any(Error)
    );
    setItemSpy.mockRestore();
  });
    
  it('should not fail if window is undefined (SSR)', () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    const { result } = renderHook(() => useDashboardLayout(), { wrapper });
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.layout).toBeInstanceOf(Array);

    global.window = originalWindow;
  });
});