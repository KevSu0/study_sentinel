
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
import {AddItemDialog} from '@/components/dashboard/add-item-dialog';
import {TodaysPlanWidget} from '@/components/dashboard/widgets/todays-plan-widget';
import {EmptyState} from '@/components/tasks/empty-state';

const DailyBriefingWidget = dynamic(() => import('@/components/dashboard/widgets/daily-briefing-widget').then(m => m.DailyBriefingWidget), { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> });
const StatsOverviewWidget = dynamic(() => import('@/components/dashboard/widgets/stats-overview-widget').then(m => m.StatsOverviewWidget), { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> });
const UnlockedBadgesWidget = dynamic(() => import('@/components/dashboard/widgets/unlocked-badges-widget').then(m => m.UnlockedBadgesWidget), { ssr: false, loading: () => <Skeleton className="h-28 w-full" /> });
const CompletedTodayWidget = dynamic(() => import('@/components/dashboard/widgets/completed-today-widget').then(m => m.CompletedTodayWidget), { ssr: false, loading: () => <Skeleton className="h-28 w-full" /> });
const TodaysRoutinesWidget = dynamic(() => import('@/components/dashboard/widgets/todays-routines-widget').then(m => m.TodaysRoutinesWidget), { ssr: false, loading: () => <Skeleton className="h-28 w-full" /> });
const AchievementCountdownWidget = dynamic(() => import('@/components/dashboard/widgets/achievement-countdown-widget').then(m => m.AchievementCountdownWidget), { ssr: false, loading: () => <Skeleton className="h-28 w-full" /> });


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
  const {state} = useGlobalState();
  const {layout, setLayout, isLoaded: layoutLoaded} = useDashboardLayout();

  const [isCustomizeOpen, setCustomizeOpen] = React.useState(false);

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

  const isLoaded = state.isLoaded && layoutLoaded;

  const widgetMap: Record<DashboardWidgetType, React.ComponentType<any>> = {
    daily_briefing: DailyBriefingWidget,
    stats_overview: StatsOverviewWidget,
    unlocked_badges: UnlockedBadgesWidget,
    completed_today: CompletedTodayWidget,
    todays_routines: TodaysRoutinesWidget,
    todays_plan: TodaysPlanWidget,
    achievement_countdown: AchievementCountdownWidget,
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
          <div data-testid="dashboard-skeleton" className="space-y-4">
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
                  if (!WidgetComponent) return null;
                  
                  let props: any = {};
                  if (widget.id === 'daily_briefing') {
                    props = {
                      previousDayLogs: state.previousDayLogs,
                      profile: state.profile,
                      tasks: state.tasks,
                      routines: state.routines
                    };
                  } else if (widget.id === 'stats_overview') {
                    props = {
                      todaysBadges: state.todaysBadges,
                      todaysActivity: state.todaysActivity,
                    };
                  } else if (widget.id === 'unlocked_badges') {
                    props = {
                      todaysBadges: state.todaysBadges
                    };
                  } else if (widget.id === 'completed_today') {
                    props = {
                      todaysActivity: state.todaysActivity,
                    };
                  }

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
