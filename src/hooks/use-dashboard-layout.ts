
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

const LAYOUT_KEY = 'studySentinelDashboardLayout_v1';

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
  const [layout, setLayout] = useState<DashboardWidget[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem(LAYOUT_KEY);
      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout);
        // Sync with default layout to add new widgets if any
        const newLayout = DEFAULT_LAYOUT.map(defaultWidget => {
            const savedWidget = parsedLayout.find((w: DashboardWidget) => w.id === defaultWidget.id);
            return savedWidget || defaultWidget;
        });
        // Ensure order is preserved for saved items
        const orderedLayout = parsedLayout.map((saved: DashboardWidget) => newLayout.find(w => w.id === saved.id)).filter(Boolean);
        // Add any new widgets that were not in the saved layout
        DEFAULT_LAYOUT.forEach(defaultWidget => {
            if (!orderedLayout.some(w => w.id === defaultWidget.id)) {
                orderedLayout.push(defaultWidget);
            }
        });
        setLayout(orderedLayout as DashboardWidget[]);

      } else {
        setLayout(DEFAULT_LAYOUT);
      }
    } catch (error) {
      console.error('Failed to load dashboard layout', error);
      setLayout(DEFAULT_LAYOUT);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if(isLoaded) {
      try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
      } catch (error) {
        console.error('Failed to save dashboard layout', error);
      }
    }
  }, [layout, isLoaded]);


  const toggleWidgetVisibility = useCallback((widgetId: DashboardWidgetType) => {
    setLayout(prevLayout => prevLayout.map(widget =>
      widget.id === widgetId
        ? {...widget, isVisible: !widget.isVisible}
        : widget
    ));
  }, []);

  return {layout, setLayout, toggleWidgetVisibility, isLoaded};
}
