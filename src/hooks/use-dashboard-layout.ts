
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

export function useDashboardLayout() {
  const [layout, setLayoutState] = useState<DashboardWidget[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let initialLayout: DashboardWidget[] = [];
    try {
      const savedLayoutJSON = localStorage.getItem(LAYOUT_KEY);
      if (savedLayoutJSON) {
        const savedLayout = JSON.parse(savedLayoutJSON) as DashboardWidget[];
        
        // Create a map for efficient lookup of saved widgets
        const savedWidgetMap = new Map(savedLayout.map(w => [w.id, w]));
        
        // Merge saved layout with default layout to handle new widgets
        const mergedLayout = DEFAULT_LAYOUT.map(defaultWidget => 
          savedWidgetMap.has(defaultWidget.id)
            ? savedWidgetMap.get(defaultWidget.id)!
            : defaultWidget
        );

        // Ensure the order from the saved layout is respected, and new widgets are appended
        const finalLayout = [
          ...savedLayout.map(saved => mergedLayout.find(m => m.id === saved.id)).filter(Boolean),
          ...mergedLayout.filter(merged => !savedLayout.some(saved => saved.id === merged.id))
        ] as DashboardWidget[];
        
        initialLayout = finalLayout;

      } else {
        initialLayout = DEFAULT_LAYOUT;
      }
    } catch (error) {
      console.error('Failed to load dashboard layout, using default.', error);
      initialLayout = DEFAULT_LAYOUT;
    } finally {
      setLayoutState(initialLayout);
      setIsLoaded(true);
    }
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
