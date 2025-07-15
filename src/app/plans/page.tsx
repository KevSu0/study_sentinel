// This is a new file
'use client';

import React, { useMemo } from 'react';
import { useGlobalState } from '@/hooks/use-global-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskList } from '@/components/tasks/task-list';
import { RoutineDashboardCard } from '@/components/timetable/routine-dashboard-card';
import { EmptyState } from '@/components/tasks/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { CardCompletedRoutineItem } from '@/components/dashboard/completed-routine-card';

export default function PlansPage() {
  const {
    state,
    updateTask,
    archiveTask,
    unarchiveTask,
    pushTaskToNextDay,
    startTimer,
  } = useGlobalState();

  const {
    isLoaded,
    tasks,
    todaysRoutines,
    todaysPendingTasks,
    todaysCompletedTasks,
    todaysCompletedRoutines,
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

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold text-primary">
          Today's Plans & Routines
        </h1>
        <p className="text-muted-foreground">
          Your agenda for {format(new Date(), 'MMMM d, yyyy')}.
        </p>
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
                    <div className="grid gap-4 md:grid-cols-2">
                      {todaysRoutines.map(routine => (
                        <RoutineDashboardCard
                          key={routine.id}
                          routine={routine}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {todaysPendingTasks.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-primary mb-3">
                      Today's Tasks
                    </h2>
                    <TaskList
                      tasks={todaysPendingTasks}
                      onUpdate={updateTask}
                      onArchive={archiveTask}
                      onUnarchive={unarchiveTask}
                      onPushToNextDay={pushTaskToNextDay}
                      onEdit={() => {}} // This should open a dialog
                    />
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
                {todaysCompletedTasks.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-primary mb-3">
                      Completed Tasks
                    </h2>
                    <TaskList
                      tasks={todaysCompletedTasks}
                      onUpdate={updateTask}
                      onArchive={archiveTask}
                      onUnarchive={unarchiveTask}
                      onPushToNextDay={pushTaskToNextDay}
                      onEdit={() => {}}
                    />
                  </section>
                )}
                {todaysCompletedRoutines.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-primary mb-3">
                      Completed Routines
                    </h2>
                     <div className="space-y-4">
                        {todaysCompletedRoutines.map(log => (
                          <CardCompletedRoutineItem key={log.id} log={log} />
                        ))}
                      </div>
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
                <TaskList
                  tasks={overdueTasks}
                  onUpdate={updateTask}
                  onArchive={archiveTask}
                  onUnarchive={unarchiveTask}
                  onPushToNextDay={pushTaskToNextDay}
                  onEdit={() => {}}
                />
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
