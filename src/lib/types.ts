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

export type BadgeCondition = {
  type:
    | 'TOTAL_STUDY_TIME'
    | 'TASKS_COMPLETED'
    | 'DAY_STREAK'
    | 'ROUTINES_COMPLETED'
    | 'POINTS_EARNED'
    | 'TIME_ON_SUBJECT'
    | 'SINGLE_SESSION_TIME'
    | 'ALL_TASKS_COMPLETED_ON_DAY';
  target: number;
  timeframe: 'TOTAL' | 'DAY' | 'WEEK' | 'MONTH';
  subjectId?: string;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  motivationalMessage: string;
  category: BadgeCategory;
  icon: string;
  color: string;
  isCustom: boolean;
  isEnabled: boolean;
  conditions: BadgeCondition[];
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
  | 'TIMER_OVERTIME_STARTED'
  | 'TIMER_SESSION_COMPLETE'
  | 'TIMER_STOP'
  | 'ROUTINE_SESSION_COMPLETE';

export type LogEvent = {
  id: string;
  timestamp: string; // ISO 8601 format
  type: LogEventType;
  payload: Record<string, any>;
};

export type UserProfile = {
  name: string;
  email: string;
  phone: string;
  passion: string;
  dream: string;
  education: string;
  reasonForUsing: string;
};

export type ActiveTimerItem =
  | {type: 'task'; item: StudyTask}
  | {type: 'routine'; item: Routine};

export type CompletedWork = {
  date: string;
  duration: number; // seconds
  type: 'task' | 'routine';
  title: string;
  points: number;
  priority?: TaskPriority;
  subjectId?: string;
  timestamp: string;
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
