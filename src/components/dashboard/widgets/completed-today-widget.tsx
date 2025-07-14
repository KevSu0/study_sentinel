
'use client';
import React from 'react';
import {SimpleTaskList} from '@/components/tasks/simple-task-list';
import {TaskList} from '@/components/tasks/task-list';
import {
  CardCompletedRoutineItem,
  SimpleCompletedRoutineItem,
} from '@/components/dashboard/completed-routine-card';
import {cn} from '@/lib/utils';
import type {StudyTask, LogEvent} from '@/lib/types';

export const CompletedTodayWidget = ({
  todaysCompletedTasks,
  todaysCompletedRoutines,
  viewMode,
  activeItem,
  onUpdateTask,
  onArchiveTask,
  onUnarchiveTask,
  onPushTask,
  onEditTask,
}: any) => {
  if (
    todaysCompletedTasks.length === 0 &&
    todaysCompletedRoutines.length === 0
  ) {
    return null;
  }

  const renderTaskList = (tasksToRender: StudyTask[]) => {
    const props = {
      tasks: tasksToRender,
      onUpdate: onUpdateTask,
      onArchive: onArchiveTask,
      onUnarchive: onUnarchiveTask,
      onPushToNextDay: onPushTask,
      onEdit: onEditTask,
      activeItem: activeItem,
    };
    return viewMode === 'card' ? (
      <TaskList {...props} />
    ) : (
      <SimpleTaskList {...props} />
    );
  };

  return (
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
          {todaysCompletedRoutines.map((log: LogEvent) =>
            viewMode === 'card' ? (
              <CardCompletedRoutineItem key={log.id} log={log} />
            ) : (
              <SimpleCompletedRoutineItem key={log.id} log={log} />
            )
          )}
        </div>
      )}
    </section>
  );
};
