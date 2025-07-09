import type {LucideIcon} from 'lucide-react';
import {z} from 'zod';

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

export type Routine = {
  id: string;
  title: string;
  description?: string;
  days: number[]; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm
  endTime: string; // HH:mm
};

export type BadgeCategory = 'daily' | 'weekly' | 'monthly' | 'overall';

export type Badge = {
  id: string;
  name: string;
  description: string;
  motivationalMessage: string;
  category: BadgeCategory;
  Icon: LucideIcon;
  checker: (data: {completedTasks: StudyTask[]; logs: LogEvent[]}) => boolean;
};

export type LogEventType =
  | 'TASK_ADD'
  | 'TASK_UPDATE'
  | 'TASK_COMPLETE'
  | 'TASK_IN_PROGRESS'
  | 'TASK_ARCHIVE'
  | 'TASK_UNARCHIVE'
  | 'TASK_PUSH_NEXT_DAY'
  | 'TIMER_START'
  | 'TIMER_PAUSE'
  | 'TIMER_COMPLETE'
  | 'TIMER_STOP'
  | 'ROUTINE_SESSION_COMPLETE';

export type LogEvent = {
  id: string;
  timestamp: string; // ISO 8601 format
  type: LogEventType;
  payload: Record<string, any>;
};

export const PositivePsychologistInputSchema = z.object({
  profile: z.any().optional(),
  dailySummary: z.any().optional(),
  chatHistory: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.string(),
    })
  ),
});
export type PositivePsychologistInput = z.infer<
  typeof PositivePsychologistInputSchema
>;

export const PositivePsychologistOutputSchema = z.object({
  response: z.string(),
});
export type PositivePsychologistOutput = z.infer<
  typeof PositivePsychologistOutputSchema
>;
