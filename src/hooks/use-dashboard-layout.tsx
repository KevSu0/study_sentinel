
'use client';
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from 'react';

export type DashboardWidgetType =
  | 'daily_briefing'
  | 'stats_overview'
  | 'unlocked_badges'
  | 'todays_routines'
  | 'todays_plan'
  | 'completed_today'
  | 'achievement_countdown'
  | 'daily_active_productivity'
  | 'real_productivity'
  | 'daily_real_productivity';

export interface DashboardWidget {
  id: DashboardWidgetType;
  isVisible: boolean;
}

const LAYOUT_KEY = 'studySentinelDashboardLayout_v3';

export const WIDGET_NAMES: Record<DashboardWidgetType, string> = {
  daily_briefing: 'Daily Briefing / Quote',
  stats_overview: 'Statistics Overview',
  unlocked_badges: 'Badges Unlocked Today',
  todays_routines: "Today's Routines",
  todays_plan: "Today's Plan",
  completed_today: "Today's Activity",
  achievement_countdown: 'Achievement Countdown',
  daily_active_productivity: 'Daily Active Productivity',
  real_productivity: 'Real Productivity',
  daily_real_productivity: 'Daily Real Productivity',
};

const DEFAULT_LAYOUT: DashboardWidget[] = [
  {id: 'achievement_countdown', isVisible: true},
  {id: 'daily_briefing', isVisible: true},
  {id: 'stats_overview', isVisible: true},
  {id: 'daily_active_productivity', isVisible: true},
  {id: 'real_productivity', isVisible: true},
  {id: 'daily_real_productivity', isVisible: true},
  {id: 'completed_today', isVisible: true},
  {id: 'unlocked_badges', isVisible: true},
  {id: 'todays_routines', isVisible: false},
  {id: 'todays_plan', isVisible: false},
];

interface DashboardLayoutContextType {
  layout: DashboardWidget[];
  setLayout: (
    newLayout: DashboardWidget[] | ((prev: DashboardWidget[]) => DashboardWidget[])
  ) => void;
  toggleWidgetVisibility: (widgetId: DashboardWidgetType) => void;
  isLoaded: boolean;
}

export const DashboardLayoutContext =
  createContext<DashboardLayoutContextType | null>(null);

const getLayoutFromStorage = (): DashboardWidget[] | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const savedLayoutJSON = localStorage.getItem(LAYOUT_KEY);
    if (savedLayoutJSON) {
      return JSON.parse(savedLayoutJSON);
    }
  } catch (error) {
    console.error('Failed to parse layout from storage', error);
    localStorage.removeItem(LAYOUT_KEY);
  }
  return null;
};

export function DashboardLayoutProvider({children}: {children: ReactNode}) {
  const [layout, setLayoutState] = useState<DashboardWidget[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedLayout = getLayoutFromStorage();
    let initialLayout: DashboardWidget[];

    if (savedLayout) {
      const savedWidgetMap = new Map(savedLayout.map(w => [w.id, w]));
      const mergedLayout = DEFAULT_LAYOUT.map(defaultWidget =>
        savedWidgetMap.has(defaultWidget.id)
          ? savedWidgetMap.get(defaultWidget.id)!
          : defaultWidget
      );
      const finalLayout = [
        ...savedLayout
          .map(saved => mergedLayout.find(m => m.id === saved.id))
          .filter((w): w is DashboardWidget => !!w),
        ...mergedLayout.filter(
          merged => !savedLayout.some(saved => saved.id === merged.id)
        ),
      ];
      initialLayout = finalLayout;
    } else {
      initialLayout = DEFAULT_LAYOUT;
    }

    setLayoutState(initialLayout);
    setIsLoaded(true);
  }, []);

  const setLayout = useCallback(
    (
      newLayout: DashboardWidget[] | ((prev: DashboardWidget[]) => DashboardWidget[])
    ) => {
      setLayoutState(prevLayout => {
        const updatedLayout =
          typeof newLayout === 'function' ? newLayout(prevLayout) : newLayout;
        try {
          localStorage.setItem(LAYOUT_KEY, JSON.stringify(updatedLayout));
        } catch (error) {
          console.error('Failed to save dashboard layout', error);
        }
        return updatedLayout;
      });
    },
    []
  );

  const toggleWidgetVisibility = useCallback(
    (widgetId: DashboardWidgetType) => {
      setLayout(prevLayout =>
        prevLayout.map(widget =>
          widget.id === widgetId
            ? {...widget, isVisible: !widget.isVisible}
            : widget
        )
      );
    },
    [setLayout]
  );

  const value = {
    layout,
    setLayout,
    toggleWidgetVisibility,
    isLoaded,
  };

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (!context) {
    throw new Error(
      'useDashboardLayout must be used within a DashboardLayoutProvider'
    );
  }
  return context;
}
