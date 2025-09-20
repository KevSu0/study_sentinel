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
import {addDays, format, formatISO, subDays, parseISO} from 'date-fns';
import {useConfetti} from '@/components/providers/confetti-provider';
import toast from 'react-hot-toast';
import {SYSTEM_BADGES, checkBadge} from '@/lib/badges';
import { getSessionDate, getStudyDateForTimestamp, getStudyDay, generateShortId } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { motivationalQuotes, getRandomMotivationalMessage } from '@/lib/motivation';
import { safeApiFetch } from '@/lib/remote-api-gate';
import { remoteApiPaths } from '@/lib/remote-api-paths';
import {
  TASKS_KEY,
  TIMER_KEY,
  EARNED_BADGES_KEY,
  CUSTOM_BADGES_KEY,
  SYSTEM_BADGES_CONFIG_KEY,
  PROFILE_KEY,
  ROUTINES_KEY,
  SOUND_SETTINGS_KEY,
  LOG_PREFIX,
} from '@/lib/storage-keys';

// --- Type Definitions ---
type StoredTimer = {
  item: ActiveTimerItem;
  endTime?: number;
  startTime?: number;
  isPaused: boolean;
  pausedTime: number;
  pausedDuration: number;
  overtimeNotified?: boolean;
  milestones: Record<string, boolean>;
  starCount?: number;
};

export type ActivityFeedItem = {
  type: 'TASK_COMPLETE' | 'ROUTINE_COMPLETE' | 'TASK_STOPPED';
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
}

interface GlobalStateContextType {
  state: AppState & {todaysActivity: ActivityFeedItem[]};
  addTask: (task: Omit<StudyTask, 'id' | 'status' | 'shortId'>) => void;
  updateTask: (updatedTask: StudyTask) => void;
  archiveTask: (taskId: string) => void;
  unarchiveTask: (taskId: string) => void;
  pushTaskToNextDay: (taskId: string) => void;
  startTimer: (item: StudyTask | Routine) => void;
  togglePause: () => void;
  completeTimer: (studyLog?: string) => void;
  stopTimer: (reason: string, studyLog?: string) => void;
  manuallyCompleteItem: (item: StudyTask | Routine, durationMinutes: number, notes?: string) => void;
  addRoutine: (routine: Omit<Routine, 'id' | 'shortId'>) => void;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (routineId: string) => void;
  addBadge: (badge: Omit<Badge, 'id'>) => void;
  updateBadge: (badge: Badge) => void;
  deleteBadge: (badgeId: string) => void;
  updateProfile: (newProfileData: Partial<UserProfile>) => void;
  openRoutineLogDialog: (action: 'complete' | 'stop') => void;
  closeRoutineLogDialog: () => void;
  setSoundSettings: (newSettings: Partial<SoundSettings>) => void;
  toggleMute: () => void;
  addLog: (type: LogEvent['type'], payload: LogEvent['payload']) => void;
  removeLog: (logId: string) => void;
  updateLog: (logId: string, updatedLog: Partial<LogEvent>) => void;
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
};

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(
  undefined
);

const formatTime = (seconds: number) => {
  const absSeconds = Math.abs(seconds);
  const hours = Math.floor(absSeconds / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(String(hours).padStart(2, '0'));
  parts.push(String(mins).padStart(2, '0'));
  parts.push(String(secs).padStart(2, '0'));
  return parts.join(':');
};

const JSON_MIME = 'application/json';

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await buildResponseError(response);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes(JSON_MIME)) {
    const preview = await getResponsePreview(response);
    const descriptor = contentType || 'unknown';
    throw new Error(`Expected JSON response but received '${descriptor}'.${preview ? ` Body preview: ${preview}` : ''}`);
  }

  return response.json() as Promise<T>;
}

async function ensureSuccessfulResponse(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }
  throw await buildResponseError(response);
}

async function buildResponseError(response: Response): Promise<Error> {
  const statusInfo = `${response.status} ${response.statusText}`.trim();
  const preview = await getResponsePreview(response);
  const message = preview ? `Request failed with status ${statusInfo}: ${preview}` : `Request failed with status ${statusInfo}`;
  return new Error(message);
}

