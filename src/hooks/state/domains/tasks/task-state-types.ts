export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';
export type TimerType = 'countdown' | 'infinity';

export type StudyTask = {
  id: string;
  title: string;
  date: string;
  time: string;
  duration?: number;
  points?: number;
  priority?: 'low' | 'medium' | 'high';
  status: TaskStatus;
  timerType: TimerType;
};

export type TaskState = {
  tasks: StudyTask[];
};

