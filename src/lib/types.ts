export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export type StudyTask = {
  id: string;
  title: string;
  time: string; // e.g., "09:00"
  date: string; // e.g., "2024-07-29"
  status: TaskStatus;
  progressDescription?: string;
  analysis?: {
    isOnTrack: boolean;
    analysis: string;
    error?: string;
  };
};
