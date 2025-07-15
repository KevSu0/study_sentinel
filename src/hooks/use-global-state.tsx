
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
} from '@/lib/types';
import {addDays, format, formatISO, subDays, parseISO} from 'date-fns';
import {useConfetti} from '@/components/providers/confetti-provider';
import toast from 'react-hot-toast';
import {SYSTEM_BADGES, checkBadge} from '@/lib/badges';

// --- Constants for localStorage keys ---
const TASKS_KEY = 'studySentinelTasks_v3';
const TIMER_KEY = 'studySentinelActiveTimer_v3';
const EARNED_BADGES_KEY = 'studySentinelEarnedBadges_v3';
const CUSTOM_BADGES_KEY = 'studySentinelCustomBadges_v3';
const SYSTEM_BADGES_CONFIG_KEY = 'studySentinelSystemBadgesConfig_v3';
const PROFILE_KEY = 'studySentinelProfile_v3';
const ROUTINES_KEY = 'studySentinelRoutines_v3';
const LOG_PREFIX = 'studySentinelLogs_v3_';

// --- Type Definitions ---
type StoredTimer = {
  item: ActiveTimerItem;
  endTime?: number;
  startTime?: number;
  isPaused: boolean;
  pausedTime: number;
  pausedDuration: number;
  overtimeNotified?: boolean;
};

// Represents any item that can appear in the "Today's Activity" feed
export type ActivityFeedItem = {
  type: 'TASK_COMPLETE' | 'ROUTINE_COMPLETE' | 'TASK_STOPPED';
  data: any;
  timestamp: string; // ISO string for consistent sorting
};

type RoutineLogDialogState = {
  isOpen: boolean;
  action: 'complete' | 'stop' | null;
};

interface AppState {
  isLoaded: boolean;
  tasks: StudyTask[];
  logs: LogEvent[];
  profile: UserProfile;
  routines: Routine[];
  allBadges: Badge[];
  earnedBadges: Map<string, string>; // badgeId -> date string 'yyyy-MM-dd'
  activeItem: ActiveTimerItem | null;
  timeDisplay: string;
  isPaused: boolean;
  isOvertime: boolean;
  routineLogDialog: RoutineLogDialogState;
  // --- Derived state ---
  todaysLogs: LogEvent[];
  previousDayLogs: LogEvent[];
  allCompletedWork: CompletedWork[];
  todaysCompletedWork: CompletedWork[];
  todaysPoints: number;
  todaysBadges: Badge[];
  todaysActivity: ActivityFeedItem[];
}

interface GlobalStateContextType {
  state: AppState;
  addTask: (task: Omit<StudyTask, 'id' | 'status'>) => void;
  updateTask: (updatedTask: StudyTask) => void;
  archiveTask: (taskId: string) => void;
  unarchiveTask: (taskId: string) => void;
  pushTaskToNextDay: (taskId: string) => void;
  startTimer: (item: StudyTask | Routine) => void;
  togglePause: () => void;
  completeTimer: (studyLog?: string) => void;
  stopTimer: (reason: string, studyLog?: string) => void;
  addRoutine: (routine: Omit<Routine, 'id'>) => void;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (routineId: string) => void;
  addBadge: (badge: Omit<Badge, 'id'>) => void;
  updateBadge: (badge: Badge) => void;
  deleteBadge: (badgeId: string) => void;
  updateProfile: (newProfileData: Partial<UserProfile>) => void;
  openRoutineLogDialog: (action: 'complete' | 'stop') => void;
  closeRoutineLogDialog: () => void;
}

const defaultProfile: UserProfile = {
  name: '',
  email: '',
  phone: '',
  passion: '',
  dream: '',
  education: '',
  reasonForUsing: '',
};

const initialAppState: AppState = {
  isLoaded: false,
  tasks: [],
  logs: [],
  profile: defaultProfile,
  routines: [],
  allBadges: [],
  earnedBadges: new Map(),
  activeItem: null,
  timeDisplay: '00:00',
  isPaused: true,
  isOvertime: false,
  routineLogDialog: {isOpen: false, action: null},
  // Derived state starts empty
  todaysLogs: [],
  previousDayLogs: [],
  allCompletedWork: [],
  todaysCompletedWork: [],
  todaysPoints: 0,
  todaysBadges: [],
  todaysActivity: [],
};

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(
  undefined
);

// --- Helper Functions ---
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

const getSessionDate = () => {
  const now = new Date();
  if (now.getHours() < 4) return subDays(now, 1);
  return now;
};

