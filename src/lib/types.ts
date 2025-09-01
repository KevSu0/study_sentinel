
import {z} from 'zod';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskTimerType = 'countdown' | 'infinity';

export type StudyTask = {
  id: string;
  shortId: string;
  title: string;
  description?: string;
  time: string; // e.g., "09:00"
  date: string; // e.g., "2024-07-29"
  duration?: number; // in minutes, optional for infinity timer
  points: number;
  status: TaskStatus;
  priority: TaskPriority;
  timerType: TaskTimerType;
};

export type Routine = {
  id: string;
  shortId: string;
  title: string;
  description?: string;
  days: number[]; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  priority: TaskPriority;
  status: 'todo' | 'completed';
  createdAt: number;
};

export type BadgeCategory = 'daily' | 'weekly' | 'monthly' | 'overall';

export type BadgeConditionType =
  | 'TOTAL_STUDY_TIME'
  | 'TASKS_COMPLETED'
  | 'DAY_STREAK'
  | 'ROUTINES_COMPLETED'
  | 'POINTS_EARNED'
  | 'TIME_ON_SUBJECT'
  | 'SINGLE_SESSION_TIME'
  | 'ALL_TASKS_COMPLETED_ON_DAY';

export type BadgeCondition = {
  type: BadgeConditionType;
  target: number;
  timeframe: 'TOTAL' | 'DAY' | 'WEEK' | 'MONTH';
  subjectId?: string;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  isCustom: boolean;
  isEnabled: boolean;
  requiredCount: number; // Legacy, may be deprecated
  conditions: BadgeCondition[];
  motivationalMessage?: string;
  color?: string;
};

export type LogEventType =
  | 'TASK_ADD'
  | 'TASK_UPDATE'
  | 'TASK_COMPLETE'
  | 'TASK_RETRY'
  | 'TASK_IN_PROGRESS'
  | 'TASK_ARCHIVE'
  | 'TASK_UNARCHIVE'
  | 'TASK_PUSH_NEXT_DAY'
  | 'TIMER_START'
  | 'TIMER_PAUSE'
  | 'TIMER_MILESTONE'
  | 'TIMER_OVERTIME_STARTED'
  | 'TIMER_SESSION_COMPLETE'
  | 'TIMER_STOP'
  | 'ROUTINE_SESSION_COMPLETE'
  | 'ROUTINE_RETRY';

export type LogEvent = {
  id: string;
  timestamp: string; // ISO 8601 format
  type: LogEventType;
  payload: Record<string, any>;
  isUndone?: boolean;
};

export type UserProfile = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  passion?: string;
  dream?: string;
  education?: string;
  reasonForUsing?: string;
  dailyStudyGoal?: number; // in hours
  idealStartTime?: string; // HH:mm
  idealEndTime?: string; // HH:mm
  achievementDate?: string; // YYYY-MM-DD
  showCountdown?: boolean;
  earnedBadges?: Record<string, { earnedOn: string; lastNotified: string }>;
  // Optional fields expected by some tests
  avatar?: string;
  joinedAt?: number;
  level?: number;
  studyStreak?: number;
  totalPoints?: number;
};

export type SoundSettings = {
    alarm: string; // e.g., 'alarm_clock'
    tick: string; // e.g., 'tick_tock'
    notificationInterval: number; // in minutes, 0 to disable
}

export type ActiveTimerItem =
  | {type: 'task'; item: StudyTask}
  | {type: 'routine'; item: Routine};

export type CompletedWork = {
  date: string;
  duration: number; // seconds
  pausedDuration?: number; // seconds
  type: 'task' | 'routine';
  title: string;
  points: number;
  priority?: TaskPriority;
  subjectId?: string;
  timestamp: string;
  isUndone?: boolean;
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
  upcomingTasks: z.array(z.any()).optional(),
  weeklyStats: z.any().optional(),
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


export const DailySummaryInputSchema = z.object({
  profile: z.object({
    name: z.string(),
    dream: z.string(),
  }),
  tasks: z.array(z.any()),
  routines: z.array(z.any()),
  logs: z.array(z.any()),
});
export type DailySummaryInput = z.infer<typeof DailySummaryInputSchema>;

export const DailySummaryOutputSchema = z.object({
  evaluation: z.string(),
  motivationalParagraph: z.string(),
});
export type DailySummaryOutput = z.infer<typeof DailySummaryOutputSchema>;

export type CalendarEventType = 'study_block' | 'personal_event' | 'milestone';

export interface BaseCalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  date: string; // YYYY-MM-DD
}

export interface StudyBlock extends BaseCalendarEvent {
  type: 'study_block';
  notes?: string;
  materials?: string; // URL or text note
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isCompleted?: boolean;
}

export interface PersonalEvent extends BaseCalendarEvent {
  type: 'personal_event';
  notes?: string;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isCompleted?: boolean;
}

export interface Milestone extends BaseCalendarEvent {
  type: 'milestone';
}

export type CalendarEvent = StudyBlock | PersonalEvent | Milestone;
