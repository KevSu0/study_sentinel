'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  type StudyTask,
  type Routine,
  type LogEvent,
  type UserProfile,
  type Badge,
  type ActiveTimerItem,
  type CompletedWork,
  type TaskStatus,
  type TaskPriority,
  type SoundSettings,
} from '@/lib/types';
import {addDays, format, formatISO, subDays, parseISO, set, parse} from 'date-fns';
import {useConfetti} from '@/components/providers/confetti-provider';
import toast from 'react-hot-toast';
import {SYSTEM_BADGES, checkBadge} from '@/lib/badges';
import { getSessionDate, getStudyDateForTimestamp, getStudyDay, generateShortId } from '@/lib/utils';
import { motivationalQuotes, getRandomMotivationalMessage } from '@/lib/motivation';
import { taskRepository, profileRepository, routineRepository, logRepository, badgeRepository, sessionRepository, BaseRepository } from '@/lib/repositories';
import { SyncEngine } from '@/lib/sync';

// --- SyncEngine and Storage Abstractions for Testing ---
type SyncEngineLike = { start?: () => void; stop?: () => void };
type SyncEngineFactory = (onComplete: () => void) => SyncEngineLike;

interface IRepository<T, TKey extends string | number = string> {
    getAll(): Promise<T[]>;
    getById(id: TKey): Promise<T | null | undefined>;
    add(item: T): Promise<TKey | undefined>;
    update(id: TKey, item: Partial<T>): Promise<number>;
    delete(id: TKey): Promise<void>;
}

interface ILogRepository extends IRepository<LogEvent> {
    getLogsByDate(date: string): Promise<LogEvent[]>;
}

class MemoryStorage<T extends { id?: string }> implements IRepository<T> {
  protected store = new Map<string, T>();

  constructor(initialItems: T[] = []) {
    initialItems.forEach(item => {
      if (item.id) this.store.set(item.id, item);
    });
  }

  async getAll() { return Array.from(this.store.values()); }
  async getById(id: string) { return this.store.get(id) || null; }
  async add(item: T) {
    if (!item.id) item.id = crypto.randomUUID();
    this.store.set(item.id, item);
    return item.id;
  }
  async update(id: string, item: Partial<T>) {
    const existing = this.store.get(id);
    if (existing) {
      this.store.set(id, { ...existing, ...item } as T);
      return 1;
    }
    return 0;
  }
  async delete(id: string) { this.store.delete(id); }
}

class MemoryLogStorage extends MemoryStorage<LogEvent> implements ILogRepository {
    async getLogsByDate(date: string): Promise<LogEvent[]> {
        return Array.from(this.store.values()).filter((i: any) => i.timestamp.startsWith(date));
    }
}

const isTest = process.env.NODE_ENV === 'test';

const taskRepo: IRepository<StudyTask> = isTest ? new MemoryStorage<StudyTask>() : taskRepository;
const profileRepo: IRepository<UserProfile> = isTest ? new MemoryStorage<UserProfile>() : profileRepository;
const routineRepo: IRepository<Routine> = isTest ? new MemoryStorage<Routine>() : routineRepository;
const logRepo: ILogRepository = isTest ? new MemoryLogStorage() : logRepository;
const badgeRepo: IRepository<Badge> = isTest ? new MemoryStorage<Badge>(SYSTEM_BADGES.map(b => ({...b, id: b.name.toLowerCase().replace(/ /g, '-'), isCustom: false, isEnabled: true})) as Badge[]) : badgeRepository;
const sessionRepo: IRepository<CompletedWork & { id: string }> = isTest ? new MemoryStorage<CompletedWork & { id: string }>() : sessionRepository as any;


// --- Constants for localStorage keys ---
const TIMER_KEY = 'studySentinelActiveTimer_v3';
const EARNED_BADGES_KEY = 'studySentinelEarnedBadges_v3';
const CUSTOM_BADGES_KEY = 'studySentinelCustomBadges_v3';
const SYSTEM_BADGES_CONFIG_KEY = 'studySentinelSystemBadgesConfig_v3';
const SOUND_SETTINGS_KEY = 'studySentinelSoundSettings_v1';
const LOG_PREFIX = 'studySentinelLogs_v3_';

// --- Type Definitions ---
type StoredTimer = {
  item: ActiveTimerItem;
  endTime?: number;
  startTime: number; // The timestamp when the timer was last (re)started
  isPaused: boolean;
  pausedTime: number; // The remaining time when a countdown is paused
  pausedDuration: number; // The total accumulated duration while paused
  pauseCount: number; // The number of times the timer was paused
  milestones: Record<string, boolean>;
  starCount?: number;
};

export type ActivityFeedItem = {
  type: 'TASK_COMPLETE' | 'ROUTINE_COMPLETE' | 'TASK_STOPPED' | 'TIMER_STOP';
  data: any;
  timestamp: string;
};

type RoutineLogDialogState = {
  isOpen: boolean;
  action: 'complete' | 'stop' | null;
};

