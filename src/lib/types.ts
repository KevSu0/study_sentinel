import type {LucideIcon} from 'lucide-react';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high';

export type StudyTask = {
  id: string;
  title: string;
  description?: string;
  time: string; // e.g., "09:00"
  date: string; // e.g., "2024-07-29"
  duration: number; // in minutes
  points: number;
  status: TaskStatus;
  priority: TaskPriority;
};

export type BadgeCategory = 'daily' | 'weekly' | 'monthly' | 'overall';

export type Badge = {
  id: string;
  name: string;
  description: string;
  motivationalMessage: string;
  category: BadgeCategory;
  Icon: LucideIcon;
  checker: (completedTasks: StudyTask[]) => boolean;
};
