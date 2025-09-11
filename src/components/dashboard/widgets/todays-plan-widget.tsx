import React from 'react';
import type { StudyTask } from '@/lib/types';
import { SimpleTaskList } from '@/components/tasks/simple-task-list';

interface TodaysPlanWidgetProps {
  tasks: StudyTask[];
  onUpdate: (task: StudyTask) => void;
  onArchive: (taskId: string) => void;
  onUnarchive: (taskId: string) => void;
  onPushToNextDay: (taskId: string) => void;
  onEdit: (task: StudyTask) => void;
}

export const TodaysPlanWidget = ({
  tasks,
  onUpdate,
  onArchive,
  onUnarchive,
  onPushToNextDay,
  onEdit,
}: TodaysPlanWidgetProps) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No tasks planned for today.
      </div>
    );
  }

  return (
    <SimpleTaskList
      tasks={tasks}
      onUpdate={onUpdate}
      onArchive={onArchive}
      onUnarchive={onUnarchive}
      onPushToNextDay={onPushToNextDay}
      onEdit={onEdit}
    />
  );
};