
'use client';

import React, {useState} from 'react';
import dynamic from 'next/dynamic';
import {format} from 'date-fns';
import {Button} from '@/components/ui/button';
import {PlusCircle, Settings} from 'lucide-react';
import {useGlobalState} from '@/hooks/use-global-state';
import {
  useDashboardLayout,
  type DashboardWidgetType,
} from '@/hooks/use-dashboard-layout';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {Skeleton} from '@/components/ui/skeleton';
import Link from 'next/link';
// Import lazy-loaded components for better performance
import {
  LazyStatsOverviewWidget,
  LazyTodaysRoutinesWidget,
  LazyCompletedTodayWidget,
  LazyUnlockedBadgesWidget,
  LazyDailyBriefingWidget,
  LazyAchievementCountdownWidget,
  LazyDailyActiveProductivityWidget,
  LazyRealProductivityWidget,
  LazyDailyRealProductivityWidget,
  LazyAddItemDialog,
} from '@/components/lazy/dashboard-components';
import {TodaysPlanWidget} from '@/components/dashboard/widgets/todays-plan-widget';
import {EmptyState} from '@/components/tasks/empty-state';
import toast from 'react-hot-toast';
import { useStats } from '@/hooks/use-stats';
import { getSessionDate } from '@/lib/utils';
import { DailyActiveProductivityWidget } from '@/components/dashboard/widgets/daily-active-productivity-widget';
import type { StudyTask } from '@/lib/types';

// Use lazy-loaded customize dialog
import { LazyCustomizeDialog } from '@/components/lazy/dashboard-components';

const CustomizeDialog = LazyCustomizeDialog;

function SortableWidget({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {attributes, listeners, setNodeRef, transform, transition} =
    useSortable({id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const {state, updateTask, retryItem, hardUndoAttempt} = useGlobalState() as any;
  const {layout, setLayout, isLoaded: layoutLoaded} = useDashboardLayout();

  const [isCustomizeOpen, setCustomizeOpen] = React.useState(false);

  const {
    realProductivityData,
    activeProductivityData,
  } = useStats({
    timeRange: 'weekly', // For trend data
    selectedDate: getSessionDate(),
  });

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const {active, over} = event;
      if (over && active.id !== over.id) {
        setLayout(prevLayout => {
          const oldIndex = prevLayout.findIndex(w => w.id === active.id);
          const newIndex = prevLayout.findIndex(w => w.id === over.id);
          return arrayMove(prevLayout, oldIndex, newIndex);
        });
      }
    },
    [setLayout]
  );

  const handleUndoComplete = (item: any) => {
    retryItem(item);
  };

  const handleHardUndo = (item: any) => {
    hardUndoAttempt(item);
  };

  const handleUpdateTask = (task: StudyTask) => {
    // Check if this is a manual completion (status changing to 'completed')
    const isManualCompletion = task.status === 'completed';
    updateTask(task, isManualCompletion);
  };

  const isLoaded = state.isLoaded && layoutLoaded;

  const widgetMap: Record<DashboardWidgetType, React.ComponentType<any>> = {
    daily_briefing: LazyDailyBriefingWidget,
    stats_overview: () => (
        <div className="space-y-4">
            <LazyStatsOverviewWidget todaysBadges={state.todaysBadges}  />
            <LazyDailyActiveProductivityWidget
                productivity={activeProductivityData.length > 0 ? activeProductivityData[activeProductivityData.length - 1].productivity : 0}
                isLoaded={isLoaded}
            />
        </div>
    ),
    unlocked_badges: LazyUnlockedBadgesWidget,
    completed_today: LazyCompletedTodayWidget,
    todays_routines: LazyTodaysRoutinesWidget,
    todays_plan: TodaysPlanWidget,
    achievement_countdown: LazyAchievementCountdownWidget,
    daily_active_productivity: LazyDailyActiveProductivityWidget,
    real_productivity: LazyRealProductivityWidget,
    daily_real_productivity: LazyDailyRealProductivityWidget
  };

  const widgetPropsMap: Record<DashboardWidgetType, any> = {
    daily_briefing: {
        // DailyBriefingWidget expects `previousDayActivities`; pass today's completed activities for now.
        previousDayActivities: state.todaysCompletedActivities,
        profile: state.profile,
        tasks: state.tasks,
        routines: state.routines
    },
    stats_overview: {},
    unlocked_badges: {
        todaysBadges: state.todaysBadges
    },
    completed_today: {
        todaysCompletedActivities: state.todaysCompletedActivities,
        onUndoComplete: handleUndoComplete,
        onDeleteComplete: handleHardUndo,
    },
    todays_routines: {},
    todays_plan: {},
    achievement_countdown: {},
    daily_active_productivity: {
        productivity: activeProductivityData.length > 0 ? activeProductivityData[activeProductivityData.length - 1].productivity : 0,
        isLoaded: isLoaded,
    },
    real_productivity: {
        data: realProductivityData,
        isLoaded: isLoaded,
    },
    daily_real_productivity: {
        productivity: realProductivityData.length > 0 ? realProductivityData[realProductivityData.length - 1].productivity : 0,
        isLoaded: isLoaded,
    }
  };
  
  const hasContent = state.tasks.length > 0 || state.routines.length > 0 || state.todaysCompletedActivities.length > 0;

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
            <p className="text-muted-foreground">
              Your achievements for {format(new Date(), 'MMMM d, yyyy')}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomizeOpen(true)}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Customize</span>
            </Button>
            <LazyAddItemDialog />
          </div>
        </div>

      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        {!isLoaded ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : hasContent ? (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={layout.map(w => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {layout.map(widget => {
                  if (!widget.isVisible) return null;
                  const WidgetComponent = widgetMap[widget.id];
                  const props = widgetPropsMap[widget.id];
                  if (!WidgetComponent) return null;
                  return (
                    <SortableWidget key={widget.id} id={widget.id}>
                      <WidgetComponent {...props} />
                    </SortableWidget>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex items-center justify-center pt-16">
            <EmptyState
              onAddTask={() => {}}
              title="A Fresh Start!"
              message="No tasks or routines scheduled for today. Let's plan your day!"
            >
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <Button asChild>
                  <Link href="/plans">
                    <PlusCircle /> Plan Tasks & Routines
                  </Link>
                </Button>
              </div>
            </EmptyState>
          </div>
        )}
      </main>
      <CustomizeDialog
        isOpen={isCustomizeOpen}
        onOpenChange={setCustomizeOpen}
      />
    </div>
  );
}
