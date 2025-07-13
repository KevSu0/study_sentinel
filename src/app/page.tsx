
'use client';

import React, {useState, useMemo, useEffect, lazy, Suspense, useCallback} from 'react';
import dynamic from 'next/dynamic';
import {format, parseISO} from 'date-fns';
import {Button} from '@/components/ui/button';
import {
  PlusCircle,
  Star,
  Award as BadgeIcon,
  Lightbulb,
  Sparkles,
  Settings,
} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks.tsx';
import {TaskList} from '@/components/tasks/task-list';
import {SimpleTaskList} from '@/components/tasks/simple-task-list';
import {EmptyState} from '@/components/tasks/empty-state';
import {Skeleton} from '@/components/ui/skeleton';
import {type StudyTask} from '@/lib/types';
import {useBadges} from '@/hooks/useBadges';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {BadgeCard} from '@/components/badges/badge-card';
import Link from 'next/link';
import {getDailySummary} from '@/lib/actions';
import {useLogger} from '@/hooks/use-logger.tsx';
import {useProfile} from '@/hooks/use-profile.tsx';
import {useViewMode} from '@/hooks/use-view-mode.tsx';
import {cn} from '@/lib/utils';
import {useRoutines} from '@/hooks/use-routines.tsx';
import {RoutineDashboardCard} from '@/components/timetable/routine-dashboard-card';
import {
  CardCompletedRoutineItem,
  SimpleCompletedRoutineItem,
} from '@/components/dashboard/completed-routine-card';
import {
  useDashboardLayout,
  type DashboardWidgetType,
} from '@/hooks/use-dashboard-layout.tsx';
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

const ProductivityChart = lazy(
  () => import('@/components/dashboard/productivity-chart')
);

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

const motivationalQuotes = [
  {
    quote: 'The secret of getting ahead is getting started.',
    author: 'Mark Twain',
  },
  {
    quote: "Don't watch the clock; do what it does. Keep going.",
    author: 'Sam Levenson',
  },
  {
    quote: 'The expert in anything was once a beginner. Keep learning.',
    author: 'Helen Hayes',
  },
  {
    quote: 'Your future is created by what you do today, not tomorrow.',
    author: 'Robert Kiyosaki',
  },
  {
    quote: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
  },
  {
    quote:
      'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
  },
  {
    quote: "Believe you can and you're halfway there.",
    author: 'Theodore Roosevelt',
  },
  {
    quote: 'Push yourself, because no one else is going to do it for you.',
    author: 'Unknown',
  },
  {
    quote: 'Every accomplishment starts with the decision to try.',
    author: 'John F. Kennedy',
  },
  {
    quote:
      "The harder you work for something, the greater you'll feel when you achieve it.",
    author: 'Unknown',
  },
];

