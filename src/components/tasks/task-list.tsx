import {TaskCard} from './task-card';
import type {StudyTask} from '@/lib/types';

interface TaskListProps {
  tasks: StudyTask[];
  onUpdate: (task: StudyTask) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: StudyTask) => void;
}

export function TaskList({tasks, onUpdate, onDelete, onEdit}: TaskListProps) {
  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
