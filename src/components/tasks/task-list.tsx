
import {TaskCard} from './task-card';
import type {StudyTask} from '@/lib/types';
import { useTasks } from '@/hooks/use-tasks.tsx';

interface TaskListProps {
  tasks: StudyTask[];
  onUpdate: (task: StudyTask) => void;
  onArchive: (taskId: string) => void;
  onUnarchive: (taskId: string) => void;
  onPushToNextDay: (taskId: string) => void;
  onEdit: (task: StudyTask) => void;
  activeItem: ReturnType<typeof useTasks>['activeItem'];
}

export function TaskList({
  tasks,
  onUpdate,
  onArchive,
  onUnarchive,
  onPushToNextDay,
  onEdit,
  activeItem,
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
          activeItem={activeItem}
        />
      ))}
    </div>
  );
}
