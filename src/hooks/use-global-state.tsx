
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
} from '@/lib/types';
import {addDays, format, formatISO, subDays, parseISO} from 'date-fns';
import {useConfetti} from '@/components/providers/confetti-provider';
import {useToast} from './use-toast';
import {SYSTEM_BADGES, checkBadge} from '@/lib/badges';

// --- Constants for localStorage keys ---
const TASKS_KEY = 'studySentinelTasks';
const TIMER_KEY = 'studySentinelActiveTimer_v2';
const EARNED_BADGES_KEY = 'studySentinelEarnedBadges_v3';
const CUSTOM_BADGES_KEY = 'studySentinelCustomBadges_v1';
const SYSTEM_BADGES_CONFIG_KEY = 'studySentinelSystemBadgesConfig_v1';
const PROFILE_KEY = 'studySentinelProfile';
const ROUTINES_KEY = 'studySentinelRoutines';
const LOG_PREFIX = 'studySentinelLogs_';

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

interface AppState {
  isLoaded: boolean;
  tasks: StudyTask[];
  logs: LogEvent[];
  profile: UserProfile;
  routines: Routine[];
  allBadges: Badge[];
  earnedBadges: Map<string, string>;
  activeItem: ActiveTimerItem | null;
  timeDisplay: string;
  isPaused: boolean;
  isOvertime: boolean;
  // Derived state
  todaysLogs: LogEvent[];
  previousDayLogs: LogEvent[];
  allCompletedWork: CompletedWork[];
  todaysBadges: Badge[];
  todaysRoutines: Routine[];
  todaysCompletedRoutines: LogEvent[];
  todaysCompletedTasks: StudyTask[];
  todaysPendingTasks: StudyTask[];
}

interface GlobalStateContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  // Actions
  addTask: (task: Omit<StudyTask, 'id' | 'status'>) => void;
  updateTask: (updatedTask: StudyTask) => void;
  archiveTask: (taskId: string) => void;
  unarchiveTask: (taskId: string) => void;
  pushTaskToNextDay: (taskId: string) => void;
  startTimer: (item: StudyTask | Routine) => void;
  togglePause: () => void;
  completeTimer: () => void;
  stopTimer: (reason: string) => void;
  addLog: (type: LogEvent['type'], payload: LogEvent['payload']) => void;
  addRoutine: (routine: Omit<Routine, 'id'>) => void;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (routineId: string) => void;
  addBadge: (badge: Omit<Badge, 'id'>) => void;
  updateBadge: (badge: Badge) => void;
  deleteBadge: (badgeId: string) => void;
  updateProfile: (newProfileData: Partial<UserProfile>) => void;
}

const GlobalStateContext = createContext<GlobalStateContextType | null>(null);

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

const getLogKeyForDate = (date: Date) =>
  `${LOG_PREFIX}${date.toISOString().split('T')[0]}`;

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
  todaysLogs: [],
  previousDayLogs: [],
  allCompletedWork: [],
  todaysBadges: [],
  todaysRoutines: [],
  todaysCompletedRoutines: [],
  todaysCompletedTasks: [],
  todaysPendingTasks: [],
};

