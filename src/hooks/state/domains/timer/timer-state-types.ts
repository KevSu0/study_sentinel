export type ActiveTimerItem = { type: 'task' | 'routine'; id: string; title: string; duration?: number };

export type TimerState = {
  activeItem: ActiveTimerItem | null;
  isPaused: boolean;
  timeDisplay: string;
  timerProgress: number | null;
};

