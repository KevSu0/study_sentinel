'use client';

import {TaskCard} from './task-card';
import type {StudyTask} from '@/lib/types';

interface TaskListProps {
  tasks: StudyTask[];
  onUpdate: (task: StudyTask) => void;
  onArchive: (taskId: string) => void;
  onUnarchive: (taskId: string) => void;
  onPushToNextDay: (taskId: string) => void;
  onEdit: (task: StudyTask) => void;
}

export function TaskList({
  tasks,
  onUpdate,
  onArchive,
  onUnarchive,
  onPushToNextDay,
  onEdit,
}: TaskListProps) {
  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onUpdate={onUpdate}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onPushToNextDay={onPushToNextDay}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