// --- Provider Component ---
export function GlobalStateProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<AppState>(initialAppState);
  const {fire} = useConfetti();
  const {toast} = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Utility Functions for State Updates ---
  const saveToStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save to localStorage key ${key}`, error);
    }
  }, []);

  const saveMapToStorage = useCallback((key: string, map: Map<any, any>) => {
    saveToStorage(key, Array.from(map.entries()));
  }, [saveToStorage]);

  // --- Core Actions ---
  const addLog = useCallback(
    (type: LogEvent['type'], payload: LogEvent['payload']) => {
      setState(prevState => {
        const newLog: LogEvent = {
          id: crypto.randomUUID(),
          timestamp: formatISO(new Date()),
          type,
          payload,
        };
        const updatedLogs = [...prevState.logs, newLog];
        saveToStorage(getLogKeyForDate(getSessionDate()), updatedLogs);
        return {...prevState, logs: updatedLogs};
      });
    },
    [saveToStorage]
  );

  const updateProfile = useCallback(
    (newProfileData: Partial<UserProfile>) => {
      setState(prevState => {
        const updatedProfile = {...prevState.profile, ...newProfileData};
        saveToStorage(PROFILE_KEY, updatedProfile);
        return {...prevState, profile: updatedProfile};
      });
    },
    [saveToStorage]
  );

  const updateTask = useCallback(
    (updatedTask: StudyTask) => {
      setState(prevState => {
        let oldStatus: StudyTask['status'] | undefined;
        const newTasks = prevState.tasks.map(task => {
          if (task.id === updatedTask.id) {
            oldStatus = task.status;
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
          if (updatedTask.status === 'completed') {
            addLog('TASK_COMPLETE', {
              taskId: updatedTask.id,
              title: updatedTask.title,
              points: updatedTask.points,
            });
          }
        }
        const sortedTasks = [...newTasks].sort(
          (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );
        saveToStorage(TASKS_KEY, sortedTasks);
        return {...prevState, tasks: sortedTasks};
      });
    },
    [addLog, saveToStorage]
  );

  const startTimer = useCallback(
    (item: StudyTask | Routine) => {
      setState(prevState => {
        if (prevState.activeItem) {
          toast({
            title: 'Timer Already Active',
            description: `Please stop or complete the timer for "${prevState.activeItem.item.title}" first.`,
            variant: 'destructive',
          });
          return prevState;
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
          timerData.pausedTime = task.duration * 60;
          addLog('TIMER_START', {taskId: task.id, taskTitle: task.title});
          updateTask({...task, status: 'in_progress'});
        } else {
          timerData.startTime = Date.now();
          addLog('TIMER_START', {
            routineId: item.id,
            routineTitle: item.title,
          });
        }
        saveToStorage(TIMER_KEY, timerData);
        return {...prevState, activeItem: timerData.item, isPaused: false};
      });
    },
    [addLog, updateTask, saveToStorage, toast]
  );

  // --- Initial Load Effect (CLIENT-SIDE ONLY) ---
  useEffect(() => {
    // This effect runs only once on mount to load and derive all state.
    const savedTasksJSON = localStorage.getItem(TASKS_KEY);
    const savedProfileJSON = localStorage.getItem(PROFILE_KEY);
    const savedRoutinesJSON = localStorage.getItem(ROUTINES_KEY);
    const savedEarnedBadgesJSON = localStorage.getItem(EARNED_BADGES_KEY);
    const savedCustomBadgesJSON = localStorage.getItem(CUSTOM_BADGES_KEY);
    const systemBadgeConfigsJSON = localStorage.getItem(SYSTEM_BADGES_CONFIG_KEY);
    const savedTimerJSON = localStorage.getItem(TIMER_KEY);
    const sessionDate = getSessionDate();
    const logKey = getLogKeyForDate(sessionDate);
    const savedLogsJSON = localStorage.getItem(logKey);

    const tasks = savedTasksJSON ? JSON.parse(savedTasksJSON) : [];
    const profile = savedProfileJSON ? JSON.parse(savedProfileJSON) : defaultProfile;
    const routines = savedRoutinesJSON ? JSON.parse(savedRoutinesJSON) : [];
    const earnedBadges = savedEarnedBadgesJSON
      ? new Map(JSON.parse(savedEarnedBadgesJSON))
      : new Map();
    const customBadges = savedCustomBadgesJSON ? JSON.parse(savedCustomBadgesJSON) : [];
    let systemBadges;
    if (systemBadgeConfigsJSON) {
      systemBadges = JSON.parse(systemBadgeConfigsJSON);
    } else {
      systemBadges = SYSTEM_BADGES.map((b, i) => ({
        ...b,
        id: `system_${i + 1}`,
        isCustom: false,
        isEnabled: true,
      }));
      saveToStorage(SYSTEM_BADGES_CONFIG_KEY, systemBadges);
    }
    const activeTimer: StoredTimer | null = savedTimerJSON ? JSON.parse(savedTimerJSON) : null;
    const logs = savedLogsJSON ? JSON.parse(savedLogsJSON) : [];

    // --- Start Deriving State (client-only) ---
    const todayStr = format(sessionDate, 'yyyy-MM-dd');
    const todaysLogs = logs.filter((l: LogEvent) => l.timestamp.startsWith(todayStr));

    const previousDay = subDays(sessionDate, 1);
    const prevLogKey = getLogKeyForDate(previousDay);
    const prevLogsJSON = localStorage.getItem(prevLogKey);
    const previousDayLogs = prevLogsJSON ? JSON.parse(prevLogsJSON) : [];
    
    // Calculate all completed work
    const allTimeLogs: LogEvent[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOG_PREFIX)) {
            const lsLogs = localStorage.getItem(key);
            if (lsLogs) allTimeLogs.push(...JSON.parse(lsLogs));
        }
    }
    allTimeLogs.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const sessionLogs = allTimeLogs.filter(l => l.type === 'ROUTINE_SESSION_COMPLETE' || l.type === 'TIMER_SESSION_COMPLETE');
    const timedTaskIds = new Set(sessionLogs.map(l => l.payload.taskId).filter(Boolean));
    const workItems: CompletedWork[] = sessionLogs.map(l => ({
        date: l.timestamp.split('T')[0],
        duration: Math.round(l.payload.duration / 60),
        type: l.type === 'ROUTINE_SESSION_COMPLETE' ? 'routine' : 'task',
        title: l.payload.title,
        points: l.payload.points || 0,
        priority: l.payload.priority,
    }));
    const manuallyCompletedTasks = tasks.filter((t: StudyTask) => t.status === 'completed' && !timedTaskIds.has(t.id));
    workItems.push(...manuallyCompletedTasks.map((t: StudyTask) => ({
        date: t.date,
        duration: t.duration,
        type: 'task',
        title: t.title,
        points: t.points,
        priority: t.priority,
    })));

    const allBadges = [...systemBadges, ...customBadges];
    const todaysBadges = allBadges.filter((b: Badge) => earnedBadges.get(b.id) === todayStr);
    const todaysRoutines = routines.filter((r: Routine) => r.days.includes(sessionDate.getDay()));
    const todaysCompletedRoutines = todaysLogs.filter((l: LogEvent) => l.type === 'ROUTINE_SESSION_COMPLETE');
    const todaysCompletedTasks = tasks.filter((t: StudyTask) => t.status === 'completed' && t.date === todayStr);
    const todaysPendingTasks = tasks.filter((t: StudyTask) => t.date === todayStr && (t.status === 'todo' || t.status === 'in_progress'));

    setState({
      isLoaded: true,
      tasks,
      profile,
      routines,
      earnedBadges,
      allBadges,
      logs,
      previousDayLogs,
      activeItem: activeTimer?.item ?? null,
      isPaused: activeTimer?.isPaused ?? true,
      timeDisplay: '00:00',
      isOvertime: false,
      // Derived state
      todaysLogs,
      allCompletedWork: workItems,
      todaysBadges,
      todaysRoutines,
      todaysCompletedRoutines,
      todaysCompletedTasks,
      todaysPendingTasks,
    });

    audioRef.current = new Audio(
      'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
    );
    audioRef.current.volume = 0.5;
  }, [saveToStorage]);

  // --- Timer Logic Effect ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.activeItem || state.isPaused) return;

      setState(prevState => {
        if (!prevState.activeItem) return prevState;
        const savedTimer: StoredTimer | null = JSON.parse(
          localStorage.getItem(TIMER_KEY) || 'null'
        );
        if (!savedTimer) return prevState;

        let newDisplay = prevState.timeDisplay;
        let newOvertime = prevState.isOvertime;

        if (savedTimer.item.type === 'task') {
          if (!savedTimer.endTime) return prevState;
          const remaining = Math.round(
            (savedTimer.endTime - Date.now()) / 1000
          );
          newDisplay = formatTime(remaining);
          newOvertime = remaining < 0;
        } else {
          if (!savedTimer.startTime) return prevState;
          const elapsed = Date.now() - savedTimer.startTime;
          newDisplay = formatTime(Math.round(elapsed / 1000));
        }

        if (
          newDisplay !== prevState.timeDisplay ||
          newOvertime !== prevState.isOvertime
        ) {
          return {...prevState, timeDisplay: newDisplay, isOvertime: newOvertime};
        }
        return prevState;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.activeItem, state.isPaused]);

  // --- Overtime Notification Effect ---
  useEffect(() => {
    if (
      state.isOvertime &&
      state.activeItem?.type === 'task'
    ) {
      const savedTimer: StoredTimer | null = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null');
      if (savedTimer && !savedTimer.overtimeNotified) {
         if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`Time's up for "${state.activeItem.item.title}"!`, { body: "You're now in overtime." });
         }
         audioRef.current?.play().catch(console.error);
         addLog('TIMER_OVERTIME_STARTED', { taskId: state.activeItem.item.id, taskTitle: state.activeItem.item.title });
         saveToStorage(TIMER_KEY, {...savedTimer, overtimeNotified: true});
      }
    }
  }, [state.isOvertime, state.activeItem, addLog, saveToStorage]);

  // --- Badge Awarding Effect ---
  useEffect(() => {
    if (!state.isLoaded) return;
    
    const allTimeLogs: LogEvent[] = [];
     for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOG_PREFIX)) {
            const lsLogs = localStorage.getItem(key);
            if (lsLogs) allTimeLogs.push(...JSON.parse(lsLogs));
        }
    }
    allTimeLogs.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const newlyEarnedBadges: Badge[] = [];
    for (const badge of state.allBadges) {
        if (!state.earnedBadges.has(badge.id)) {
            if(checkBadge(badge, {tasks: state.tasks, logs: allTimeLogs})) {
                newlyEarnedBadges.push(badge);
            }
        }
    }

    if (newlyEarnedBadges.length > 0) {
        fire();
        setState(prevState => {
            const newEarnedMap = new Map(prevState.earnedBadges);
            newlyEarnedBadges.forEach(badge => {
                newEarnedMap.set(badge.id, format(new Date(), 'yyyy-MM-dd'));
                setTimeout(() => {
                    toast({
                        title: `Badge Unlocked: ${badge.name}! 🎉`,
                        description: badge.motivationalMessage,
                    });
                }, 500);
            });
            saveMapToStorage(EARNED_BADGES_KEY, newEarnedMap);
            return {...prevState, earnedBadges: newEarnedMap};
        });
    }

  }, [state.isLoaded, state.tasks, state.logs, state.allBadges, fire, toast, saveMapToStorage]);

  // --- Public API ---
  const contextValue = useMemo(() => {
    const addTask = (task: Omit<StudyTask, 'id' | 'status'>) => {
        setState(prevState => {
            const newTask: StudyTask = {...task, id: crypto.randomUUID(), status: 'todo', description: task.description || ''};
            const updatedTasks = [...prevState.tasks, newTask];
            const sortedTasks = [...updatedTasks].sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
            saveToStorage(TASKS_KEY, sortedTasks);
            addLog('TASK_ADD', {taskId: newTask.id, title: newTask.title});
            return {...prevState, tasks: sortedTasks};
        });
    };
    
    const archiveTask = (taskId: string) => {
        setState(prevState => {
            let changedTask: StudyTask | undefined;
            const newTasks = prevState.tasks.map(t => {
                if (t.id === taskId) {
                    changedTask = t;
                    return {...t, status: 'archived'};
                }
                return t;
            });
            if (changedTask) {
                addLog('TASK_ARCHIVE', {taskId, title: changedTask.title});
                saveToStorage(TASKS_KEY, newTasks);
                return {...prevState, tasks: newTasks};
            }
            return prevState;
        });
    };
    
    const unarchiveTask = (taskId: string) => {
        setState(prevState => {
            let changedTask: StudyTask | undefined;
            const newTasks = prevState.tasks.map(t => {
                if (t.id === taskId) {
                    changedTask = t;
                    return {...t, status: 'todo'};
                }
                return t;
            });
            if (changedTask) {
                addLog('TASK_UNARCHIVE', {taskId, title: changedTask.title});
                saveToStorage(TASKS_KEY, newTasks);
                return {...prevState, tasks: newTasks};
            }
            return prevState;
        });
    };
    
    const pushTaskToNextDay = (taskId: string) => {
        setState(prevState => {
            let pushedTask: StudyTask | undefined;
            const newTasks = prevState.tasks.map(t => {
                if (t.id === taskId) {
                    const taskDate = parseISO(t.date);
                    pushedTask = t;
                    return {...t, date: format(addDays(taskDate, 1), 'yyyy-MM-dd')};
                }
                return t;
            });
            if (pushedTask) {
                addLog('TASK_PUSH_NEXT_DAY', {taskId, title: pushedTask.title});
                saveToStorage(TASKS_KEY, newTasks);
                return {...prevState, tasks: newTasks};
            }
            return prevState;
        });
    };
    
    const togglePause = () => {
        const savedTimer: StoredTimer | null = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null');
        if (!savedTimer) return;
        
        const isPaused = !savedTimer.isPaused;
        let newTimerState = {...savedTimer, isPaused};
        
        if (isPaused) { // Pausing
            if (newTimerState.item.type === 'task' && newTimerState.endTime) {
                newTimerState.pausedTime = Math.max(0, Math.round((newTimerState.endTime - Date.now()) / 1000));
            } else if (newTimerState.item.type === 'routine' && newTimerState.startTime) {
                 newTimerState.pausedDuration += Date.now() - newTimerState.startTime;
                 newTimerState.pausedTime = Date.now();
            }
             addLog('TIMER_PAUSE', {title: savedTimer.item.item.title});
        } else { // Resuming
            if (newTimerState.item.type === 'task' && newTimerState.pausedTime > 0) {
                 newTimerState.endTime = Date.now() + newTimerState.pausedTime * 1000;
            } else if (newTimerState.item.type === 'routine' && newTimerState.pausedTime) {
                 newTimerState.startTime = Date.now();
            }
            addLog('TIMER_START', {title: savedTimer.item.item.title, resumed: true});
        }
        
        saveToStorage(TIMER_KEY, newTimerState);
        setState(prev => ({...prev, isPaused}));
    };

    const stopTimer = (reason: string) => {
        const savedTimer: StoredTimer | null = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null');
        if (!savedTimer) return;
        
        const {item} = savedTimer;
        let durationInSeconds = 0;
        if(item.type === 'task') {
            const originalDuration = item.item.duration * 60;
            const timeRemaining = savedTimer.isPaused ? savedTimer.pausedTime : savedTimer.endTime ? Math.round((savedTimer.endTime - Date.now())/1000) : 0;
            durationInSeconds = originalDuration - timeRemaining;
            updateTask({...item.item, status: 'todo'});
        } else {
             durationInSeconds = savedTimer.isPaused ? Math.round(savedTimer.pausedDuration / 1000) : savedTimer.startTime ? Math.round((Date.now() - savedTimer.startTime + savedTimer.pausedDuration) / 1000) : 0;
        }

        addLog('TIMER_STOP', {title: item.item.title, reason, timeSpentSeconds: Math.max(0, durationInSeconds)});
        localStorage.removeItem(TIMER_KEY);
        setState(prev => ({...prev, activeItem: null, isPaused: true, isOvertime: false, timeDisplay: '00:00'}));
    };

    const completeTimer = () => {
        const savedTimer: StoredTimer | null = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null');
        if (!savedTimer) return;
        const {item} = savedTimer;

        if (item.type === 'task') {
             const overtimeElapsed = (savedTimer.isPaused || !savedTimer.endTime || savedTimer.endTime > Date.now()) ? 0 : Math.round((Date.now() - savedTimer.endTime) / 1000);
             const totalDurationSecs = item.item.duration * 60 + overtimeElapsed;
             addLog('TIMER_SESSION_COMPLETE', {taskId: item.item.id, title: item.item.title, duration: totalDurationSecs, points: item.item.points});
             updateTask({...item.item, status: 'completed'});
             fire();
             toast({title: 'Task Completed!', description: `You've earned ${item.item.points} points!`});
        } else {
            const durationInSeconds = savedTimer.isPaused ? Math.round(savedTimer.pausedDuration / 1000) : savedTimer.startTime ? Math.round((Date.now() - savedTimer.startTime + savedTimer.pausedDuration) / 1000) : 0;
            const points = Math.floor(durationInSeconds / 60 / 10);
            addLog('ROUTINE_SESSION_COMPLETE', {routineId: item.item.id, title: item.item.title, duration: durationInSeconds, points});
            fire();
            toast({title: 'Routine Completed!', description: `You logged ${formatTime(durationInSeconds)} and earned ${points} points.`});
        }
        localStorage.removeItem(TIMER_KEY);
        setState(prev => ({...prev, activeItem: null, isPaused: true, isOvertime: false, timeDisplay: '00:00'}));
    };
    
    const addRoutine = (routine: Omit<Routine, 'id'>) => {
        setState(prevState => {
            const newRoutine: Routine = {...routine, id: crypto.randomUUID(), description: routine.description || ''};
            const updatedRoutines = [...prevState.routines, newRoutine];
            const sorted = [...updatedRoutines].sort((a,b) => a.startTime.localeCompare(b.startTime));
            saveToStorage(ROUTINES_KEY, sorted);
            return {...prevState, routines: sorted};
        });
    };

    const updateRoutine = (routine: Routine) => {
        setState(prevState => {
            const newRoutines = prevState.routines.map(r => r.id === routine.id ? routine : r);
            const sorted = [...newRoutines].sort((a,b) => a.startTime.localeCompare(b.startTime));
            saveToStorage(ROUTINES_KEY, sorted);
            return {...prevState, routines: sorted};
        });
    };
    
    const deleteRoutine = (routineId: string) => {
        setState(prevState => {
            const newRoutines = prevState.routines.filter(r => r.id !== routineId);
            const sorted = [...newRoutines].sort((a,b) => a.startTime.localeCompare(b.startTime));
            saveToStorage(ROUTINES_KEY, sorted);
            return {...prevState, routines: sorted};
        });
    };
    
    const addBadge = (badgeData: Omit<Badge, 'id'>) => {
        const newBadge: Badge = {...badgeData, id: `custom_${crypto.randomUUID()}`};
        setState(prevState => {
            const updatedBadges = [...prevState.allBadges, newBadge];
            saveToStorage(CUSTOM_BADGES_KEY, updatedBadges.filter(b => b.isCustom));
            return {...prevState, allBadges: updatedBadges};
        });
    };
    
    const updateBadge = (updatedBadge: Badge) => {
        setState(prevState => {
            const updatedAllBadges = prevState.allBadges.map(b => b.id === updatedBadge.id ? updatedBadge : b);
            if (updatedBadge.isCustom) {
                saveToStorage(CUSTOM_BADGES_KEY, updatedAllBadges.filter(b => b.isCustom));
            } else {
                saveToStorage(SYSTEM_BADGES_CONFIG_KEY, updatedAllBadges.filter(b => !b.isCustom));
            }
            return {...prevState, allBadges: updatedAllBadges};
        });
    };
    
    const deleteBadge = (badgeId: string) => {
        setState(prevState => {
            const updatedAllBadges = prevState.allBadges.filter(b => b.id !== badgeId);
            const updatedEarned = new Map(prevState.earnedBadges);
            if (updatedEarned.has(badgeId)) {
                updatedEarned.delete(badgeId);
                saveMapToStorage(EARNED_BADGES_KEY, updatedEarned);
            }
            saveToStorage(CUSTOM_BADGES_KEY, updatedAllBadges.filter(b => b.isCustom));
            return {...prevState, allBadges: updatedAllBadges, earnedBadges: updatedEarned};
        });
    };

    return {
      state: state,
      setState,
      addTask,
      updateTask,
      archiveTask,
      unarchiveTask,
      pushTaskToNextDay,
      startTimer,
      togglePause,
      completeTimer,
      stopTimer,
      addLog,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      addBadge,
      updateBadge,
      deleteBadge,
      updateProfile,
    };
  }, [state, addLog, updateTask, fire, toast, saveMapToStorage, saveToStorage, updateProfile]);

  return (
    <GlobalStateContext.Provider value={contextValue}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};
