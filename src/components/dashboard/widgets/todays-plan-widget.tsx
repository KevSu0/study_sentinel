
'use client';
import React from 'react';
import { format } from 'date-fns';
import { SimpleTaskList } from '@/components/tasks/simple-task-list';
import { TaskList } from '@/components/tasks/task-list';
import type { StudyTask } from '@/lib/types';

export const TodaysPlanWidget = ({ tasks, viewMode, activeItem, onUpdateTask, onArchiveTask, onUnarchiveTask, onPushTask, onEditTask }: any) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const pendingTasks = tasks.filter(
    (t: StudyTask) => t.date === todayStr && (t.status === 'todo' || t.status === 'in_progress')
  );

  if (pendingTasks.length === 0) {
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
    return viewMode === 'card' ? <TaskList {...props} /> : <SimpleTaskList {...props} />;
  };

  return (
    <section>
      <h2 className="text-xl font-semibold text-primary mb-3">Today's Plan</h2>
      {renderTaskList(pendingTasks)}
    </section>
  );
};
