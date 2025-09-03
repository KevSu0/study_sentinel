'use client';

import { PlanItemRenderer } from '@/components/plans/plan-item-renderer';
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
        <PlanItemRenderer
          key={task.id}
          item={{ type: 'task', data: task }}
          variant="task-card"
          onUpdateTask={onUpdate}
          onArchiveTask={onArchive}
          onUnarchiveTask={onUnarchive}
          onPushTaskToNextDay={onPushToNextDay}
          onEditTask={onEdit}
        />
      ))}
    </div>
  );
}