async function getResponsePreview(response: Response, limit = 120): Promise<string> {
  try {
    const text = await response.clone().text();
    return text.slice(0, limit);
  } catch {
    return '';
  }
}
export function GlobalStateProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<AppState>(initialAppState);
  const {fire} = useConfetti();
  const audioRef = useRef<Record<string, HTMLAudioElement>>({});
  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isLoaded: isAppLoaded, allBadges: badgeList, earnedBadges: earnedBadgeMap, tasks: taskList } = state;

  const updateDerivedState = useCallback((baseState: { tasks: StudyTask[]; routines: Routine[]; profile: UserProfile; logs: LogEvent[]; allBadges: Badge[]; earnedBadges: Map<string, string>; soundSettings: SoundSettings }) => {
    const {logs, allBadges, earnedBadges} = baseState;
    const sessionDate = getSessionDate();
    const todayStr = format(sessionDate, 'yyyy-MM-dd');

    const todaysLogs = logs;

    const allTimeLogs: LogEvent[] = [];
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOG_PREFIX)) {
          allTimeLogs.push(...JSON.parse(localStorage.getItem(key) || '[]'));
        }
      }
    }
    allTimeLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const sessionLogs = allTimeLogs.filter(l => l.type === 'ROUTINE_SESSION_COMPLETE' || l.type === 'TIMER_SESSION_COMPLETE');
    const workItems: CompletedWork[] = sessionLogs.map(l => ({ 
        date: format(getStudyDateForTimestamp(l.timestamp), 'yyyy-MM-dd'), 
        duration: l.payload.duration, 
        type: l.type === 'ROUTINE_SESSION_COMPLETE' ? 'routine' : 'task', 
        title: l.payload.title, 
        points: l.payload.points || 0, 
        priority: l.payload.priority, 
        subjectId: l.payload.routineId || l.payload.taskId, 
        timestamp: l.timestamp 
    }));
    const allCompletedWork = workItems;
    const todaysCompletedWork = allCompletedWork.filter(w => w.date === todayStr);
    const todaysPoints = todaysCompletedWork.reduce((sum, work) => sum + work.points, 0);
    const todaysBadges = allBadges.filter(b => earnedBadges.get(b.id) === todayStr);

    return { todaysLogs, allCompletedWork, todaysCompletedWork, todaysPoints, todaysBadges };
  }, []);

  const setStateAndDerive = useCallback((updater: (prevState: AppState) => Partial<AppState>) => {
    setState(prevState => {
      const changes = updater(prevState);
      const newState = {...prevState, ...changes};
      const derived = updateDerivedState(newState);
      return {...newState, ...derived};
    });
  }, [updateDerivedState]);

  useEffect(() => {
    let savedTasks: StudyTask[] = [], savedProfile: UserProfile = defaultProfile, savedRoutines: Routine[] = [];
    let savedEarnedBadges = new Map<string, string>(), savedCustomBadges: Badge[] = [], systemBadgeConfigs: Badge[] | null = null;
    let savedTimer: StoredTimer | null = null, savedSoundSettings = defaultSoundSettings;

    try {
      savedTasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
      const profileFromStorage = localStorage.getItem(PROFILE_KEY); if (profileFromStorage) savedProfile = JSON.parse(profileFromStorage);
      savedRoutines = JSON.parse(localStorage.getItem(ROUTINES_KEY) || '[]');
      const earnedBadgesFromStorage = localStorage.getItem(EARNED_BADGES_KEY); if (earnedBadgesFromStorage) savedEarnedBadges = new Map(JSON.parse(earnedBadgesFromStorage));
      savedCustomBadges = JSON.parse(localStorage.getItem(CUSTOM_BADGES_KEY) || '[]');
      const systemConfigsFromStorage = localStorage.getItem(SYSTEM_BADGES_CONFIG_KEY); if (systemConfigsFromStorage) systemBadgeConfigs = JSON.parse(systemConfigsFromStorage);
      const timerFromStorage = localStorage.getItem(TIMER_KEY); if (timerFromStorage) savedTimer = JSON.parse(timerFromStorage);
      const soundSettingsFromStorage = localStorage.getItem(SOUND_SETTINGS_KEY); if(soundSettingsFromStorage) savedSoundSettings = JSON.parse(soundSettingsFromStorage);
    } catch (error) {
      console.error('Failed to load state from localStorage', error);
      [TASKS_KEY, PROFILE_KEY, ROUTINES_KEY, EARNED_BADGES_KEY, CUSTOM_BADGES_KEY, SYSTEM_BADGES_CONFIG_KEY, TIMER_KEY, SOUND_SETTINGS_KEY].forEach(k => localStorage.removeItem(k));
    }

    const systemBadges = systemBadgeConfigs || SYSTEM_BADGES.map((b, i) => ({ ...b, id: `system_${i + 1}`, isCustom: false, isEnabled: true }));
    if (!systemBadgeConfigs) localStorage.setItem(SYSTEM_BADGES_CONFIG_KEY, JSON.stringify(systemBadges));
    const allBadges = [...systemBadges, ...savedCustomBadges];

    const sessionDate = getSessionDate();
    const todayStr = format(sessionDate, 'yyyy-MM-dd');
    const prevDayStr = format(subDays(sessionDate, 1), 'yyyy-MM-dd');
    const logKey = `${LOG_PREFIX}${todayStr}`;
    const prevLogKey = `${LOG_PREFIX}${prevDayStr}`;
    const todaysLogs: LogEvent[] = JSON.parse(localStorage.getItem(logKey) || '[]');
    const previousDayLogs: LogEvent[] = JSON.parse(localStorage.getItem(prevLogKey) || '[]');

    const baseState = { tasks: savedTasks, routines: savedRoutines, profile: savedProfile, logs: todaysLogs, allBadges, earnedBadges: savedEarnedBadges, soundSettings: savedSoundSettings };
    const derivedState = updateDerivedState(baseState);

    setState({ ...initialAppState, ...baseState, isLoaded: true, previousDayLogs, activeItem: savedTimer?.item || null, isPaused: savedTimer?.isPaused ?? true, starCount: savedTimer?.starCount || 0, ...derivedState });

    if (typeof window !== 'undefined') {
        Object.keys(soundFiles).forEach(key => {
            const src = soundFiles[key];
            if (src) {
                audioRef.current[key] = new Audio(src);
            }
        });
    }
  }, [updateDerivedState]);

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

        const savedTimer: StoredTimer | null = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null');
        if (!savedTimer) return;

        playSound(state.soundSettings.tick);

        let newDisplay: string;
        let newOvertime = false;
        let newProgress: number | null = null;
        let elapsed = 0;

        if (savedTimer.startTime) {
            elapsed = Math.round((Date.now() - savedTimer.startTime + savedTimer.pausedDuration) / 1000);
        }

        if (savedTimer.item.type === 'task' && savedTimer.item.item.timerType === 'countdown') {
            if (!savedTimer.endTime) return;
            const remaining = Math.round((savedTimer.endTime - Date.now()) / 1000);
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
    if (!isAppLoaded) return;

    const newlyEarnedBadges: Badge[] = [];
    for (const badge of badgeList) {
      if (!earnedBadgeMap.has(badge.id) && badge.isEnabled) {
        const allTimeLogs: LogEvent[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(LOG_PREFIX)) {
            allTimeLogs.push(...JSON.parse(localStorage.getItem(key) || '[]'));
          }
        }
        if (checkBadge(badge, {tasks: taskList, logs: allTimeLogs})) {
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
            toast.success(`Badge Unlocked: ${badge.name}! ðŸŽ‰`);
          }, 500);
        });
        localStorage.setItem(
          EARNED_BADGES_KEY,
          JSON.stringify(Array.from(newEarnedMap.entries()))
        );
        return {earnedBadges: newEarnedMap};
      });
    }
  }, [isAppLoaded, badgeList, earnedBadgeMap, taskList, fire, setStateAndDerive]);

  const addLog = useCallback((type: LogEvent['type'], payload: LogEvent['payload']) => {
      setStateAndDerive(prevState => {
        const newLog: LogEvent = { id: crypto.randomUUID(), timestamp: formatISO(new Date()), type, payload };
        const updatedLogs = [...prevState.logs, newLog];
        const logKey = `${LOG_PREFIX}${format(getSessionDate(), 'yyyy-MM-dd')}`;
        localStorage.setItem(logKey, JSON.stringify(updatedLogs));
        return {logs: updatedLogs};
      });
    }, [setStateAndDerive]);

  const removeLog = useCallback((logId: string) => {
    setStateAndDerive(prevState => {
      const updatedLogs = prevState.logs.filter(log => log.id !== logId);
      const logKey = `${LOG_PREFIX}${format(getSessionDate(), 'yyyy-MM-dd')}`;
      localStorage.setItem(logKey, JSON.stringify(updatedLogs));
      return {logs: updatedLogs};
    });
  }, [setStateAndDerive]);

  const updateLog = useCallback((logId: string, updatedLog: Partial<LogEvent>) => {
    setStateAndDerive(prevState => {
      const updatedLogs = prevState.logs.map(log =>
        log.id === logId ? { ...log, ...updatedLog } : log
      );
      const logKey = `${LOG_PREFIX}${format(getSessionDate(), 'yyyy-MM-dd')}`;
      localStorage.setItem(logKey, JSON.stringify(updatedLogs));
      return { logs: updatedLogs };
    });
  }, [setStateAndDerive]);

  useEffect(() => {
    if (!state.activeItem || state.isPaused) return;
    if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
    const quoteInterval = setInterval(() => {
        showNewQuote();
    }, 30 * 60 * 1000);
    return () => clearInterval(quoteInterval);
  }, [state.activeItem, state.isPaused, showNewQuote]);

  const addTask = useCallback(async (task: Omit<StudyTask, 'id' | 'status' | 'shortId'>) => {
  const tempId = `temp_${crypto.randomUUID()}`;
  const newTask: StudyTask = { ...task, id: tempId, shortId: generateShortId('T'), status: 'todo', description: task.description || '' };

  // Optimistic UI update
  setStateAndDerive(prev => {
    const updatedTasks = [...prev.tasks, newTask].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return {tasks: updatedTasks};
  });

  try {
    const response = await safeApiFetch(remoteApiPaths.tasksCollection(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    });
    const savedTask = await parseJsonResponse<StudyTask>(response);

    setStateAndDerive(prev => {
      const updatedTasks = prev.tasks.map(t => t.id === tempId ? savedTask : t);
      localStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
      addLog('TASK_ADD', {taskId: savedTask.id, title: savedTask.title});
      return {tasks: updatedTasks};
    });
  } catch (error) {
    console.error("Failed to add task, will be synced in background", error);
    setStateAndDerive(prev => {
      localStorage.setItem(TASKS_KEY, JSON.stringify(prev.tasks));
      addLog('TASK_ADD_OFFLINE', {taskId: tempId, title: newTask.title});
      return {};
    });
  }
}, [addLog, setStateAndDerive]);

  const updateTask = useCallback(async (updatedTask: StudyTask) => {
  const originalTasks = state.tasks;

  // Optimistic UI update
  setStateAndDerive(prev => {
    const newTasks = prev.tasks.map(task => (task.id === updatedTask.id ? updatedTask : task));
    const sortedTasks = newTasks.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return {tasks: sortedTasks};
  });

  try {
    const response = await safeApiFetch(remoteApiPaths.task(updatedTask.id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTask),
    });
    const savedTask = await parseJsonResponse<StudyTask>(response);

    setStateAndDerive(prev => {
      const newTasks = prev.tasks.map(task => (task.id === savedTask.id ? savedTask : task));
      const sortedTasks = newTasks.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      localStorage.setItem(TASKS_KEY, JSON.stringify(sortedTasks));
      addLog('TASK_UPDATE', {taskId: savedTask.id, title: savedTask.title});
      return {tasks: sortedTasks};
    });
  } catch (error) {
    console.error("Failed to update task, will be synced in background", error);
    setStateAndDerive(() => {
      localStorage.setItem(TASKS_KEY, JSON.stringify(originalTasks));
      addLog('TASK_UPDATE_OFFLINE', {taskId: updatedTask.id, title: updatedTask.title});
      return {tasks: originalTasks};
    });
  }
}, [addLog, setStateAndDerive, state.tasks]);
  
  const archiveTask = useCallback(
  async (taskId: string) => {
    const originalTasks = state.tasks;

    // Optimistic UI update
    setStateAndDerive(prev => {
      const newTasks = prev.tasks.map(t =>
        t.id === taskId ? {...t, status: 'archived' as const} : t
      );
      return {tasks: newTasks};
    });

    try {
      const response = await safeApiFetch(remoteApiPaths.taskMutation(taskId, 'archive'), { method: 'POST' });
      await ensureSuccessfulResponse(response);

      setStateAndDerive(prev => {
        const taskToArchive = prev.tasks.find(t => t.id === taskId);
        if (!taskToArchive) return {};
        const newTasks = prev.tasks.map(t =>
          t.id === taskId ? {...t, status: 'archived' as const} : t
        );
        addLog('TASK_ARCHIVE', {taskId, title: taskToArchive.title});
        localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks));
        return {tasks: newTasks};
      });
    } catch (error) {
      console.error("Failed to archive task, will be synced in background", error);
      setStateAndDerive(() => {
        const taskToArchive = originalTasks.find(t => t.id === taskId);
        localStorage.setItem(TASKS_KEY, JSON.stringify(originalTasks));
        addLog('TASK_ARCHIVE_OFFLINE', {taskId, title: taskToArchive?.title || ''});
        return {tasks: originalTasks};
      });
    }
  },
  [addLog, setStateAndDerive, state.tasks]
);

  const unarchiveTask = useCallback(
  async (taskId: string) => {
    const originalTasks = state.tasks;

    // Optimistic UI update
    setStateAndDerive(prev => {
      const newTasks = prev.tasks.map(t =>
        t.id === taskId ? {...t, status: 'todo' as const} : t
      );
      return {tasks: newTasks};
    });

    try {
      const response = await safeApiFetch(remoteApiPaths.taskMutation(taskId, 'unarchive'), { method: 'POST' });
      await ensureSuccessfulResponse(response);

      setStateAndDerive(prev => {
        const taskToUnarchive = prev.tasks.find(t => t.id === taskId);
        if (!taskToUnarchive) return {};
        const newTasks = prev.tasks.map(t =>
          t.id === taskId ? {...t, status: 'todo' as const} : t
        );
        addLog('TASK_UNARCHIVE', {taskId, title: taskToUnarchive.title});
        localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks));
        return {tasks: newTasks};
      });
    } catch (error) {
      console.error("Failed to unarchive task, will be synced in background", error);
      setStateAndDerive(() => {
        localStorage.setItem(TASKS_KEY, JSON.stringify(originalTasks));
        addLog('TASK_UNARCHIVE_OFFLINE', {taskId, title: originalTasks.find(t => t.id === taskId)?.title || ''});
        return {tasks: originalTasks};
      });
    }
  },
  [addLog, setStateAndDerive, state.tasks]
);

  const pushTaskToNextDay = useCallback(
  async (taskId: string) => {
    const originalTasks = state.tasks;

    // Optimistic UI update
    setStateAndDerive(prev => {
      const newTasks = prev.tasks.map(t => {
        if (t.id === taskId) {
          const taskDate = parseISO(t.date);
          return {...t, date: format(addDays(taskDate, 1), 'yyyy-MM-dd')};
        }
        return t;
      });
      return {tasks: newTasks};
    });

    try {
      const response = await safeApiFetch(remoteApiPaths.taskMutation(taskId, 'push'), { method: 'POST' });
      await ensureSuccessfulResponse(response);

      setStateAndDerive(prev => {
        const taskToPush = prev.tasks.find(t => t.id === taskId);
        if (!taskToPush) return {};
        const newTasks = prev.tasks.map(t => {
          if (t.id === taskId) {
            const taskDate = parseISO(t.date);
            return {...t, date: format(addDays(taskDate, 1), 'yyyy-MM-dd')};
          }
          return t;
        });
        addLog('TASK_PUSH_NEXT_DAY', {taskId, title: taskToPush.title});
        localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks));
        return {tasks: newTasks};
      });
    } catch (error) {
      console.error("Failed to push task, will be synced in background", error);
      setStateAndDerive(() => {
        const taskToPush = originalTasks.find(t => t.id === taskId);
        localStorage.setItem(TASKS_KEY, JSON.stringify(originalTasks));
        addLog('TASK_PUSH_NEXT_DAY_OFFLINE', {taskId, title: taskToPush?.title || ''});
        return {tasks: originalTasks};
      });
    }
  },
  [addLog, setStateAndDerive, state.tasks]
);

  const startTimer = useCallback((item: StudyTask | Routine) => {
      if (state.activeItem) { toast.error(`Please stop or complete the timer for "${state.activeItem.item.title}" first.`); return; }
      const type = 'timerType' in item ? 'task' : 'routine';
      const timerData: StoredTimer = { item: {type, item} as ActiveTimerItem, startTime: Date.now(), isPaused: false, pausedTime: 0, pausedDuration: 0, milestones: {}, starCount: 0 };
      
      if (type === 'task') {
        const task = item as StudyTask;
        if (task.timerType === 'countdown' && task.duration) {
             timerData.endTime = Date.now() + task.duration * 60 * 1000;
        }
        addLog('TIMER_START', {taskId: task.id, title: task.title});
        updateTask({...task, status: 'in_progress'});
      } else {
        addLog('TIMER_START', { routineId: item.id, title: item.title });
      }
      localStorage.setItem(TIMER_KEY, JSON.stringify(timerData));
      showNewQuote();
      setState(prev => ({...prev, activeItem: timerData.item, isPaused: false, starCount: 0}));
    }, [state.activeItem, addLog, updateTask, showNewQuote]);

  const togglePause = useCallback(() => {
    stopSound(state.soundSettings.tick);
    const savedTimerJSON = localStorage.getItem(TIMER_KEY);
    if (!savedTimerJSON) return;
    const savedTimer: StoredTimer = JSON.parse(savedTimerJSON);
    const isNowPaused = !savedTimer.isPaused;
    let newTimerState = {...savedTimer, isPaused: isNowPaused};
    if (isNowPaused) {
      if (newTimerState.item.type === 'task' && newTimerState.item.item.timerType === 'countdown' && newTimerState.endTime) {
        newTimerState.pausedTime = Math.max(0, newTimerState.endTime - Date.now());
      } else if (newTimerState.startTime) {
        newTimerState.pausedDuration += Date.now() - newTimerState.startTime;
        newTimerState.startTime = 0; // Reset start time as we've captured the duration
      }
      addLog('TIMER_PAUSE', {title: savedTimer.item.item.title});
    } else {
      if (newTimerState.item.type === 'task' && newTimerState.item.item.timerType === 'countdown' && newTimerState.pausedTime > 0) {
        newTimerState.endTime = Date.now() + newTimerState.pausedTime;
      } else {
        newTimerState.startTime = Date.now(); // Set new start time, pausedDuration is already accounted for
      }
      addLog('TIMER_START', {title: savedTimer.item.item.title, resumed: true});
    }
    localStorage.setItem(TIMER_KEY, JSON.stringify(newTimerState));
    setState(prev => ({...prev, isPaused: isNowPaused}));
  }, [addLog, state.soundSettings.tick, stopSound]);

  const stopTimer = useCallback((reason: string, studyLog: string = '') => {
    stopSound(state.soundSettings.tick);
    const savedTimerJSON = localStorage.getItem(TIMER_KEY);
    if (!savedTimerJSON) return;
    const savedTimer: StoredTimer = JSON.parse(savedTimerJSON);
    const {item} = savedTimer;
    const elapsed = savedTimer.isPaused
      ? savedTimer.pausedDuration
      : savedTimer.startTime
      ? Date.now() - savedTimer.startTime + savedTimer.pausedDuration
      : 0;
    const durationInSeconds = Math.round(elapsed / 1000);
    if (item.type === 'task') {
      updateTask({...item.item, status: 'todo'});
      addLog('TIMER_STOP', { taskId: item.item.id, title: item.item.title, reason, timeSpentSeconds: Math.max(0, durationInSeconds) });
    } else {
      const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
      const points = Math.floor((durationInSeconds / 60) * priorityMultipliers[item.item.priority]);
      addLog('ROUTINE_SESSION_COMPLETE', { routineId: item.item.id, title: item.item.title, duration: durationInSeconds, points, studyLog, stopped: true, priority: item.item.priority });
    }
    localStorage.removeItem(TIMER_KEY);
    setStateAndDerive(prev => ({ activeItem: null, isPaused: true, isOvertime: false, timeDisplay: '00:00', timerProgress: null, starCount: 0 }));
  }, [updateTask, addLog, setStateAndDerive, stopSound, state.soundSettings.tick]);

  const completeTimer = useCallback((studyLog: string = '') => {
    stopSound(state.soundSettings.tick);
    const savedTimerJSON = localStorage.getItem(TIMER_KEY);
    if (!savedTimerJSON) return;
    const savedTimer: StoredTimer = JSON.parse(savedTimerJSON);
    const { item } = savedTimer;
  
    const elapsed = savedTimer.isPaused
      ? savedTimer.pausedDuration
      : savedTimer.startTime
      ? Date.now() - savedTimer.startTime + savedTimer.pausedDuration
      : 0;
    const durationInSeconds = Math.round(elapsed / 1000);
  
    if (item.type === 'task') {
      let pointsEarned = item.item.points;
      if (item.item.timerType === 'infinity') {
        const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
        pointsEarned = Math.floor((durationInSeconds / 60) * priorityMultipliers[item.item.priority]);
      }
      
      updateTask({ ...item.item, status: 'completed' as const });
      addLog('TIMER_SESSION_COMPLETE', {
        taskId: item.item.id,
        title: item.item.title,
        duration: durationInSeconds,
        points: pointsEarned,
        priority: item.item.priority,
      });
      fire();
      toast.success(`Task Completed! You've earned ${pointsEarned} points!`);
    } else {
      const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
      const points = Math.floor((durationInSeconds / 60) * priorityMultipliers[item.item.priority]);
      addLog('ROUTINE_SESSION_COMPLETE', {
        routineId: item.item.id,
        title: item.item.title,
        duration: durationInSeconds,
        points,
        studyLog,
        priority: item.item.priority,
      });
      fire();
      toast.success(`You logged ${formatTime(durationInSeconds)} and earned ${points} points.`);
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
  }, [updateTask, addLog, fire, setStateAndDerive, stopSound, state.soundSettings.tick]);

  const manuallyCompleteItem = useCallback((item: StudyTask | Routine, durationMinutes: number, notes?: string) => {
    const isTask = 'status' in item;
    const durationInSeconds = durationMinutes * 60;
    const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
    const points = Math.floor((durationInSeconds / 60) * priorityMultipliers[item.priority]);

    if(isTask) {
        updateTask({...item, status: 'completed'});
        addLog('TIMER_SESSION_COMPLETE', {
            taskId: item.id,
            title: item.title,
            duration: durationInSeconds,
            points,
            priority: item.priority,
            manual: true,
            notes,
        });
        toast.success(`Logged ${durationMinutes}m for "${item.title}". You earned ${points} pts!`);
    } else {
        addLog('ROUTINE_SESSION_COMPLETE', {
            routineId: item.id,
            title: item.title,
            duration: durationInSeconds,
            points,
            studyLog: notes,
            priority: item.priority,
            manual: true,
        });
        toast.success(`Logged ${durationMinutes}m for routine "${item.title}". You earned ${points} pts!`);
    }
    fire();
  }, [updateTask, addLog, fire]);

  const openRoutineLogDialog = useCallback((action: 'complete' | 'stop') => { setState(prev => ({...prev, routineLogDialog: {isOpen: true, action}})); }, []);
  const closeRoutineLogDialog = useCallback(() => { setState(prev => ({ ...prev, routineLogDialog: {isOpen: false, action: null} })); }, []);
  const addRoutine = useCallback((routine: Omit<Routine, 'id' | 'shortId'>) => {
  const tempId = `temp_${crypto.randomUUID()}`;
  const newRoutine: Routine = { ...routine, id: tempId, shortId: generateShortId('R'), description: routine.description || '', priority: routine.priority || 'medium' };

  // Optimistic UI update
  setStateAndDerive(prev => {
    const updated = [...prev.routines, newRoutine].sort((a, b) => a.startTime.localeCompare(b.startTime));
    return {routines: updated};
  });

  const persistRoutine = async () => {
    try {
      const response = await safeApiFetch(remoteApiPaths.routinesCollection(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoutine),
      });
      const savedRoutine = await parseJsonResponse<Routine>(response);

      setStateAndDerive(prev => {
        const updated = prev.routines.map(r => (r.id === tempId ? savedRoutine : r)).sort((a, b) => a.startTime.localeCompare(b.startTime));
        localStorage.setItem(ROUTINES_KEY, JSON.stringify(updated));
        addLog('ROUTINE_ADD', {routineId: savedRoutine.id, title: savedRoutine.title});
        return {routines: updated};
      });
    } catch (error) {
      console.error("Failed to add routine, will be synced in background", error);
      setStateAndDerive(prev => {
        localStorage.setItem(ROUTINES_KEY, JSON.stringify(prev.routines));
        addLog('ROUTINE_ADD_OFFLINE', {routineId: tempId, title: newRoutine.title});
        return {};
      });
    }
  };

  void persistRoutine();
}, [addLog, setStateAndDerive]);
  const updateRoutine = useCallback(async (updatedRoutine: Routine) => {
  const originalRoutines = state.routines;

  // Optimistic UI update
  setStateAndDerive(prev => {
    const updated = prev.routines.map(r => (r.id === updatedRoutine.id ? updatedRoutine : r)).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return {routines: updated};
  });

  try {
    const response = await safeApiFetch(remoteApiPaths.routine(updatedRoutine.id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRoutine),
    });
    const savedRoutine = await parseJsonResponse<Routine>(response);

    setStateAndDerive(prev => {
      const updated = prev.routines.map(r => (r.id === savedRoutine.id ? savedRoutine : r)).sort((a, b) => a.startTime.localeCompare(b.startTime));
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(updated));
      addLog('ROUTINE_UPDATE', {routineId: savedRoutine.id, title: savedRoutine.title});
      return {routines: updated};
    });
  } catch (error) {
    console.error("Failed to update routine, will be synced in background", error);
    setStateAndDerive(() => {
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(originalRoutines));
      addLog('ROUTINE_UPDATE_OFFLINE', {routineId: updatedRoutine.id, title: updatedRoutine.title});
      return {routines: originalRoutines};
    });
  }
}, [state.routines, addLog, setStateAndDerive]);
  const deleteRoutine = useCallback(async (routineId: string) => {
  const originalRoutines = state.routines;
  
  // Optimistic UI update
  setStateAndDerive(prev => {
    const updated = prev.routines.filter(r => r.id !== routineId);
    return {routines: updated};
  });
  
  try {
    const response = await safeApiFetch(remoteApiPaths.routine(routineId), { method: 'DELETE' });
    await ensureSuccessfulResponse(response);

    setStateAndDerive(prev => {
      const updated = prev.routines.filter(r => r.id !== routineId);
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(updated));
      addLog('ROUTINE_DELETE', {routineId});
      return {routines: updated};
    });
  } catch (error) {
    console.error("Failed to delete routine, will be synced in background", error);
    setStateAndDerive(() => {
      const routineToDelete = originalRoutines.find(r => r.id === routineId);
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(originalRoutines));
      if(routineToDelete) addLog('ROUTINE_DELETE_OFFLINE', {routineId, title: routineToDelete.title});
      return {routines: originalRoutines};
    });
  }
}, [state.routines, addLog, setStateAndDerive]);
  const addBadge = useCallback((badgeData: Omit<Badge, 'id'>) => { const newBadge: Badge = { ...badgeData, id: `custom_${crypto.randomUUID()}` }; setStateAndDerive(prev => { const newAllBadges = [...prev.allBadges, newBadge]; const customBadges = newAllBadges.filter(b => b.isCustom); localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(customBadges)); return {allBadges: newAllBadges}; }); }, [setStateAndDerive]);
  const updateBadge = useCallback((updatedBadge: Badge) => { setStateAndDerive(prev => { const newAllBadges = prev.allBadges.map(b => b.id === updatedBadge.id ? updatedBadge : b); if (updatedBadge.isCustom) { const customBadges = newAllBadges.filter(b => b.isCustom); localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(customBadges)); } else { const systemBadges = newAllBadges.filter(b => !b.isCustom); localStorage.setItem(SYSTEM_BADGES_CONFIG_KEY, JSON.stringify(systemBadges)); } return {allBadges: newAllBadges}; }); }, [setStateAndDerive]);
  const deleteBadge = useCallback((badgeId: string) => { setStateAndDerive(prev => { const updatedAllBadges = prev.allBadges.filter(b => b.id !== badgeId); const updatedEarned = new Map(prev.earnedBadges); if (updatedEarned.has(badgeId)) updatedEarned.delete(badgeId); const customBadges = updatedAllBadges.filter(b => b.isCustom); localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(customBadges)); localStorage.setItem(EARNED_BADGES_KEY, JSON.stringify(Array.from(updatedEarned.entries()))); return { allBadges: updatedAllBadges, earnedBadges: updatedEarned }; }); }, [setStateAndDerive]);
  const updateProfile = useCallback((newProfileData: Partial<UserProfile>) => { setStateAndDerive(prev => { const newProfile = {...prev.profile, ...newProfileData}; localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile)); return {profile: newProfile}; }); }, [setStateAndDerive]);
  const setSoundSettings = useCallback((newSettings: Partial<SoundSettings>) => { setStateAndDerive(prev => { const updatedSettings = {...prev.soundSettings, ...newSettings}; localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(updatedSettings)); return {soundSettings: updatedSettings}; }); }, [setStateAndDerive]);
  const toggleMute = useCallback(() => setState(prev => ({...prev, isMuted: !prev.isMuted})), []);
  const todaysActivity = useMemo(() => {
    if (!state.isLoaded) return [];
    const activity: ActivityFeedItem[] = [];
    const activityLogs = state.todaysLogs.filter( log => log.type === 'TIMER_SESSION_COMPLETE' || log.type === 'ROUTINE_SESSION_COMPLETE' || (log.type === 'TIMER_STOP' && log.payload.reason) );
    for (const log of activityLogs) {
      if (log.type === 'TIMER_SESSION_COMPLETE') { const task = state.tasks.find(t => t.id === log.payload.taskId); if (task) activity.push({ type: 'TASK_COMPLETE', data: {task, log}, timestamp: log.timestamp }); }
      else if (log.type === 'ROUTINE_SESSION_COMPLETE') { activity.push({ type: 'ROUTINE_COMPLETE', data: log, timestamp: log.timestamp }); }
      else if (log.type === 'TIMER_STOP') { activity.push({type: 'TASK_STOPPED', data: log, timestamp: log.timestamp}); }
    }
    activity.sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());
    return activity;
  }, [state.isLoaded, state.todaysLogs, state.tasks]);

  const contextValue = useMemo(
    () => ({
      state: {...state, todaysActivity},
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
    }),
    [
      state,
      todaysActivity,
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
      updateLog
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















