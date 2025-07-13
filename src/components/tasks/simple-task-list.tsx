
import {SimpleTaskItem} from './simple-task-item';
import type {StudyTask} from '@/lib/types';
import { useTasks } from '@/hooks/use-tasks.tsx';

interface SimpleTaskListProps {
  tasks: StudyTask[];
  onUpdate: (task: StudyTask) => void;
  onArchive: (taskId: string) => void;
  onUnarchive: (taskId: string) => void;
  onPushToNextDay: (taskId: string) => void;
  onEdit: (task: StudyTask) => void;
  activeItem: ReturnType<typeof useTasks>['activeItem'];
}

export function SimpleTaskList({
  tasks,
  onUpdate,
  onArchive,
  onUnarchive,
  onPushToNextDay,
  onEdit,
  activeItem,
}: SimpleTaskListProps) {
  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <SimpleTaskItem
          key={task.id}
          task={task}
          onUpdate={onUpdate}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onPushToNextDay={onPushToNextDay}
          onEdit={onEdit}
          activeItem={activeItem}
        />
      ))}
    </div>
  );
}
