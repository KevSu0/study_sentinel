// Shared type definitions for modular state architecture
// Based on the original use-global-state.tsx types

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';
export type TimerType = 'countdown' | 'infinity';

// Core domain interfaces
export interface StudyTask {
  id: string;
  shortId: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration?: number;
  timerType: TimerType;
  priority: TaskPriority;
  status: TaskStatus;
  points: number;
}

export interface Routine {
  id: string;
  shortId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  days: number[];
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  totalPoints: number;
  streak: number;
  joinDate: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  isEnabled: boolean;
  isCustom: boolean;
  condition: {
    type: string;
    target: number;
    timeframe?: string;
  };
}

export interface SoundSettings {
  tick: string;
  alarm: string;
  notificationInterval: number;
  enabled: boolean;
  volume: number;
  notificationSound: string;
  backgroundMusic: boolean;
  backgroundMusicVolume: number;
}

export interface LogEvent {
  id: string;
  timestamp: string;
  type: string;
  payload: any;
  isUndone?: boolean;
}

export interface CompletedWork {
  date: string;
  duration: number;
  pausedDuration: number;
  type: 'task' | 'routine';
  title: string;
  points: number;
  pointsEarned: number;
  priority: TaskPriority;
  subjectId?: string;
  timestamp: number;
  isUndone?: boolean;
}

export interface ActivityFeedItem {
  type: string;
  data: any;
  timestamp: string;
}

// Timer-related types
export interface ActiveTimerItem {
  id: string;
  type: 'task' | 'routine';
  startTime: Date;
  duration: number;
  isPaused: boolean;
  pausedTime: number;
  totalPausedDuration: number;
}

export interface StoredTimer {
  item: ActiveTimerItem;
  startTime: number;
  endTime?: number;
  isPaused: boolean;
  pausedTime: number;
  pausedDuration: number;
  pauseCount: number;
  milestones: Record<string, boolean>;
  starCount: number;
}