// --- Provider Component ---
export function GlobalStateProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<AppState>(initialAppState);
  const {fire} = useConfetti();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Main Hydration and State Derivation Effect (CLIENT-SIDE ONLY) ---
  useEffect(() => {
    // This effect runs only once on the client to load all data from localStorage.
    let savedTasks: StudyTask[] = [];
    let savedProfile: UserProfile = defaultProfile;
    let savedRoutines: Routine[] = [];
    let savedEarnedBadges = new Map<string, string>();
    let savedCustomBadges: Badge[] = [];
    let systemBadgeConfigs: Badge[] | null = null;
    let savedTimer: StoredTimer | null = null;

    try {
      savedTasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
      savedProfile = JSON.parse(
        localStorage.getItem(PROFILE_KEY) || JSON.stringify(defaultProfile)
      );
      savedRoutines = JSON.parse(localStorage.getItem(ROUTINES_KEY) || '[]');
      savedEarnedBadges = new Map<string, string>(
        JSON.parse(localStorage.getItem(EARNED_BADGES_KEY) || '[]')
      );
      savedCustomBadges = JSON.parse(
        localStorage.getItem(CUSTOM_BADGES_KEY) || '[]'
      );
      systemBadgeConfigs = JSON.parse(
        localStorage.getItem(SYSTEM_BADGES_CONFIG_KEY) || 'null'
      );
      savedTimer = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null');
    } catch (error) {
      console.error('Failed to load state from localStorage', error);
      // Clean up potentially corrupted keys
      localStorage.removeItem(TASKS_KEY);
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(ROUTINES_KEY);
      localStorage.removeItem(EARNED_BADGES_KEY);
      localStorage.removeItem(CUSTOM_BADGES_KEY);
      localStorage.removeItem(SYSTEM_BADGES_CONFIG_KEY);
      localStorage.removeItem(TIMER_KEY);
    }

    const systemBadges =
      systemBadgeConfigs ||
      SYSTEM_BADGES.map((b, i) => ({
        ...b,
        id: `system_${i + 1}`,
        isCustom: false,
        isEnabled: true,
      }));

    if (!systemBadgeConfigs) {
      localStorage.setItem(
        SYSTEM_BADGES_CONFIG_KEY,
        JSON.stringify(systemBadges)
      );
    }

    const allBadges = [...systemBadges, ...savedCustomBadges];

    // --- LOGS ---
    const sessionDate = getSessionDate();
    const todayStr = format(sessionDate, 'yyyy-MM-dd');
    const prevDayStr = format(subDays(sessionDate, 1), 'yyyy-MM-dd');

    const logKey = `${LOG_PREFIX}${todayStr}`;
    const todaysLogs: LogEvent[] = JSON.parse(
      localStorage.getItem(logKey) || '[]'
    );
    const prevLogKey = `${LOG_PREFIX}${prevDayStr}`;
    const previousDayLogs: LogEvent[] = JSON.parse(
      localStorage.getItem(prevLogKey) || '[]'
    );

    const baseState = {
      tasks: savedTasks,
      routines: savedRoutines,
      profile: savedProfile,
      logs: todaysLogs,
      allBadges,
      earnedBadges: savedEarnedBadges,
    };

    const derivedState = updateDerivedState(baseState);

    // --- Set final hydrated state ---
    setState({
      ...initialAppState,
      ...baseState,
      isLoaded: true,
      previousDayLogs,
      activeItem: savedTimer?.item || null,
      isPaused: savedTimer?.isPaused ?? true,
      ...derivedState,
    });

    // Initialize audio element
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(
        'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
      );
      audioRef.current.volume = 0.5;
    }
  }, []);

  const updateDerivedState = (baseState: {
    tasks: StudyTask[];
    routines: Routine[];
    profile: UserProfile;
    logs: LogEvent[];
    allBadges: Badge[];
    earnedBadges: Map<string, string>;
  }) => {
    const {tasks, routines, logs, allBadges, earnedBadges} = baseState;

    const sessionDate = getSessionDate();
    const todayStr = format(sessionDate, 'yyyy-MM-dd');

    const todaysLogs = logs; // Assuming logs passed in are already today's logs

    const allTimeLogs: LogEvent[] = [];
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOG_PREFIX)) {
          allTimeLogs.push(...JSON.parse(localStorage.getItem(key) || '[]'));
        }
      }
    }
    allTimeLogs.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // --- Completed Work Calculation ---
    const sessionLogs = allTimeLogs.filter(
      l =>
        l.type === 'ROUTINE_SESSION_COMPLETE' ||
        l.type === 'TIMER_SESSION_COMPLETE'
    );
    const workItems: CompletedWork[] = sessionLogs.map(l => ({
      date: l.timestamp.split('T')[0],
      duration: l.payload.duration, // duration is in seconds
      type: l.type === 'ROUTINE_SESSION_COMPLETE' ? 'routine' : 'task',
      title: l.payload.title,
      points: l.payload.points || 0,
      priority: l.payload.priority,
      subjectId: l.payload.routineId || l.payload.taskId,
      timestamp: l.timestamp,
    }));

    const allCompletedWork = workItems;
    const todaysCompletedWork = allCompletedWork.filter(w => w.date === todayStr);
    const todaysPoints = todaysCompletedWork.reduce(
      (sum, work) => sum + work.points,
      0
    );

    const todaysBadges = allBadges.filter(
      b => earnedBadges.get(b.id) === todayStr
    );

    const activity: ActivityFeedItem[] = [];

    // Get all completed/stopped logs for today
    const activityLogs = todaysLogs.filter(
      log =>
        log.type === 'TIMER_SESSION_COMPLETE' ||
        log.type === 'ROUTINE_SESSION_COMPLETE' ||
        (log.type === 'TIMER_STOP' && log.payload.reason)
    );

    for (const log of activityLogs) {
      if (log.type === 'TIMER_SESSION_COMPLETE') {
        const task = tasks.find(t => t.id === log.payload.taskId);
        if (task) {
          activity.push({
            type: 'TASK_COMPLETE',
            data: {task, log},
            timestamp: log.timestamp,
          });
        }
      } else if (log.type === 'ROUTINE_SESSION_COMPLETE') {
        activity.push({
          type: 'ROUTINE_COMPLETE',
          data: log,
          timestamp: log.timestamp,
        });
      } else if (log.type === 'TIMER_STOP') {
        activity.push({type: 'TASK_STOPPED', data: log, timestamp: log.timestamp});
      }
    }

    // Add manually completed tasks (not from timer)
    const timedTaskIds = new Set(
      activityLogs.map(l => l.payload.taskId).filter(Boolean)
    );
    const manuallyCompletedLogs = todaysLogs.filter(
      log => log.type === 'TASK_COMPLETE' && !timedTaskIds.has(log.payload.taskId)
    );

    for (const log of manuallyCompletedLogs) {
      const task = tasks.find(t => t.id === log.payload.taskId);
      if (task) {
        // Fake a log object for consistency
        const fakeSessionLog = {
          payload: {duration: task.duration * 60, points: task.points},
        };
        activity.push({
          type: 'TASK_COMPLETE',
          data: {task, log: fakeSessionLog},
          timestamp: log.timestamp,
        });
      }
    }

    activity.sort((a, b) => {
      return parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime();
    });

    const todaysActivity = activity;

    return {
      todaysLogs,
      allCompletedWork,
      todaysCompletedWork,
      todaysPoints,
      todaysBadges,
      todaysActivity,
    };
  };

  const setStateAndDerive = (
    updater: (prevState: AppState) => Partial<AppState>
  ) => {
    setState(prevState => {
      const changes = updater(prevState);
      const newState = {...prevState, ...changes};
      const derived = updateDerivedState(newState);
      return {...newState, ...derived};
    });
  };

  const addLog = useCallback(
    (type: LogEvent['type'], payload: LogEvent['payload']) => {
      setStateAndDerive(prevState => {
        const newLog: LogEvent = {
          id: crypto.randomUUID(),
          timestamp: formatISO(new Date()),
          type,
          payload,
        };
        const updatedLogs = [...prevState.logs, newLog];
        const logKey = `${LOG_PREFIX}${format(getSessionDate(), 'yyyy-MM-dd')}`;
        localStorage.setItem(logKey, JSON.stringify(updatedLogs));
        return {logs: updatedLogs};
      });
    },
    []
  );

  // --- TIMER EFFECT ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.activeItem || state.isPaused) return;

      const savedTimer: StoredTimer | null = JSON.parse(
        localStorage.getItem(TIMER_KEY) || 'null'
      );
      if (!savedTimer) return;

      let newDisplay: string;
      let newOvertime = false;

      if (savedTimer.item.type === 'task') {
        if (!savedTimer.endTime) return;
        const remaining = Math.round((savedTimer.endTime - Date.now()) / 1000);
        newDisplay = formatTime(remaining);
        newOvertime = remaining < 0;
      } else {
        if (!savedTimer.startTime) return;
        const elapsed =
          Date.now() - savedTimer.startTime + (savedTimer.pausedDuration || 0);
        newDisplay = formatTime(Math.round(elapsed / 1000));
      }

      setState(prev => ({
        ...prev,
        timeDisplay: newDisplay,
        isOvertime: newOvertime,
      }));

      if (newOvertime && !savedTimer.overtimeNotified) {
        if (
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification(
            `Time's up for "${savedTimer.item.item.title}"!`,
            {body: "You're now in overtime."}
          );
        }
        audioRef.current?.play().catch(console.error);
        addLog('TIMER_OVERTIME_STARTED', {
          taskId: savedTimer.item.item.id,
          taskTitle: savedTimer.item.item.title,
        });
        localStorage.setItem(
          TIMER_KEY,
          JSON.stringify({...savedTimer, overtimeNotified: true})
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state.activeItem, state.isPaused, addLog]);

  // --- BADGE AWARDING EFFECT ---
  useEffect(() => {
    if (!state.isLoaded) return;

    const {allBadges, earnedBadges, tasks} = state;

    const newlyEarnedBadges: Badge[] = [];
    for (const badge of allBadges) {
      if (!earnedBadges.has(badge.id) && badge.isEnabled) {
        const allTimeLogs: LogEvent[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(LOG_PREFIX)) {
            allTimeLogs.push(...JSON.parse(localStorage.getItem(key) || '[]'));
          }
        }
        if (checkBadge(badge, {tasks, logs: allTimeLogs})) {
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

  // --- Public API ---
  const addTask = useCallback(
    (task: Omit<StudyTask, 'id' | 'status'>) => {
      const newTask: StudyTask = {
        ...task,
        id: crypto.randomUUID(),
        status: 'todo',
        description: task.description || '',
      };
      setStateAndDerive(prev => {
        const updatedTasks = [...prev.tasks, newTask].sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );
        localStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
        addLog('TASK_ADD', {taskId: newTask.id, title: newTask.title});
        return {tasks: updatedTasks};
      });
    },
    [addLog]
  );

  const updateTask = useCallback(
    (updatedTask: StudyTask) => {
      setStateAndDerive(prev => {
        let oldStatus: TaskStatus | undefined;
        let isCompletion = false;

        const newTasks = prev.tasks.map(task => {
          if (task.id === updatedTask.id) {
            oldStatus = task.status;
            isCompletion =
              oldStatus !== 'completed' && updatedTask.status === 'completed';
            return updatedTask;
          }
          return task;
        });

        if (oldStatus && oldStatus !== updatedTask.status) {
          addLog('TASK_UPDATE', {
            taskId: updatedTask.id,
            title: updatedTask.title,
            newStatus: updatedTask.status,
          });
        }
        if (isCompletion) {
          addLog('TASK_COMPLETE', {
            taskId: updatedTask.id,
            title: updatedTask.title,
            points: updatedTask.points,
            timestamp: formatISO(new Date()),
          });
        }

        const sortedTasks = newTasks.sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );
        localStorage.setItem(TASKS_KEY, JSON.stringify(sortedTasks));
        return {tasks: sortedTasks};
      });
    },
    [addLog]
  );

  const archiveTask = useCallback(
    (taskId: string) => {
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
    },
    [addLog]
  );

  const unarchiveTask = useCallback(
    (taskId: string) => {
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
    },
    [addLog]
  );

  const pushTaskToNextDay = useCallback(
    (taskId: string) => {
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
    },
    [addLog]
  );

  const startTimer = useCallback(
    (item: StudyTask | Routine) => {
      if (state.activeItem) {
        toast.error(`Please stop or complete the timer for "${state.activeItem.item.title}" first.`);
        return;
      }

      const type = 'duration' in item ? 'task' : 'routine';
      const timerData: StoredTimer = {
        item: {type, item},
        isPaused: false,
        pausedTime: 0,
        pausedDuration: 0,
      };

      if (type === 'task') {
        const task = item as StudyTask;
        timerData.endTime = Date.now() + task.duration * 60 * 1000;
        addLog('TIMER_START', {taskId: task.id, taskTitle: task.title});
        updateTask({...task, status: 'in_progress'});
      } else {
        timerData.startTime = Date.now();
        addLog('TIMER_START', {
          routineId: item.id,
          routineTitle: item.title,
        });
      }
      localStorage.setItem(TIMER_KEY, JSON.stringify(timerData));
      setState(prev => ({...prev, activeItem: timerData.item, isPaused: false}));
    },
    [state.activeItem, addLog, updateTask]
  );

  const togglePause = useCallback(() => {
    const savedTimerJSON = localStorage.getItem(TIMER_KEY);
    if (!savedTimerJSON) return;
    const savedTimer: StoredTimer = JSON.parse(savedTimerJSON);

    const isNowPaused = !savedTimer.isPaused;
    let newTimerState = {...savedTimer, isPaused: isNowPaused};

    if (isNowPaused) {
      // Pausing
      if (newTimerState.item.type === 'task' && newTimerState.endTime) {
        newTimerState.pausedTime = Math.max(
          0,
          newTimerState.endTime - Date.now()
        );
      } else if (
        newTimerState.item.type === 'routine' &&
        newTimerState.startTime
      ) {
        newTimerState.pausedDuration += Date.now() - newTimerState.startTime;
      }
      addLog('TIMER_PAUSE', {title: savedTimer.item.item.title});
    } else {
      // Resuming
      if (newTimerState.item.type === 'task' && newTimerState.pausedTime > 0) {
        newTimerState.endTime = Date.now() + newTimerState.pausedTime;
      } else if (newTimerState.item.type === 'routine') {
        newTimerState.startTime = Date.now();
      }
      addLog('TIMER_START', {title: savedTimer.item.item.title, resumed: true});
    }

    localStorage.setItem(TIMER_KEY, JSON.stringify(newTimerState));
    setState(prev => ({...prev, isPaused: isNowPaused}));
  }, [addLog]);

  const stopTimer = useCallback(
    (reason: string, studyLog: string = '') => {
      const savedTimerJSON = localStorage.getItem(TIMER_KEY);
      if (!savedTimerJSON) return;
      const savedTimer: StoredTimer = JSON.parse(savedTimerJSON);

      const {item} = savedTimer;
      let durationInSeconds = 0;
      if (item.type === 'task') {
        const originalDuration = item.item.duration * 60 * 1000;
        const timeRemaining = savedTimer.isPaused
          ? savedTimer.pausedTime
          : savedTimer.endTime
          ? savedTimer.endTime - Date.now()
          : 0;
        durationInSeconds = Math.round(
          (originalDuration - timeRemaining) / 1000
        );
        updateTask({...item.item, status: 'todo'});
        addLog('TIMER_STOP', {
          title: item.item.title,
          reason,
          timeSpentSeconds: Math.max(0, durationInSeconds),
        });
      } else {
        // Routine
        const elapsed = savedTimer.isPaused
          ? savedTimer.pausedDuration
          : savedTimer.startTime
          ? Date.now() - savedTimer.startTime + savedTimer.pausedDuration
          : 0;
        durationInSeconds = Math.round(elapsed / 1000);
        const points = Math.floor(durationInSeconds / 60 / 10); // Same as complete for partial credit
        addLog('ROUTINE_SESSION_COMPLETE', {
          routineId: item.item.id,
          title: item.item.title,
          duration: durationInSeconds,
          points,
          studyLog,
          stopped: true,
        });
      }

      localStorage.removeItem(TIMER_KEY);
      setStateAndDerive(prev => ({
        activeItem: null,
        isPaused: true,
        isOvertime: false,
        timeDisplay: '00:00',
      }));
    },
    [updateTask, addLog]
  );

  const completeTimer = useCallback(
    (studyLog: string = '') => {
      const savedTimerJSON = localStorage.getItem(TIMER_KEY);
      if (!savedTimerJSON) return;
      const savedTimer: StoredTimer = JSON.parse(savedTimerJSON);
      const {item} = savedTimer;

      if (item.type === 'task') {
        const overtimeElapsed =
          savedTimer.isPaused ||
          !savedTimer.endTime ||
          savedTimer.endTime > Date.now()
            ? 0
            : Math.round((Date.now() - savedTimer.endTime) / 1000);
        const totalDurationSecs = item.item.duration * 60 + overtimeElapsed;

        updateTask({...item.item, status: 'completed' as const});
        addLog('TIMER_SESSION_COMPLETE', {
          taskId: item.item.id,
          title: item.item.title,
          duration: totalDurationSecs,
          points: item.item.points,
          priority: item.item.priority,
        });

        fire();
        toast.success(`Task Completed! You've earned ${item.item.points} points!`);
      } else {
        // Routine
        const elapsed = savedTimer.isPaused
          ? savedTimer.pausedDuration
          : savedTimer.startTime
          ? Date.now() - savedTimer.startTime + savedTimer.pausedDuration
          : 0;
        const durationInSeconds = Math.round(elapsed / 1000);
        const points = Math.floor(durationInSeconds / 60 / 10);
        addLog('ROUTINE_SESSION_COMPLETE', {
          routineId: item.item.id,
          title: item.item.title,
          duration: durationInSeconds,
          points,
          studyLog,
        });
        fire();
        toast.success(`You logged ${formatTime(
            durationInSeconds
          )} and earned ${points} points.`);
      }
      localStorage.removeItem(TIMER_KEY);
      setStateAndDerive(prev => ({
        activeItem: null,
        isPaused: true,
        isOvertime: false,
        timeDisplay: '00:00',
      }));
    },
    [updateTask, addLog, fire]
  );

  const openRoutineLogDialog = useCallback((action: 'complete' | 'stop') => {
    setState(prev => ({...prev, routineLogDialog: {isOpen: true, action}}));
  }, []);

  const closeRoutineLogDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      routineLogDialog: {isOpen: false, action: null},
    }));
  }, []);

  const addRoutine = useCallback((routine: Omit<Routine, 'id'>) => {
    const newRoutine: Routine = {
      ...routine,
      id: crypto.randomUUID(),
      description: routine.description || '',
    };
    setStateAndDerive(prev => {
      const updated = [...prev.routines, newRoutine].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(updated));
      return {routines: updated};
    });
  }, []);

  const updateRoutine = useCallback((routine: Routine) => {
    setStateAndDerive(prev => {
      const updated = prev.routines
        .map(r => (r.id === routine.id ? routine : r))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(updated));
      return {routines: updated};
    });
  }, []);

  const deleteRoutine = useCallback((routineId: string) => {
    setStateAndDerive(prev => {
      const updated = prev.routines
        .filter(r => r.id !== routineId)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(updated));
      return {routines: updated};
    });
  }, []);

  const addBadge = useCallback((badgeData: Omit<Badge, 'id'>) => {
    const newBadge: Badge = {
      ...badgeData,
      id: `custom_${crypto.randomUUID()}`,
    };
    setStateAndDerive(prev => {
      const newAllBadges = [...prev.allBadges, newBadge];
      const customBadges = newAllBadges.filter(b => b.isCustom);
      localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(customBadges));
      return {allBadges: newAllBadges};
    });
  }, []);

  const updateBadge = useCallback((updatedBadge: Badge) => {
    setStateAndDerive(prev => {
      const newAllBadges = prev.allBadges.map(b =>
        b.id === updatedBadge.id ? updatedBadge : b
      );
      if (updatedBadge.isCustom) {
        const customBadges = newAllBadges.filter(b => b.isCustom);
        localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(customBadges));
      } else {
        const systemBadges = newAllBadges.filter(b => !b.isCustom);
        localStorage.setItem(
          SYSTEM_BADGES_CONFIG_KEY,
          JSON.stringify(systemBadges)
        );
      }
      return {allBadges: newAllBadges};
    });
  }, []);

  const deleteBadge = useCallback((badgeId: string) => {
    setStateAndDerive(prev => {
      const updatedAllBadges = prev.allBadges.filter(b => b.id !== badgeId);
      const updatedEarned = new Map(prev.earnedBadges);
      if (updatedEarned.has(badgeId)) {
        updatedEarned.delete(badgeId);
      }
      const customBadges = updatedAllBadges.filter(b => b.isCustom);
      localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(customBadges));
      localStorage.setItem(
        EARNED_BADGES_KEY,
        JSON.stringify(Array.from(updatedEarned.entries()))
      );
      return {
        allBadges: updatedAllBadges,
        earnedBadges: updatedEarned,
      };
    });
  }, []);

  const updateProfile = useCallback((newProfileData: Partial<UserProfile>) => {
    setStateAndDerive(prev => {
      const newProfile = {...prev.profile, ...newProfileData};
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      return {profile: newProfile};
    });
  }, []);

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
      addRoutine,
      updateRoutine,
      deleteRoutine,
      addBadge,
      updateBadge,
      deleteBadge,
      updateProfile,
      openRoutineLogDialog,
      closeRoutineLogDialog,
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
      addRoutine,
      updateRoutine,
      deleteRoutine,
      addBadge,
      updateBadge,
      deleteBadge,
      updateProfile,
      openRoutineLogDialog,
      closeRoutineLogDialog,
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
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};