const soundFiles: Record<string, string> = {
    alarm_clock: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
    digital_alarm: 'https://actions.google.com/sounds/v1/alarms/digital_alarm.ogg',
    bell: 'https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg',
    tick_tock: 'https://actions.google.com/sounds/v1/alarms/tick_tock_clock.ogg',
    digital_tick: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    none: ''
};

interface AppState {
  isLoaded: boolean;
  tasks: StudyTask[];
  logs: LogEvent[];
  profile: UserProfile;
  routines: Routine[];
  allBadges: Badge[];
  earnedBadges: Map<string, string>;
  soundSettings: SoundSettings;
  activeItem: ActiveTimerItem | null;
  timeDisplay: string;
  isPaused: boolean;
  isOvertime: boolean;
  isMuted: boolean;
  timerProgress: number | null; // null for routine, 0-100 for task
  currentQuote: string;
  routineLogDialog: RoutineLogDialogState;
  todaysLogs: LogEvent[];
  previousDayLogs: LogEvent[];
  allCompletedWork: CompletedWork[];
  todaysCompletedWork: CompletedWork[];
  todaysPoints: number;
  todaysBadges: Badge[];
  starCount: number;
  showStarAnimation: boolean;
  todaysActivity: ActivityFeedItem[];
  quickStartOpen: boolean;
}

interface ManualLogFormData {
  logDate: string;
  startTime: string;
  endTime: string;
  productiveDuration: number;
  breaks: number;
  notes?: string;
}

interface GlobalStateContextType {
  state: AppState & {todaysActivity: ActivityFeedItem[]};
  addTask: (task: Omit<StudyTask, 'id' | 'status' | 'shortId'> & { id?: string }) => Promise<void>;
  updateTask: (updatedTask: StudyTask, isManualCompletion?: boolean) => void;
  archiveTask: (taskId: string) => void;
  unarchiveTask: (taskId: string) => void;
  pushTaskToNextDay: (taskId: string) => void;
  startTimer: (item: StudyTask | Routine) => void;
  togglePause: () => void;
  completeTimer: (studyLog?: string) => void;
  stopTimer: (reason: string, studyLog?: string) => void;
  manuallyCompleteItem: (item: StudyTask | Routine, data: ManualLogFormData) => void;
  addRoutine: (routine: Omit<Routine, 'id' | 'shortId' | 'status' | 'createdAt'> & Partial<Pick<Routine, 'id'>>) => string;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (routineId: string) => void;
  addBadge: (badge: Omit<Badge, 'id'>) => Promise<void>;
  updateBadge: (badge: Badge) => void;
  deleteBadge: (badgeId: string) => Promise<void>;
  updateProfile: (newProfileData: Partial<UserProfile>) => void;
  openRoutineLogDialog: (action: 'complete' | 'stop') => void;
  closeRoutineLogDialog: () => void;
  setSoundSettings: (newSettings: Partial<SoundSettings>) => void;
  toggleMute: () => void;
  addLog: (type: LogEvent['type'], payload: LogEvent['payload']) => void;
  removeLog: (logId: string) => void;
  updateLog: (logId: string, updatedLog: Partial<LogEvent>) => void;
  openQuickStart: () => void;
  closeQuickStart: () => void;
}

const defaultProfile: UserProfile = {
  name: '', email: '', phone: '', passion: '', dream: '', education: '', reasonForUsing: '', dailyStudyGoal: 8,
};

const defaultSoundSettings: SoundSettings = {
    alarm: 'alarm_clock',
    tick: 'none',
    notificationInterval: 15
}

const initialAppState: AppState = {
  isLoaded: false,
  tasks: [],
  logs: [],
  profile: defaultProfile,
  routines: [],
  allBadges: [],
  earnedBadges: new Map(),
  soundSettings: defaultSoundSettings,
  activeItem: null,
  timeDisplay: '00:00',
  isPaused: true,
  isOvertime: false,
  isMuted: false,
  timerProgress: null,
  currentQuote: motivationalQuotes[0],
  routineLogDialog: {isOpen: false, action: null},
  todaysLogs: [],
  previousDayLogs: [],
  allCompletedWork: [],
  todaysCompletedWork: [],
  todaysPoints: 0,
  todaysBadges: [],
  starCount: 0,
  showStarAnimation: false,
  todaysActivity: [],
  quickStartOpen: false,
};

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(
  undefined
);

