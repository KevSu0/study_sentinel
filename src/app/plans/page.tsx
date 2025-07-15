
'use client';

import React, { useMemo } from 'react';
import { useGlobalState } from '@/hooks/use-global-state';
import { useViewMode } from '@/hooks/use-view-mode.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TaskList } from '@/components/tasks/task-list';
import { SimpleTaskList } from '@/components/tasks/simple-task-list';
import { RoutineCard } from '@/components/routines/routine-card';
import { SimpleRoutineItem } from '@/components/routines/simple-routine-item';
import { EmptyState } from '@/components/tasks/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { CardCompletedRoutineItem, SimpleCompletedRoutineItem } from '@/components/dashboard/completed-routine-card';
import { LayoutGrid, List, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyTask, Routine } from '@/lib/types';

export default function PlansPage() {
  const {
    state,
    updateTask,
    archiveTask,
    unarchiveTask,
    pushTaskToNextDay,
    startTimer,
    onEditTask, // Assuming this function exists to open an edit dialog
  } = useGlobalState();
  const { viewMode, setViewMode } = useViewMode();

  const {
    isLoaded,
    tasks,
    todaysRoutines,
    todaysPendingTasks,
    todaysCompletedTasks,
    todaysCompletedRoutines,
    activeItem,
    allCompletedWork,
  } = state;

  const overdueTasks = useMemo(() => {
    if (!isLoaded) return [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return tasks.filter(
      task =>
        task.date < todayStr &&
        task.status !== 'completed' &&
        task.status !== 'archived'
    );
  }, [tasks, isLoaded]);
  
  const todaysProductiveTime = useMemo(() => {
    if (!isLoaded) return 0;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return allCompletedWork
      .filter(work => work.date === todayStr)
      .reduce((sum, work) => sum + work.duration, 0);
  }, [allCompletedWork, isLoaded]);

  const formatProductiveTime = (totalMinutes: number) => {
    if (totalMinutes === 0) return '0m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    return `${minutes}m`;
  };


  const renderTaskList = (tasksToRender: StudyTask[]) => {
    const props = {
      tasks: tasksToRender,
      onUpdate: updateTask,
      onArchive: archiveTask,
      onUnarchive: unarchiveTask,
      onPushToNextDay: pushTaskToNextDay,
      onEdit: onEditTask,
      activeItem: activeItem,
    };
    return viewMode === 'card' ? (
      <TaskList {...props} />
    ) : (
      <SimpleTaskList {...props} />
    );
  };
  
  const renderRoutines = (routinesToRender: Routine[]) => {
      return viewMode === 'card' ? (
        <div className="grid gap-4 md:grid-cols-2">
            {routinesToRender.map(routine => (
                <RoutineCard key={routine.id} routine={routine} />
            ))}
        </div>
      ) : (
        <div className="space-y-2">
            {routinesToRender.map(routine => (
                <SimpleRoutineItem key={routine.id} routine={routine} />
            ))}
        </div>
      );
  }

  const renderCompletedRoutines = (logs: any[]) => {
     return viewMode === 'card' ? (
        <div className="space-y-4">
            {logs.map(log => (
              <CardCompletedRoutineItem key={log.id} log={log} />
            ))}
        </div>
      ) : (
        <div className="space-y-2">
            {logs.map(log => (
              <SimpleCompletedRoutineItem key={log.id} log={log} />
            ))}
        </div>
      );
  }


  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
                 <h1 className="text-3xl font-bold text-primary">
                  Today's Plans & Routines
                </h1>
                <p className="text-muted-foreground mt-1">
                  Your agenda for {format(new Date(), 'MMMM d, yyyy')}.
                </p>
                 {isLoaded && (
                  <div className="flex items-center gap-2 mt-2 text-sm font-medium text-accent">
                    <Clock className="h-4 w-4" />
                    <span>
                      Productive Time Today: {formatProductiveTime(todaysProductiveTime)}
                    </span>
                  </div>
                )}
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <Button
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Card View</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List View</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>

          {/* Upcoming Tab */}
          <TabsContent value="upcoming" className="mt-6 space-y-6">
            {!isLoaded ? (
              <Skeleton className="h-40 w-full" />
            ) : todaysPendingTasks.length > 0 || todaysRoutines.length > 0 ? (
              <>
                {todaysRoutines.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-primary mb-3">
                      Today's Routines
                    </h2>
                    {renderRoutines(todaysRoutines)}
                  </section>
                )}
                {todaysPendingTasks.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-primary mb-3">
                      Today's Tasks
                    </h2>
                    {renderTaskList(todaysPendingTasks)}
                  </section>
                )}
              </>
            ) : (
              <div className="pt-16">
                <EmptyState
                  onAddTask={() => {}}
                  title="All Clear for Today!"
                  message="No upcoming tasks or routines. Enjoy the peace or plan a new task."
                  buttonText="Plan New Task"
                />
              </div>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="mt-6 space-y-6">
            {!isLoaded ? (
              <Skeleton className="h-40 w-full" />
            ) : todaysCompletedTasks.length > 0 ||
              todaysCompletedRoutines.length > 0 ? (
              <>
                {todaysCompletedRoutines.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-primary mb-3">
                      Completed Routines
                    </h2>
                     {renderCompletedRoutines(todaysCompletedRoutines)}
                  </section>
                )}
                {todaysCompletedTasks.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-primary mb-3">
                      Completed Tasks
                    </h2>
                    {renderTaskList(todaysCompletedTasks)}
                  </section>
                )}
              </>
            ) : (
              <div className="pt-16">
                <EmptyState
                  onAddTask={() => {}}
                  title="Nothing Completed Yet"
                  message="Get started on your tasks to see your achievements here."
                  buttonText="View Upcoming Tasks"
                />
              </div>
            )}
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue" className="mt-6">
            {!isLoaded ? (
              <Skeleton className="h-40 w-full" />
            ) : overdueTasks.length > 0 ? (
              <section>
                <h2 className="text-xl font-semibold text-destructive mb-3">
                  Overdue Tasks
                </h2>
                {renderTaskList(overdueTasks)}
              </section>
            ) : (
              <div className="pt-16">
                <EmptyState
                  onAddTask={() => {}}
                  title="No Overdue Tasks"
                  message="Great job staying on top of your work!"
                  buttonText="View All Tasks"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
