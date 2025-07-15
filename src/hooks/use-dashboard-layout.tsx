
'use client';
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  ReactNode,
} from 'react';

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
  todays_routines: "Today Routines",
  todays_plan: "Today Plan",
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
  setLayout: (
    newLayout: DashboardWidget[] | ((prev: DashboardWidget[]) => DashboardWidget[])
  ) => void;
  toggleWidgetVisibility: (widgetId: DashboardWidgetType) => void;
  isLoaded: boolean;
  visibleWidgets: DashboardWidget[];
}

const DashboardLayoutContext =
  createContext<DashboardLayoutContextType | null>(null);

// This is a helper function to ensure localStorage is only accessed on the client
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
      // Create a map of saved widgets for efficient lookup
      const savedWidgetMap = new Map(savedLayout.map(w => [w.id, w]));

      // Merge with defaults to ensure new widgets are included
      const mergedLayout = DEFAULT_LAYOUT.map(defaultWidget =>
        savedWidgetMap.has(defaultWidget.id)
          ? savedWidgetMap.get(defaultWidget.id)! // Use saved config
          : defaultWidget // Use default for new widgets
      );

      // Re-order based on saved order, appending any new widgets at the end
      const finalLayout = [
        // Start with widgets in the order they were saved
        ...savedLayout
          .map(saved => mergedLayout.find(m => m.id === saved.id))
          .filter((w): w is DashboardWidget => !!w),
        // Add any new widgets from the default layout that weren't in the saved layout
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

  const visibleWidgets = useMemo(() => {
    return layout.filter(w => w.isVisible);
  }, [layout]);

  const value = {
    layout,
    setLayout,
    toggleWidgetVisibility,
    isLoaded,
    visibleWidgets,
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
