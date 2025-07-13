
'use client';
import {useState, useEffect, useCallback} from 'react';

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
}


export function useDashboardLayout() {
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
          ...savedLayout.map(saved => mergedLayout.find(m => m.id === saved.id)).filter(Boolean),
          ...mergedLayout.filter(merged => !savedLayout.some(saved => saved.id === merged.id))
        ] as DashboardWidget[];
        
        initialLayout = finalLayout;
    } else {
        initialLayout = DEFAULT_LAYOUT;
    }
    
    setLayoutState(initialLayout);
    setIsLoaded(true);

  }, []);

  const setLayout = useCallback((newLayout: DashboardWidget[] | ((prev: DashboardWidget[]) => DashboardWidget[])) => {
    const updatedLayout = typeof newLayout === 'function' ? newLayout(layout) : newLayout;
    setLayoutState(updatedLayout);
     try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(updatedLayout));
      } catch (error) {
        console.error('Failed to save dashboard layout', error);
      }
  }, [layout]);


  const toggleWidgetVisibility = useCallback((widgetId: DashboardWidgetType) => {
    setLayout(prevLayout =>
      prevLayout.map(widget =>
        widget.id === widgetId
          ? {...widget, isVisible: !widget.isVisible}
          : widget
      )
    );
  }, [setLayout]);

  return {layout, setLayout, toggleWidgetVisibility, isLoaded};
}