function SortableWidget({id, children}: {id: string; children: React.ReactNode}) {
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
  const {
    tasks,
    addTask,
    updateTask,
    archiveTask,
    unarchiveTask,
    pushTaskToNextDay,
    isLoaded: tasksLoaded,
    activeItem,
  } = useTasks();

  const {allBadges, earnedBadges, isLoaded: badgesLoaded} = useBadges();
  const {logs, getPreviousDayLogs, isLoaded: loggerLoaded} = useLogger();
  const {profile, isLoaded: profileLoaded} = useProfile();
  const {viewMode, isLoaded: viewModeLoaded} = useViewMode();
  const {routines, isLoaded: routinesLoaded} = useRoutines();
  const {layout, setLayout, isLoaded: layoutLoaded} = useDashboardLayout();
  const [isCustomizeOpen, setCustomizeOpen] = useState(false);

  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [dailySummary, setDailySummary] = useState<{
    evaluation: string;
    motivationalParagraph: string;
  } | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  const isTaskFormOpen = !!editingTask;

  useEffect(() => {
    const fetchDailySummary = async () => {
      // Wait for all data to be loaded
      if (!loggerLoaded || !profileLoaded) return;

      const DAILY_SUMMARY_KEY = 'dailySummaryLastShown';
      const lastShownDate = localStorage.getItem(DAILY_SUMMARY_KEY);

      const now = new Date();
      const currentHour = now.getHours();
      const sessionDate = new Date();

      if (currentHour < 4) {
        sessionDate.setDate(sessionDate.getDate() - 1);
      }
      const sessionDateStr = format(sessionDate, 'yyyy-MM-dd');

      if (lastShownDate === sessionDateStr) {
        setIsSummaryLoading(false);
        return;
      }

      const yesterdaysLogs = getPreviousDayLogs();

      // Only call AI if there were logs
      if (yesterdaysLogs.length > 0) {
        const summary = await getDailySummary({logs: yesterdaysLogs, profile});
        if (summary && !('error' in summary)) {
          setDailySummary(summary as any);
          localStorage.setItem(DAILY_SUMMARY_KEY, sessionDateStr);
        }
      }
      setIsSummaryLoading(false);
    };

    fetchDailySummary();
  }, [loggerLoaded, profileLoaded, getPreviousDayLogs, profile]);

  const openEditTaskDialog = useCallback((task: StudyTask) => {
    setEditingTask(task);
  }, []);

  const closeTaskFormDialog = useCallback(() => {
    setEditingTask(null);
  }, []);

  const isLoaded =
    tasksLoaded &&
    badgesLoaded &&
    loggerLoaded &&
    profileLoaded &&
    viewModeLoaded &&
    routinesLoaded &&
    layoutLoaded;

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const today = useMemo(() => new Date().getDay(), []);

  // --- Data processing ---

  const todaysTasks = tasks.filter(
    t => t.date === todayStr && t.status !== 'archived'
  );
  const pendingTasks = todaysTasks.filter(
    t => t.status === 'todo' || t.status === 'in_progress'
  );
  const todaysCompletedTasks = todaysTasks.filter(t => t.status === 'completed');

  const todaysTimedLogs = logs.filter(
    l =>
      (l.type === 'ROUTINE_SESSION_COMPLETE' ||
        l.type === 'TIMER_SESSION_COMPLETE') &&
      l.timestamp.startsWith(todayStr)
  );

  const routineLogs = todaysTimedLogs.filter(
    l => l.type === 'ROUTINE_SESSION_COMPLETE'
  );

  const routinePoints = routineLogs.reduce(
    (sum, log) => sum + (log.payload.points || 0),
    0
  );

  const pointsToday =
    todaysCompletedTasks.reduce((sum, task) => sum + task.points, 0) +
    routinePoints;

  const todaysBadges = allBadges.filter(
    badge =>
      earnedBadges.has(badge.id) &&
      earnedBadges.get(badge.id) === todayStr
  );

  const todaysRoutines = routines.filter(r => r.days.includes(today));

  const todaysCompletedRoutines = routineLogs.sort(
    (a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()
  );

  const taskTime = todaysTimedLogs
    .filter(l => l.type === 'TIMER_SESSION_COMPLETE')
    .reduce((sum, log) => sum + log.payload.duration, 0);

  const routineTime = routineLogs.reduce(
    (sum, log) => sum + log.payload.duration,
    0
  );

  const productivityData = [
    {
      name: 'Tasks',
      value: parseFloat((taskTime / 3600).toFixed(2)),
      fill: 'hsl(var(--chart-1))',
    },
    {
      name: 'Routines',
      value: parseFloat((routineTime / 3600).toFixed(2)),
      fill: 'hsl(var(--chart-2))',
    },
  ].filter(d => d.value > 0);

  const dailyQuote = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return motivationalQuotes[dayOfYear % motivationalQuotes.length];
  }, []);

  const renderTaskList = useCallback(
    (tasksToRender: StudyTask[]) => {
      const props = {
        tasks: tasksToRender,
        onUpdate: updateTask,
        onArchive: archiveTask,
        onUnarchive: unarchiveTask,
        onPushToNextDay: pushTaskToNextDay,
        onEdit: openEditTaskDialog,
        activeItem: activeItem,
      };
      return viewMode === 'card' ? (
        <TaskList {...props} />
      ) : (
        <SimpleTaskList {...props} />
      );
    },
    [
      viewMode,
      updateTask,
      archiveTask,
      unarchiveTask,
      pushTaskToNextDay,
      openEditTaskDialog,
      activeItem,
    ]
  );
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {active, over} = event;

    if (over && active.id !== over.id) {
      setLayout(prevLayout => {
        const oldIndex = prevLayout.findIndex(w => w.id === active.id);
        const newIndex = prevLayout.findIndex(w => w.id === over.id);
        return arrayMove(prevLayout, oldIndex, newIndex);
      });
    }
  }, [setLayout]);

  const widgetMap: Record<DashboardWidgetType, React.ReactNode> = {
    daily_briefing: (
        isSummaryLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : dailySummary ? (
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-yellow-400" />
                Your Daily Briefing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-primary/90">
                  Yesterday's Evaluation
                </h3>
                <p className="text-sm text-muted-foreground italic">
                  {dailySummary.evaluation}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-primary/90">
                  Today's Motivation
                </h3>
                <p className="text-sm text-muted-foreground italic">
                  {dailySummary.motivationalParagraph}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <Lightbulb className="h-8 w-8 text-yellow-400 shrink-0" />
              <div>
                <p className="italic text-primary/90">"{dailyQuote.quote}"</p>
                <p className="text-sm text-right font-medium text-muted-foreground mt-1">
                  - {dailyQuote.author}
                </p>
              </div>
            </CardContent>
          </Card>
        )
    ),
    stats_overview: (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Points Earned Today
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pointsToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Badges Unlocked Today
            </CardTitle>
            <BadgeIcon className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysBadges.length}</div>
          </CardContent>
        </Card>
        <div className="sm:col-span-2 lg:col-span-1">
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <ProductivityChart data={productivityData} />
          </Suspense>
        </div>
      </section>
    ),
    unlocked_badges: todaysBadges.length > 0 ? (
      <section>
        <h2 className="text-xl font-semibold text-primary mb-3">
          Badges Unlocked Today
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {todaysBadges.map(badge => (
            <BadgeCard key={badge.id} badge={badge} isEarned={true} />
          ))}
        </div>
      </section>
    ) : null,
    todays_routines: todaysRoutines.length > 0 ? (
      <section>
        <h2 className="text-xl font-semibold text-primary mb-3">
          Today's Routines
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {todaysRoutines.map(routine => (
            <RoutineDashboardCard key={routine.id} routine={routine} />
          ))}
        </div>
      </section>
    ) : null,
    todays_plan: pendingTasks.length > 0 ? (
      <section>
        <h2 className="text-xl font-semibold text-primary mb-3">
          Today's Plan
        </h2>
        {renderTaskList(pendingTasks)}
      </section>
    ) : null,
    completed_today: (todaysCompletedTasks.length > 0 ||
      todaysCompletedRoutines.length > 0) ? (
      <section>
        <h2 className="text-xl font-semibold text-primary mb-3">
          Completed Today
        </h2>
        {todaysCompletedTasks.length > 0 &&
          renderTaskList(todaysCompletedTasks)}

        {todaysCompletedRoutines.length > 0 && (
          <div
            className={cn(
              viewMode === 'card' ? 'space-y-4' : 'space-y-2',
              todaysCompletedTasks.length > 0 && 'mt-4'
            )}
          >
            {todaysCompletedRoutines.map(log =>
              viewMode === 'card' ? (
                <CardCompletedRoutineItem key={log.id} log={log} />
              ) : (
                <SimpleCompletedRoutineItem key={log.id} log={log} />
              )
            )}
          </div>
        )}
      </section>
    ) : null,
  };
  
  const visibleWidgets = useMemo(() => {
    return layout.filter(w => w.isVisible && widgetMap[w.id] !== null);
  }, [layout, widgetMap]);

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Today's Dashboard
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
                {visibleWidgets.map(widget => (
                  <SortableWidget key={widget.id} id={widget.id}>
                    {widgetMap[widget.id]}
                  </SortableWidget>
                ))}

                {todaysTasks.length === 0 &&
                 todaysRoutines.length === 0 && (
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
