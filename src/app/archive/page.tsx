'use client';
import React, {useMemo} from 'react';
import {useGlobalState} from '@/hooks/use-global-state';
import {TaskList} from '@/components/tasks/task-list';
import {EmptyState} from '@/components/tasks/empty-state';
import {Skeleton} from '@/components/ui/skeleton';

export default function ArchivePage() {
  const {
    state,
    updateTask,
    unarchiveTask,
    pushTaskToNextDay,
    archiveTask,
  } = useGlobalState();

  const archivedTasks = useMemo(
    () => state.tasks.filter(task => task.status === 'archived'),
    [state.tasks]
  );

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold text-primary">Archived Tasks</h1>
        <p className="text-muted-foreground">
          A record of your completed and stored tasks.
        </p>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        {!state.isLoaded ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : archivedTasks.length > 0 ? (
          <TaskList
            tasks={archivedTasks}
            onUpdate={updateTask}
            onArchive={archiveTask}
            onUnarchive={unarchiveTask}
            onPushToNextDay={pushTaskToNextDay}
            onEdit={() => {}}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              onAddTask={() => {}}
              title="Archive is Empty"
              message="Tasks you archive will appear here."
            >
              <div className="mt-6">
                <svg className="h-16 w-16 text-primary/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4m0 0V4a2 2 0 012-2h2a2 2 0 012 2v4m-6 0l4 4 4-4" />
                </svg>
              </div>
            </EmptyState>
          </div>
        )}
      </main>
    </div>
  );
}