// Domain state interfaces
export interface TasksState {
  tasks: StudyTask[];
  items: Map<string, StudyTask>; // Legacy compatibility
  activeTimer: ActiveTimerItem | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface RoutinesState {
  routines: Routine[];
  items: Map<string, Routine>; // Legacy compatibility
  activeTimer: ActiveTimerItem | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ProfileState {
  profile: UserProfile;
  data: UserProfile; // Legacy compatibility
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface BadgesState {
  allBadges: Badge[];
  available: Map<string, Badge>; // Legacy compatibility
  custom: Map<string, Badge>; // Legacy compatibility
  earned: Map<string, string>; // Legacy compatibility
  earnedBadges: Map<string, string>;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SettingsState {
  soundSettings: SoundSettings;
  sound: SoundSettings; // Legacy compatibility
  isMuted: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ActivityState {
  logs: LogEvent[];
  todaysLogs: LogEvent[];
  allCompletedWork: (CompletedWork & { id: string })[];
  todaysCompletedWork: (CompletedWork & { id: string })[];
  todaysPoints: number;
  todaysBadges: Badge[];
  todaysActivity: ActivityFeedItem[];
  isLoaded: boolean;
}

export interface TimerState {
  activeItem: ActiveTimerItem | null;
  isPaused: boolean;
  isOvertime: boolean;
  timeDisplay: string;
  timerProgress: number | null;
  starCount: number;
  showStarAnimation: boolean;
  isLoaded: boolean;
}

// UI state interfaces
export interface UIState {
  quickStartOpen: boolean;
  routineLogDialog: {
    isOpen: boolean;
    action: 'complete' | 'stop' | null;
  };
  modals: {
    quickStart: {
      isOpen: boolean;
      data: any;
    };
    routineLog: {
      isOpen: boolean;
      data: any;
    };
    taskEdit: {
      isOpen: boolean;
      data: any;
    };
    routineEdit: {
      isOpen: boolean;
      data: any;
    };
    badgeEdit: {
      isOpen: boolean;
      data: any;
    };
    settings: {
      isOpen: boolean;
    };
  };
  activeView: string;
  sidebarOpen: boolean;
  notifications: any[];
}

// Combined app state
export interface AppState {
  // Domain states
  tasks: TasksState;
  routines: RoutinesState;
  profile: ProfileState;
  badges: BadgesState;
  settings: SettingsState;
  activity: ActivityState;
  timer: TimerState;
  ui: UIState;
  
  // Legacy compatibility
  logs: {
    items: Map<string, LogEvent>;
    isLoading: boolean;
    error: string | null;
  };
  sessions: {
    items: Map<string, any>;
    current: any;
    isLoading: boolean;
    error: string | null;
  };
  
  // Global loading state
  isLoaded: boolean;
}

// Action types for state updates
export type StateAction = 
  | { type: 'SET_LOADING'; domain: string; payload: boolean }
  | { type: 'SET_ERROR'; domain: string; payload: string | null }
  | { type: 'CLEAR_ERROR'; domain: string }
  | { type: 'UPDATE_TASKS'; payload: Partial<TasksState> }
  | { type: 'UPDATE_ROUTINES'; payload: Partial<RoutinesState> }
  | { type: 'UPDATE_PROFILE'; payload: Partial<ProfileState> }
  | { type: 'UPDATE_BADGES'; payload: Partial<BadgesState> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<SettingsState> }
  | { type: 'UPDATE_ACTIVITY'; payload: Partial<ActivityState> }
  | { type: 'UPDATE_TIMER'; payload: Partial<TimerState> }
  | { type: 'UPDATE_UI'; payload: Partial<UIState> }
  | { type: 'ADD_NOTIFICATION'; payload: any }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'OPEN_MODAL'; payload: { modalName: string; data: any } }
  | { type: 'CLOSE_MODAL'; payload: string }
  | { type: 'TOGGLE_SIDEBAR'; payload: boolean }
  | { type: 'SET_ACTIVE_VIEW'; payload: string }
  | { type: 'UPDATE_LOG'; payload: { id: string; updates: Partial<LogEvent> } }
  | { type: 'REMOVE_LOG'; payload: string }
  | { type: 'UPDATE_SOUND_SETTINGS'; payload: Partial<SoundSettings> }
  | { type: 'AWARD_BADGE'; payload: { badgeId: string; reason: string } }
  | { type: 'RESET_STATE' }
  | { type: 'HYDRATE_STATE'; payload: Partial<AppState> };

// Repository interfaces
export interface IRepository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  add(item: T): Promise<void>;
  update(id: string, updates: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
}

// Persistence layer types
export interface PersistenceConfig {
  key: string;
  version: number;
  serialize?: (data: any) => string;
  deserialize?: (data: string) => any;
}

export interface StatePersistence {
  save<T>(key: string, data: T): void;
  load<T>(key: string, defaultValue: T): T;
  remove(key: string): void;
  clear(): void;
}

// Manual log form data
export interface ManualLogFormData {
  logDate: string;
  startTime: string;
  endTime: string;
  productiveDuration: number;
  breaks: number;
  notes?: string;
}

// Domain event types
export type DomainEvent = 
  | { type: 'TASK_ADDED'; payload: { task: StudyTask } }
  | { type: 'TASK_UPDATED'; payload: { task: StudyTask } }
  | { type: 'TASK_DELETED'; payload: { taskId: string } }
  | { type: 'ROUTINE_ADDED'; payload: { routine: Routine } }
  | { type: 'ROUTINE_UPDATED'; payload: { routine: Routine } }
  | { type: 'ROUTINE_DELETED'; payload: { routineId: string } }
  | { type: 'TIMER_STARTED'; payload: { item: ActiveTimerItem } }
  | { type: 'TIMER_STOPPED'; payload: { reason: string } }
  | { type: 'TIMER_COMPLETED'; payload: { item: ActiveTimerItem } }
  | { type: 'BADGE_EARNED'; payload: { badge: Badge } }
  | { type: 'PROFILE_UPDATED'; payload: { profile: UserProfile } }
  | { type: 'SETTINGS_UPDATED'; payload: { settings: Partial<SoundSettings> } };