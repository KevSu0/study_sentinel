import {SimpleTaskItem} from './simple-task-item';
import type {StudyTask} from '@/lib/types';

interface SimpleTaskListProps {
  tasks: StudyTask[];
  onUpdate: (task: StudyTask) => void;
  onArchive: (taskId: string) => void;
  onUnarchive: (taskId: string) => void;
  onPushToNextDay: (taskId: string) => void;
  onEdit: (task: StudyTask) => void;
}

export function SimpleTaskList({
  tasks,
  onUpdate,
  onArchive,
  onUnarchive,
  onPushToNextDay,
  onEdit,
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
        />
      ))}
    </div>
  );
}
