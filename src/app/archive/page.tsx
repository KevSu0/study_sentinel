'use client';
import React, {useMemo} from 'react';
import {useTasks} from '@/hooks/use-tasks';
import {TaskList} from '@/components/tasks/task-list';
import {EmptyState} from '@/components/tasks/empty-state';
import {Skeleton} from '@/components/ui/skeleton';
import {Archive} from 'lucide-react';

export default function ArchivePage() {
  const {
    tasks,
    updateTask,
    unarchiveTask,
    pushTaskToNextDay,
    archiveTask,
    isLoaded,
  } = useTasks();

  const archivedTasks = useMemo(
    () => tasks.filter(task => task.status === 'archived'),
    [tasks]
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
        {!isLoaded ? (
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
                <Archive className="h-16 w-16 text-primary/80" />
              </div>
            </EmptyState>
          </div>
        )}
      </main>
    </div>
  );
}
