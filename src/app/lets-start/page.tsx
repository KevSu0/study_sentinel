
'use client';

import React, {useState, useCallback} from 'react';
import dynamic from 'next/dynamic';
import {format} from 'date-fns';
import {Button} from '@/components/ui/button';
import {PlusCircle, Settings} from 'lucide-react';
import {useGlobalState} from '@/hooks/use-global-state';
import {useViewMode} from '@/hooks/use-view-mode.tsx';
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
import {type StudyTask} from '@/lib/types';
import Link from 'next/link';
import {DailyBriefingWidget} from '@/components/dashboard/widgets/daily-briefing-widget';
import {StatsOverviewWidget} from '@/components/dashboard/widgets/stats-overview-widget';
import {UnlockedBadgesWidget} from '@/components/dashboard/widgets/unlocked-badges-widget';
import {CompletedTodayWidget} from '@/components/dashboard/widgets/completed-today-widget';
import {EmptyState} from '@/components/tasks/empty-state';

const TaskDialog = dynamic(
  () => import('@/components/tasks/add-task-dialog').then(m => m.TaskDialog),
  {ssr: false}
);

const CustomizeDialog = dynamic(
  () =>
    import('@/components/dashboard/customize-dialog').then(
      m => m.CustomizeDialog
    ),
  {ssr: false}
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

export default function LetsStartPage() {
  const {
    state,
    addTask,
    updateTask,
    archiveTask,
    unarchiveTask,
    pushTaskToNextDay,
  } = useGlobalState();
  const {viewMode} = useViewMode();
  const {layout, setLayout, visibleWidgets, isLoaded: layoutLoaded} =
    useDashboardLayout();

  const [isCustomizeOpen, setCustomizeOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const isTaskFormOpen = !!editingTask;

  const openEditTaskDialog = useCallback((task: StudyTask) => {
    setEditingTask(task);
  }, []);

  const closeTaskFormDialog = useCallback(() => {
    setEditingTask(null);
  }, []);

  const handleDragEnd = useCallback(
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

  const widgetMap: Record<DashboardWidgetType, React.FC<any>> = {
    daily_briefing: DailyBriefingWidget,
    stats_overview: StatsOverviewWidget,
    unlocked_badges: UnlockedBadgesWidget,
    completed_today: CompletedTodayWidget,
  };

  const widgetProps = {
    ...state,
    onEditTask: openEditTaskDialog,
    onUpdateTask: updateTask,
    onArchiveTask: archiveTask,
    onUnarchiveTask: unarchiveTask,
    onPushTask: pushTaskToNextDay,
    viewMode,
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Let's Start
            </h1>
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
            <Button asChild className="w-full sm:w-auto">
              <Link href="/tasks">
                <PlusCircle />
                Manage Tasks
              </Link>
            </Button>
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
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleWidgets.map(w => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {visibleWidgets.map(widget => {
                  const WidgetComponent = widgetMap[widget.id];
                  if (!WidgetComponent) return null;
                  return (
                    <SortableWidget key={widget.id} id={widget.id}>
                      <WidgetComponent {...widgetProps} />
                    </SortableWidget>
                  );
                })}

                {state.todaysPendingTasks.length === 0 &&
                  state.todaysRoutines.length === 0 && (
                    <div className="flex items-center justify-center pt-16">
                      <EmptyState
                        onAddTask={() => {}}
                        title="A Fresh Start!"
                        message="No tasks or routines scheduled for today. Let's plan your day!"
                      >
                        <div className="flex flex-col sm:flex-row gap-4 mt-6">
                          <Button asChild>
                            <Link href="/tasks">
                              <PlusCircle /> Plan Tasks
                            </Link>
                          </Button>
                          <Button asChild variant="outline">
                            <Link href="/timetable">
                              <PlusCircle /> Set up Routines
                            </Link>
                          </Button>
                        </div>
                      </EmptyState>
                    </div>
                  )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>
      <TaskDialog
        isOpen={isTaskFormOpen}
        onOpenChange={open => !open && closeTaskFormDialog()}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        taskToEdit={editingTask}
      />
      <CustomizeDialog
        isOpen={isCustomizeOpen}
        onOpenChange={setCustomizeOpen}
      />
    </div>
  );
}
