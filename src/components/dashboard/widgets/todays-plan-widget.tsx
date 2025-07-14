
'use client';
import React from 'react';
import {SimpleTaskList} from '@/components/tasks/simple-task-list';
import {TaskList} from '@/components/tasks/task-list';
import type {StudyTask} from '@/lib/types';

export const TodaysPlanWidget = ({
  todaysPendingTasks,
  viewMode,
  activeItem,
  onUpdateTask,
  onArchiveTask,
  onUnarchiveTask,
  onPushTask,
  onEditTask,
}: any) => {
  if (todaysPendingTasks.length === 0) {
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
      <h2 className="text-xl font-semibold text-primary mb-3">Today's Plan</h2>
      {renderTaskList(todaysPendingTasks)}
    </section>
  );
};
