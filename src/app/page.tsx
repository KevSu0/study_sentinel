
'use client';

import React, {useState} from 'react';
import dynamic from 'next/dynamic';
import {format} from 'date-fns';
import {Button} from '@/components/ui/button';
import {PlusCircle, Settings} from 'lucide-react';
import {useGlobalState, type ActivityFeedItem} from '@/hooks/use-global-state';
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
import {AddItemDialog} from '@/components/dashboard/add-item-dialog';
import {DailyBriefingWidget} from '@/components/dashboard/widgets/daily-briefing-widget';
import {StatsOverviewWidget} from '@/components/dashboard/widgets/stats-overview-widget';
import {UnlockedBadgesWidget} from '@/components/dashboard/widgets/unlocked-badges-widget';
import {CompletedTodayWidget} from '@/components/dashboard/widgets/completed-today-widget';
import {TodaysRoutinesWidget} from '@/components/dashboard/widgets/todays-routines-widget';
import {TodaysPlanWidget} from '@/components/dashboard/widgets/todays-plan-widget';
import {AchievementCountdownWidget} from '@/components/dashboard/widgets/achievement-countdown-widget';
import {EmptyState} from '@/components/tasks/empty-state';
import toast from 'react-hot-toast';
import { useStats } from '@/hooks/use-stats';
import { getSessionDate } from '@/lib/utils';
import { DailyActiveProductivityWidget } from '@/components/dashboard/widgets/daily-active-productivity-widget';

const CustomizeDialog = dynamic(
  () =>
    import('@/components/dashboard/customize-dialog').then(
      m => m.CustomizeDialog
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-[400px]" />,
  }
);

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
  const {state, updateTask, updateLog, removeLog} = useGlobalState();
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

  const handleUndoComplete = (item: ActivityFeedItem) => {
    if (item.type === 'ROUTINE_COMPLETE') {
      updateLog(item.data.id, { isUndone: true });
      toast.success('Routine completion undone.');
    } else if (item.type === 'TASK_COMPLETE') {
      updateTask({ ...item.data.task, status: 'todo' });
      toast.success('Task marked as not complete.');
    }
  };

  const handleHardUndo = (item: ActivityFeedItem) => {
    if (item.type === 'ROUTINE_COMPLETE') {
      removeLog(item.data.id);
      toast.error('Routine completion permanently removed.');
    } else if (item.type === 'TASK_COMPLETE' && item.data.log) {
      removeLog(item.data.log.id);
      updateTask({ ...item.data.task, status: 'todo' });
      toast.error('Task completion has been permanently reset.');
    }
  };

  const isLoaded = state.isLoaded && layoutLoaded;

  const widgetMap: Record<DashboardWidgetType, React.FC<any>> = {
    daily_briefing: DailyBriefingWidget,
    stats_overview: () => (
        <div className="space-y-4">
            <StatsOverviewWidget todaysBadges={state.todaysBadges}  />
            <DailyActiveProductivityWidget
                productivity={activeProductivityData.length > 0 ? activeProductivityData[activeProductivityData.length - 1].productivity : 0}
                isLoaded={isLoaded}
            />
        </div>
    ),
    unlocked_badges: UnlockedBadgesWidget,
    completed_today: CompletedTodayWidget,
    todays_routines: TodaysRoutinesWidget,
    todays_plan: TodaysPlanWidget,
    achievement_countdown: AchievementCountdownWidget,
    daily_active_productivity: DailyActiveProductivityWidget
  };

  const widgetPropsMap: Record<DashboardWidgetType, any> = {
    daily_briefing: {
        previousDayLogs: state.previousDayLogs,
        profile: state.profile,
        tasks: state.tasks,
        routines: state.routines
    },
    stats_overview: {},
    unlocked_badges: {
        todaysBadges: state.todaysBadges
    },
    completed_today: {
        todaysActivity: state.todaysActivity.filter(activity => activity.timestamp.startsWith(format(new Date(), 'yyyy-MM-dd'))),
        onUndoComplete: handleUndoComplete,
        onHardUndoComplete: handleHardUndo,
    },
    todays_routines: {},
    todays_plan: {},
    achievement_countdown: {},
    daily_active_productivity: {
        productivity: activeProductivityData.length > 0 ? activeProductivityData[activeProductivityData.length - 1].productivity : 0,
        isLoaded: isLoaded,
    }
  };
  
  const hasContent = state.tasks.length > 0 || state.routines.length > 0 || state.todaysActivity.length > 0;

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
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
            <AddItemDialog />
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
