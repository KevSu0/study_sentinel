'use client';
import React, {useState, useEffect, useCallback, createContext, useContext, ReactNode} from 'react';

export type DashboardWidgetType =
  | 'daily_briefing'
  | 'stats_overview'
  | 'unlocked_badges'
  | 'todays_routines'
  | 'todays_plan'
  | 'completed_today';

export interface DashboardWidget {
  id: DashboardWidgetType;
  isVisible: boolean;
}

const LAYOUT_KEY = 'studySentinelDashboardLayout_v2';

export const WIDGET_NAMES: Record<DashboardWidgetType, string> = {
  daily_briefing: 'Daily Briefing / Quote',
  stats_overview: 'Statistics Overview',
  unlocked_badges: 'Badges Unlocked Today',
  todays_routines: "Today's Routines",
  todays_plan: "Today's Plan",
  completed_today: 'Completed Today',
};

const DEFAULT_LAYOUT: DashboardWidget[] = [
  {id: 'daily_briefing', isVisible: true},
  {id: 'stats_overview', isVisible: true},
  {id: 'unlocked_badges', isVisible: true},
  {id: 'todays_routines', isVisible: true},
  {id: 'todays_plan', isVisible: true},
  {id: 'completed_today', isVisible: true},
];

interface DashboardLayoutContextType {
    layout: DashboardWidget[];
    setLayout: (newLayout: DashboardWidget[] | ((prev: DashboardWidget[]) => DashboardWidget[])) => void;
    toggleWidgetVisibility: (widgetId: DashboardWidgetType) => void;
    isLoaded: boolean;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextType | null>(null);

// Helper function to get layout from localStorage, safe for SSR
const getLayoutFromStorage = (): DashboardWidget[] => {
    if (typeof window === 'undefined') {
        return DEFAULT_LAYOUT;
    }
    try {
        const savedLayoutJSON = localStorage.getItem(LAYOUT_KEY);
        if (savedLayoutJSON) {
            const savedLayout = JSON.parse(savedLayoutJSON) as DashboardWidget[];
            // Merge saved layout with default to ensure all widgets are present
            const savedWidgetMap = new Map(savedLayout.map(w => [w.id, w]));
            return DEFAULT_LAYOUT.map(
                defaultWidget => savedWidgetMap.get(defaultWidget.id) || defaultWidget
            );
        }
    } catch (error) {
        console.error('Failed to parse layout from storage', error);
        localStorage.removeItem(LAYOUT_KEY);
    }
    return DEFAULT_LAYOUT;
}

export function DashboardLayoutProvider({children}: {children: ReactNode}) {
  const [layout, setLayoutState] = useState<DashboardWidget[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initialLayout = getLayoutFromStorage();
    setLayoutState(initialLayout);
    setIsLoaded(true);
  }, []);

  const setLayout = useCallback((newLayout: DashboardWidget[] | ((prev: DashboardWidget[]) => DashboardWidget[])) => {
    setLayoutState(prevLayout => {
        const updatedLayout = typeof newLayout === 'function' ? newLayout(prevLayout) : newLayout;
        if (JSON.stringify(prevLayout) !== JSON.stringify(updatedLayout)) {
            try {
                localStorage.setItem(LAYOUT_KEY, JSON.stringify(updatedLayout));
            } catch (error) {
                console.error('Failed to save dashboard layout', error);
            }
            return updatedLayout;
        }
        return prevLayout;
    });
  }, []);

  const toggleWidgetVisibility = useCallback((widgetId: DashboardWidgetType) => {
    setLayout(prevLayout => {
        const newLayout = prevLayout.map(widget =>
            widget.id === widgetId
                ? {...widget, isVisible: !widget.isVisible}
                : widget
        );
        return newLayout;
    });
  }, [setLayout]);

  const value = {layout, setLayout, toggleWidgetVisibility, isLoaded};

  return (
    <DashboardLayoutContext.Provider value={value}>
        {children}
    </DashboardLayoutContext.Provider>
  )
}

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (!context) {
    throw new Error('useDashboardLayout must be used within a DashboardLayoutProvider');
  }
  return context;
}