const formatTime = (seconds: number) => {
  const absSeconds = Math.abs(seconds);
  const hours = Math.floor(absSeconds / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;
  const parts = [];
  if (hours > 0) parts.push(String(hours).padStart(2, '0'));
  parts.push(String(mins).padStart(2, '0'));
  parts.push(String(secs).padStart(2, '0'));
  return parts.join(':');
};

type GlobalStateProviderProps = {
  children: ReactNode;
  disableSync?: boolean;
  syncEngineFactory?: SyncEngineFactory;
};

export function GlobalStateProvider(props: GlobalStateProviderProps) {
  const { children } = props;
  const [state, setState] = useState<AppState>(initialAppState);
  const {fire} = useConfetti();
  const audioRef = useRef<Record<string, HTMLAudioElement>>({});
  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncEngineRef = useRef<SyncEngineLike | null>(null);

  const loadInitialData = useCallback(async () => {
    const [
      savedTasks,
      savedProfile,
      savedRoutines,
      todaysLogs,
      previousDayLogs,
      allBadges,
    ] = await Promise.all([
      taskRepo.getAll(),
      profileRepo.getById('user-profile'),
      routineRepo.getAll(),
      logRepo.getLogsByDate(format(getSessionDate(), 'yyyy-MM-dd')),
      logRepo.getLogsByDate(format(subDays(getSessionDate(), 1), 'yyyy-MM-dd')),
      badgeRepo.getAll(),
    ]);

    const userProfile = savedProfile || defaultProfile;

      // Other state from localStorage
      let savedEarnedBadges = new Map<string, string>(), savedSoundSettings = defaultSoundSettings;
      let savedTimer: StoredTimer | null = null;
      
      try {
        const earnedBadgesFromStorage = localStorage.getItem(EARNED_BADGES_KEY); if (earnedBadgesFromStorage) savedEarnedBadges = new Map(JSON.parse(earnedBadgesFromStorage));
        const timerFromStorage = localStorage.getItem(TIMER_KEY); if (timerFromStorage) savedTimer = JSON.parse(timerFromStorage);
        const soundSettingsFromStorage = localStorage.getItem(SOUND_SETTINGS_KEY); if(soundSettingsFromStorage) savedSoundSettings = JSON.parse(soundSettingsFromStorage);
      } catch (error) {
        console.error('Failed to load state from localStorage', error);
        [EARNED_BADGES_KEY, TIMER_KEY, SOUND_SETTINGS_KEY].forEach(k => localStorage.removeItem(k));
      }
      
      const baseState = { tasks: savedTasks, routines: savedRoutines, profile: userProfile, logs: todaysLogs, allBadges, earnedBadges: savedEarnedBadges, soundSettings: savedSoundSettings };
      
    setState({ ...initialAppState, ...baseState, isLoaded: true, previousDayLogs, activeItem: savedTimer?.item || null, isPaused: savedTimer?.isPaused ?? true, starCount: savedTimer?.starCount || 0 });
  }, []);

  useEffect(() => {
    loadInitialData().catch(console.error);

    if (typeof window !== 'undefined') {
        Object.keys(soundFiles).forEach(key => {
            const src = soundFiles[key];
            if (src) {
                audioRef.current[key] = new Audio(src);
            }
        });
    }

    const handleSyncComplete = () => {
      console.log('Sync complete, refetching data...');
      loadInitialData();
    };

    const createEngine: SyncEngineFactory =
      props.syncEngineFactory ??
      ((onComplete) => {
        try {
          // This will fail in test env, which is what we want.
          return new SyncEngine(onComplete) as SyncEngineLike;
        } catch (e) {
          console.warn('SyncEngine creation failed. Running in offline mode.', e);
          // Return a mock/empty object if SyncEngine cannot be instantiated
          return { start: () => {}, stop: () => {} };
        }
      });

    if (!syncEngineRef.current) {
      syncEngineRef.current = createEngine(handleSyncComplete);
      if (!props.disableSync) {
        syncEngineRef.current.start?.();
      }
    }

    return () => {
      if (syncEngineRef.current) {
        syncEngineRef.current.stop?.();
        syncEngineRef.current = null;
      }
    };
  }, [loadInitialData, props.disableSync, props.syncEngineFactory]);

  const playSound = useCallback((soundKey: string, duration?: number) => {
    if (state.isMuted || !soundKey || soundKey === 'none') return;
    const audio = audioRef.current[soundKey];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(console.error);
      if(duration) {
        setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
        }, duration * 1000)
      }
    }
  }, [state.isMuted]);

  const stopSound = useCallback((soundKey: string) => {
    if (!soundKey || soundKey === 'none') return;
    const audio = audioRef.current[soundKey];
    if (audio && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const showNewQuote = useCallback(() => {
    const newQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setState(prev => ({...prev, currentQuote: newQuote}));
    return newQuote;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
        if (!state.activeItem || state.isPaused) {
            stopSound(state.soundSettings.tick);
            return;
        };

        const savedTimerJSON = localStorage.getItem(TIMER_KEY);
        if (!savedTimerJSON) return;
        const savedTimer: StoredTimer = JSON.parse(savedTimerJSON);
        if (savedTimer.isPaused) return;

        playSound(state.soundSettings.tick);

        let newDisplay: string;
        let newOvertime = false;
        let newProgress: number | null = null;
        let elapsed = 0;

        const now = Date.now();
        elapsed = Math.round((now - savedTimer.startTime + savedTimer.pausedDuration) / 1000);

        if (savedTimer.item.type === 'task' && savedTimer.item.item.timerType === 'countdown') {
            if (!savedTimer.endTime) return;
            const remaining = Math.round((savedTimer.endTime - now) / 1000);
            newDisplay = formatTime(remaining);
            newOvertime = remaining < 0;
            const totalDuration = (savedTimer.item.item.duration || 0) * 60;
            newProgress = totalDuration > 0 ? Math.min(100, (1 - (remaining / totalDuration)) * 100) : 0;
        } else {
            newDisplay = formatTime(elapsed);
            newProgress = null;
        }
        
        // --- Milestone Notifications & Rewards ---
        const milestones = {
          notification: state.soundSettings.notificationInterval * 60,
          quote: 30 * 60,
          star: 30 * 60,
        };

        if (milestones.notification > 0) {
            const notificationMilestoneKey = `notify_${Math.floor(elapsed / milestones.notification)}`;
            if (elapsed > 0 && elapsed % milestones.notification < 1 && !savedTimer.milestones[notificationMilestoneKey]) {
                playSound(state.soundSettings.alarm, 2);
                toast.success(getRandomMotivationalMessage(), {
                    duration: 10000,
                });
                savedTimer.milestones[notificationMilestoneKey] = true;
            }
        }
        
        const quoteMilestoneKey = `quote_${Math.floor(elapsed / milestones.quote)}`;
        if (elapsed > 0 && elapsed % milestones.quote < 1 && !savedTimer.milestones[quoteMilestoneKey]) {
            showNewQuote();
            savedTimer.milestones[quoteMilestoneKey] = true;
        }

        const starMilestoneKey = `star_${Math.floor(elapsed / milestones.star)}`;
        if (elapsed > 0 && elapsed % milestones.star < 1 && !savedTimer.milestones[starMilestoneKey]) {
            savedTimer.starCount = (savedTimer.starCount || 0) + 1;
            setState(prev => ({...prev, starCount: savedTimer.starCount || 0, showStarAnimation: true}));
            toast.success(getRandomMotivationalMessage());
            setTimeout(() => setState(prev => ({...prev, showStarAnimation: false})), 2000);
            savedTimer.milestones[starMilestoneKey] = true;
        }

        localStorage.setItem(TIMER_KEY, JSON.stringify(savedTimer));
        setState(prev => ({...prev, timeDisplay: newDisplay, isOvertime: newOvertime, timerProgress: newProgress }));
    }, 1000);
    return () => clearInterval(interval);
  }, [state.activeItem, state.isPaused, state.soundSettings, playSound, stopSound, showNewQuote]);

  // --- Badge Awarding Effect ---
  useEffect(() => {
    if (!state.isLoaded) return;

    const {allBadges, earnedBadges, tasks, allCompletedWork} = state;

    const newlyEarnedBadges: Badge[] = [];
    for (const badge of allBadges) {
      if (!earnedBadges.has(badge.id) && badge.isEnabled) {
        if (checkBadge(badge, {tasks, logs: allCompletedWork as any})) {
          newlyEarnedBadges.push(badge);
        }
      }
    }

    if (newlyEarnedBadges.length > 0) {
      fire();
      setStateAndDerive(prev => {
        const newEarnedMap = new Map(prev.earnedBadges);
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        newlyEarnedBadges.forEach(badge => {
          newEarnedMap.set(badge.id, todayStr);
          setTimeout(() => {
            toast.success(`Badge Unlocked: ${badge.name}! 🎉`);
          }, 500);
        });
        localStorage.setItem(
          EARNED_BADGES_KEY,
          JSON.stringify(Array.from(newEarnedMap.entries()))
        );
        return {earnedBadges: newEarnedMap};
      });
    }
  }, [state.isLoaded, state.allCompletedWork, state.tasks, fire]);

  const todaysLogs = useMemo(() => state.logs, [state.logs]);

  const allCompletedWork = useMemo(() => {
    const allTimeLogs = [...state.logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sessionLogs = allTimeLogs.filter(l => l.type === 'ROUTINE_SESSION_COMPLETE' || l.type === 'TIMER_SESSION_COMPLETE');
    const workItems: (CompletedWork & { id: string })[] = sessionLogs.map(l => ({
        id: l.timestamp, // Use timestamp as a unique ID for CompletedWork
        date: format(getStudyDateForTimestamp(l.timestamp), 'yyyy-MM-dd'),
        duration: l.payload.duration,
        pausedDuration: l.payload.pausedDuration,
        type: l.type === 'ROUTINE_SESSION_COMPLETE' ? 'routine' : 'task',
        title: l.payload.title,
        points: l.payload.points || 0,
        priority: l.payload.priority,
        subjectId: l.payload.routineId || l.payload.taskId,
        timestamp: l.timestamp,
        isUndone: l.isUndone
    }));
    workItems.forEach(item => {
        if (item.subjectId) {
            sessionRepo.update(item.subjectId, item);
        }
    });
    return workItems;
  }, [state.logs]);

  const todaysCompletedWork = useMemo(() => {
    const todayStr = format(getSessionDate(), 'yyyy-MM-dd');
    return allCompletedWork.filter(w => w.date === todayStr);
  }, [allCompletedWork]);

  const todaysPoints = useMemo(() => {
    return todaysCompletedWork.reduce((sum, work) => sum + work.points, 0);
  }, [todaysCompletedWork]);

  const todaysBadges = useMemo(() => {
    const todayStr = format(getSessionDate(), 'yyyy-MM-dd');
    return state.allBadges.filter(b => state.earnedBadges.get(b.id) === todayStr);
  }, [state.allBadges, state.earnedBadges]);

  const todaysActivity = useMemo(() => {
    const activity: ActivityFeedItem[] = [];
    const activityLogs = todaysLogs.filter(log =>
        log.type === 'TIMER_SESSION_COMPLETE' ||
        log.type === 'ROUTINE_SESSION_COMPLETE' ||
        log.type === 'TASK_COMPLETE' ||
        log.type === 'TIMER_STOP'
    ).sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

    for (const log of activityLogs) {
        if (log.type === 'TIMER_SESSION_COMPLETE') {
            const task = state.tasks.find(t => t.id === log.payload.taskId);
            if (task) activity.push({ type: 'TASK_COMPLETE', data: { task, log }, timestamp: log.timestamp });
        } else if (log.type === 'TASK_COMPLETE') { // Manual completion
            const task = state.tasks.find(t => t.id === log.payload.taskId);
            if (task) {
                const fakeSessionLog = { id: log.id, payload: { duration: (task.duration || 0) * 60, points: task.points, pauseCount: 0, pausedDuration: 0 } };
                activity.push({ type: 'TASK_COMPLETE', data: { task, log: fakeSessionLog }, timestamp: log.timestamp });
            }
        } else if (log.type === 'ROUTINE_SESSION_COMPLETE') {
            const routine = state.routines.find(r => r.id === log.payload.routineId);
            if (routine) {
                activity.push({ type: 'ROUTINE_COMPLETE', data: { routine, log }, timestamp: log.timestamp });
            } else {
                console.warn('Routine not found for activity feed:', log.payload.routineId, 'Available routines:', state.routines.map(r => r.id));
            }
        } else if (log.type === 'TIMER_STOP') {
            activity.push({ type: 'TIMER_STOP', data: log, timestamp: log.timestamp });
        }
    }
    return activity;
  }, [todaysLogs, state.tasks]);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      todaysLogs,
      allCompletedWork,
      todaysCompletedWork,
      todaysPoints,
      todaysBadges,
      todaysActivity,
    }));
  }, [todaysLogs, allCompletedWork, todaysCompletedWork, todaysPoints, todaysBadges, todaysActivity]);

  const setStateAndDerive = (updater: (prevState: AppState) => Partial<AppState>) => {
    setState(prevState => {
      const changes = updater(prevState);
      return {...prevState, ...changes};
    });
  };

  const addLog = useCallback((type: LogEvent['type'], payload: LogEvent['payload']) => {
    const newLog: LogEvent = { id: crypto.randomUUID(), timestamp: formatISO(new Date()), type, payload };
    logRepo.add(newLog);
    setStateAndDerive(prevState => {
      const updatedLogs = [...prevState.logs, newLog];
      return {logs: updatedLogs};
    });
  }, []);

  const removeLog = useCallback((logId: string) => {
    logRepo.delete(logId);
    setStateAndDerive(prevState => {
      const updatedLogs = prevState.logs.filter(log => log.id !== logId);
      return {logs: updatedLogs};
    });
  }, []);

  const updateLog = useCallback((logId: string, updatedLog: Partial<LogEvent>) => {
    logRepo.update(logId, updatedLog);
    setStateAndDerive(prevState => {
      const updatedLogs = prevState.logs.map(log =>
        log.id === logId ? { ...log, ...updatedLog } : log
      );
      return { logs: updatedLogs };
    });
  }, []);

  useEffect(() => {
    if (!state.activeItem || state.isPaused) return;
    if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
    const quoteInterval = setInterval(() => {
        showNewQuote();
    }, 30 * 60 * 1000);
    return () => clearInterval(quoteInterval);
  }, [state.activeItem, state.isPaused, showNewQuote]);

  const addTask = useCallback(async (task: Omit<StudyTask, 'id' | 'status' | 'shortId'> & { id?: string }) => {
    const newTask: StudyTask = { ...task, id: task.id || crypto.randomUUID(), shortId: generateShortId('T'), status: 'todo', description: task.description || '' };
    await taskRepo.add(newTask as any);
    const updatedTasks = await taskRepo.getAll();
    setStateAndDerive(prev => {
      addLog('TASK_ADD', {taskId: newTask.id, title: newTask.title});
      return {tasks: updatedTasks.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))};
    });
  }, [addLog]);

  const updateTask = useCallback((updatedTask: StudyTask, isManualCompletion: boolean = false) => {
    taskRepo.update(updatedTask.id, updatedTask as any);
    setStateAndDerive(prev => {
      let isCompletion = false;
      const newTasks = prev.tasks.map(task => {
        if (task.id === updatedTask.id) {
          isCompletion = task.status !== 'completed' && updatedTask.status === 'completed';
          return updatedTask;
        }
        return task;
      });
      if (isCompletion) {
          addLog('TASK_COMPLETE', {taskId: updatedTask.id, title: updatedTask.title, points: updatedTask.points, isManual: isManualCompletion });
      }
      const sortedTasks = newTasks.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      return {tasks: sortedTasks};
    });
  }, [addLog]);
  
  const archiveTask = useCallback(
    (taskId: string) => {
      const taskToArchive = state.tasks.find(t => t.id === taskId);
      if (!taskToArchive) return;
      const updatedTask = { ...taskToArchive, status: 'archived' as const };
      taskRepo.update(taskId, updatedTask as any);
      setStateAndDerive(prev => {
        const newTasks = prev.tasks.map(t =>
          t.id === taskId ? updatedTask : t
        );
        addLog('TASK_ARCHIVE', {taskId, title: taskToArchive.title});
        return {tasks: newTasks};
      });
    },
    [addLog, state.tasks]
  );

  const unarchiveTask = useCallback(
    (taskId: string) => {
      const taskToUnarchive = state.tasks.find(t => t.id === taskId);
      if (!taskToUnarchive) return;
      const updatedTask = { ...taskToUnarchive, status: 'todo' as const };
      taskRepo.update(taskId, updatedTask as any);
      setStateAndDerive(prev => {
        const newTasks = prev.tasks.map(t =>
          t.id === taskId ? updatedTask : t
        );
        addLog('TASK_UNARCHIVE', {taskId, title: taskToUnarchive.title});
        return {tasks: newTasks};
      });
    },
    [addLog, state.tasks]
  );

  const pushTaskToNextDay = useCallback(
    (taskId: string) => {
      const taskToPush = state.tasks.find(t => t.id === taskId);
      if (!taskToPush) return;
      const taskDate = parseISO(taskToPush.date);
      const updatedTask = { ...taskToPush, date: format(addDays(taskDate, 1), 'yyyy-MM-dd') };
      taskRepo.update(taskId, updatedTask as any);
      setStateAndDerive(prev => {
        const newTasks = prev.tasks.map(t =>
          t.id === taskId ? updatedTask : t
        );
        addLog('TASK_PUSH_NEXT_DAY', {taskId, title: taskToPush.title});
        return {tasks: newTasks};
      });
    },
    [addLog, state.tasks]
  );

  const startTimer = useCallback((item: StudyTask | Routine) => {
      if (state.activeItem) { toast.error(`Please stop or complete the timer for "${state.activeItem.item.title}" first.`); return; }
      const type = 'timerType' in item ? 'task' : 'routine';
      const timerData: StoredTimer = { item: {type, item} as ActiveTimerItem, startTime: Date.now(), isPaused: false, pausedTime: 0, pausedDuration: 0, pauseCount: 0, milestones: {}, starCount: 0 };
      
      if (type === 'task') {
        const task = item as StudyTask;
        if (task.timerType === 'countdown' && task.duration) {
             timerData.endTime = Date.now() + task.duration * 60 * 1000;
        }
        addLog('TIMER_START', {taskId: task.id, title: task.title, startTime: timerData.startTime});
        updateTask({...task, status: 'in_progress'});
      } else {
        addLog('TIMER_START', { routineId: item.id, title: item.title, startTime: timerData.startTime });
      }
      localStorage.setItem(TIMER_KEY, JSON.stringify(timerData));
      showNewQuote();
      setState(prev => ({...prev, activeItem: timerData.item, isPaused: false, starCount: 0}));
    }, [state.activeItem, addLog, updateTask, showNewQuote]);

  const togglePause = useCallback(() => {
      const savedTimerJSON = localStorage.getItem(TIMER_KEY);
      if (!savedTimerJSON) return;
      const savedTimer: StoredTimer = JSON.parse(savedTimerJSON);
      
      const isNowPaused = !savedTimer.isPaused;
      const now = Date.now();

      if (isNowPaused) {
          stopSound(state.soundSettings.tick);
          if (savedTimer.endTime) {
              savedTimer.pausedTime = savedTimer.endTime - now;
          }
          savedTimer.pausedDuration += now - savedTimer.startTime;
          savedTimer.pauseCount = (savedTimer.pauseCount || 0) + 1;
          addLog('TIMER_PAUSE', {title: savedTimer.item.item.title, pausedAt: now});
      } else {
          savedTimer.startTime = now;
          if (savedTimer.endTime && savedTimer.pausedTime) {
            savedTimer.endTime = now + savedTimer.pausedTime;
          }
          addLog('TIMER_START', {title: savedTimer.item.item.title, resumed: true, resumedAt: now});
      }
      
      savedTimer.isPaused = isNowPaused;
      localStorage.setItem(TIMER_KEY, JSON.stringify(savedTimer));
      setState(prev => ({...prev, isPaused: isNowPaused}));
  }, [addLog, state.soundSettings.tick, stopSound]);

  const stopTimer = useCallback((reason: string, studyLog: string = '') => {
    stopSound(state.soundSettings.tick);
    const savedTimerJSON = localStorage.getItem(TIMER_KEY);
    if (!savedTimerJSON) return;
    const savedTimer: StoredTimer = JSON.parse(savedTimerJSON);
    const {item} = savedTimer;
    
    let finalDuration = savedTimer.pausedDuration;
    if (!savedTimer.isPaused) {
        finalDuration += Date.now() - savedTimer.startTime;
    }
    const durationInSeconds = Math.round(finalDuration / 1000);

    if (item.type === 'task') {
      updateTask({...item.item, status: 'todo'});
      addLog('TIMER_STOP', { taskId: item.item.id, title: item.item.title, reason, timeSpentSeconds: Math.max(0, durationInSeconds) });
    } else {
      const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
      const points = Math.floor((durationInSeconds / 60) * priorityMultipliers[item.item.priority]);
      addLog('ROUTINE_SESSION_COMPLETE', { routineId: item.item.id, title: item.item.title, duration: durationInSeconds, points, studyLog, stopped: true, priority: item.item.priority, pausedDuration: Math.round(savedTimer.pausedDuration / 1000), pauseCount: savedTimer.pauseCount });
    }
    localStorage.removeItem(TIMER_KEY);
    setStateAndDerive(prev => ({ activeItem: null, isPaused: true, isOvertime: false, timeDisplay: '00:00', timerProgress: null, starCount: 0 }));
  }, [updateTask, addLog, stopSound, state.soundSettings.tick]);

  const completeTimer = useCallback((studyLog: string = '') => {
    stopSound(state.soundSettings.tick);
    const savedTimerJSON = localStorage.getItem(TIMER_KEY);
    if (!savedTimerJSON) return;
    const savedTimer: StoredTimer = JSON.parse(savedTimerJSON);
    const { item } = savedTimer;
  
    let finalDuration = savedTimer.pausedDuration;
    if (!savedTimer.isPaused) {
        finalDuration += Date.now() - savedTimer.startTime;
    }
    const durationInSeconds = Math.round(finalDuration / 1000);
    const pausedInSeconds = Math.round(savedTimer.pausedDuration / 1000);
  
    if (item.type === 'task') {
      let pointsEarned = item.item.points;
      if (item.item.timerType === 'infinity') {
        const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
        pointsEarned = Math.floor((durationInSeconds / 60) * priorityMultipliers[item.item.priority]);
      }
      
      updateTask({ ...item.item, status: 'completed' as const }, true);
      addLog('TIMER_SESSION_COMPLETE', {
        taskId: item.item.id,
        title: item.item.title,
        duration: durationInSeconds,
        pausedDuration: pausedInSeconds,
        pauseCount: savedTimer.pauseCount || 0,
        points: pointsEarned,
        priority: item.item.priority,
      });
      setTimeout(() => {
        toast.success(`Task Completed! You've earned ${pointsEarned} points!`);
        fire();
      }, 0);
    } else {
      const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
      const points = Math.floor((durationInSeconds / 60) * priorityMultipliers[item.item.priority]);
      addLog('ROUTINE_SESSION_COMPLETE', {
        routineId: item.item.id,
        title: item.item.title,
        duration: durationInSeconds,
        pausedDuration: pausedInSeconds,
        pauseCount: savedTimer.pauseCount,
        points,
        studyLog,
        priority: item.item.priority,
      });
      setTimeout(() => {
        toast.success(`You logged ${formatTime(durationInSeconds)} and earned ${points} points.`);
        fire();
      }, 0);
    }
  
    localStorage.removeItem(TIMER_KEY);
    setStateAndDerive((prev) => ({
      activeItem: null,
      isPaused: true,
      isOvertime: false,
      timeDisplay: '00:00',
      timerProgress: null,
      starCount: 0,
    }));
  }, [updateTask, addLog, fire, stopSound, state.soundSettings.tick]);

  const manuallyCompleteItem = useCallback((item: StudyTask | Routine, data: ManualLogFormData) => {
    const isTask = (item: StudyTask | Routine): item is StudyTask => 'timerType' in item;
    
    const startTime = parse(`${data.logDate} ${data.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const endTime = parse(`${data.logDate} ${data.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

    const totalDurationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    const productiveDurationSeconds = data.productiveDuration * 60;
    const pausedDurationSeconds = totalDurationSeconds - productiveDurationSeconds;

    const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
    const points = Math.floor((productiveDurationSeconds / 60) * priorityMultipliers[item.priority]);

    const logType = isTask(item) ? 'TIMER_SESSION_COMPLETE' : 'ROUTINE_SESSION_COMPLETE';
    const payload = {
        title: item.title,
        duration: totalDurationSeconds,
        productiveDuration: productiveDurationSeconds,
        pausedDuration: pausedDurationSeconds,
        pauseCount: data.breaks,
        points,
        priority: item.priority,
        manual: true,
        notes: data.notes,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        taskId: isTask(item) ? item.id : undefined,
        routineId: !isTask(item) ? item.id : undefined,
    };
    
    addLog(logType, payload);
    if(isTask(item)) {
        updateTask({ ...item, status: 'completed' }, true);
    }

    setTimeout(() => {
        toast.success(`Logged ${data.productiveDuration}m for "${item.title}". You earned ${points} pts!`);
        fire();
    }, 0);
  }, [addLog, updateTask, fire]);

  const openQuickStart = useCallback(() => setState(prev => ({...prev, quickStartOpen: true})), []);
  const closeQuickStart = useCallback(() => setState(prev => ({...prev, quickStartOpen: false})), []);

  const openRoutineLogDialog = useCallback((action: 'complete' | 'stop') => { setState(prev => ({...prev, routineLogDialog: {isOpen: true, action}})); }, []);
  const closeRoutineLogDialog = useCallback(() => { setState(prev => ({ ...prev, routineLogDialog: {isOpen: false, action: null} })); }, []);
  const addRoutine = useCallback((input: Omit<Routine, 'id' | 'shortId' | 'status' | 'createdAt'> & Partial<Pick<Routine, 'id'>>) => {
    const ensureId = (id?: string) => id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    const id = ensureId(input.id);
    const shortId = `R-${id.slice(0, 6)}`;

    const newRoutine: Routine = {
      description: input.description ?? '',
      status: 'todo',
      createdAt: Date.now(),
      ...input,
      title: input.title?.trim() || 'Untitled Routine',
      priority: input.priority ?? 'medium',
      id,
      shortId,
    };

    setState(s => {
      const next = [...s.routines, newRoutine];
      // fire-and-forget persistence; do not overwrite state later with stale storage
      void routineRepo.add(newRoutine);
      return { ...s, routines: next };
    });

    return id;
  }, []);
  const updateRoutine = useCallback((routine: Routine) => {
    routineRepo.update(routine.id, routine as any);
    setStateAndDerive(prev => {
      const updated = prev.routines.map(r => (r.id === routine.id ? routine : r)).sort((a, b) => a.startTime.localeCompare(b.startTime));
      return {routines: updated};
    });
  }, []);
  const deleteRoutine = useCallback((routineId: string) => {
    routineRepo.delete(routineId);
    setStateAndDerive(prev => {
      const updated = prev.routines.filter(r => r.id !== routineId);
      return {routines: updated};
    });
  }, []);
  const addBadge = useCallback(async (badgeData: Omit<Badge, 'id'>) => {
    const newBadge: Badge = { ...badgeData, id: `custom_${crypto.randomUUID()}` };
    await badgeRepo.add(newBadge);
    const newAllBadges = await badgeRepo.getAll();
    setStateAndDerive(prev => {
      const customBadges = newAllBadges.filter(b => b.isCustom);
      localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(customBadges));
      return {allBadges: newAllBadges};
    });
  }, []);
  const updateBadge = useCallback((updatedBadge: Badge) => { setStateAndDerive(prev => { const newAllBadges = prev.allBadges.map(b => b.id === updatedBadge.id ? updatedBadge : b); if (updatedBadge.isCustom) { const customBadges = newAllBadges.filter(b => b.isCustom); localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(customBadges)); } else { const systemBadges = newAllBadges.filter(b => !b.isCustom); localStorage.setItem(SYSTEM_BADGES_CONFIG_KEY, JSON.stringify(systemBadges)); } return {allBadges: newAllBadges}; }); }, []);
  const deleteBadge = useCallback(async (badgeId: string) => {
    await badgeRepo.delete(badgeId);
    const updatedAllBadges = await badgeRepo.getAll();
    setStateAndDerive(prev => {
      const updatedEarned = new Map(prev.earnedBadges);
      if (updatedEarned.has(badgeId)) updatedEarned.delete(badgeId);
      const customBadges = updatedAllBadges.filter(b => b.isCustom);
      localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(customBadges));
      localStorage.setItem(EARNED_BADGES_KEY, JSON.stringify(Array.from(updatedEarned.entries())));
      return { allBadges: updatedAllBadges, earnedBadges: updatedEarned };
    });
  }, []);
  const updateProfile = useCallback((newProfileData: Partial<UserProfile>) => {
    setStateAndDerive(prev => {
      const newProfile = {...prev.profile, ...newProfileData, id: 'user_profile'};
      profileRepo.update('user-profile', newProfile as Partial<UserProfile>);
      return {profile: newProfile};
    });
  }, []);
  const setSoundSettings = useCallback((newSettings: Partial<SoundSettings>) => { setStateAndDerive(prev => { const updatedSettings = {...prev.soundSettings, ...newSettings}; localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(updatedSettings)); return {soundSettings: updatedSettings}; }); }, []);
  const toggleMute = useCallback(() => setState(prev => ({...prev, isMuted: !prev.isMuted})), []);

  const contextValue = useMemo(
    () => ({
      state,
      addTask,
      updateTask,
      archiveTask,
      unarchiveTask,
      pushTaskToNextDay,
      startTimer,
      togglePause,
      completeTimer,
      stopTimer,
      manuallyCompleteItem,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      addBadge,
      updateBadge,
      deleteBadge,
      updateProfile,
      openRoutineLogDialog,
      closeRoutineLogDialog,
      setSoundSettings,
      toggleMute,
      addLog,
      removeLog,
      updateLog,
      openQuickStart,
      closeQuickStart,
    }),
    [
      state,
      addTask,
      updateTask,
      archiveTask,
      unarchiveTask,
      pushTaskToNextDay,
      startTimer,
      togglePause,
      completeTimer,
      stopTimer,
      manuallyCompleteItem,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      addBadge,
      updateBadge,
      deleteBadge,
      updateProfile,
      openRoutineLogDialog,
      closeRoutineLogDialog,
      setSoundSettings,
      toggleMute,
      addLog,
      removeLog,
      updateLog,
      openQuickStart,
      closeQuickStart
    ]
  );

  return (
    <GlobalStateContext.Provider value={contextValue}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) throw new Error('useGlobalState must be used within a GlobalStateProvider');
  return context;
};