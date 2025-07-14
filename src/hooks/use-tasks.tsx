
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
import {type StudyTask, type Routine} from '@/lib/types';
import {addDays, format} from 'date-fns';
import {useLogger} from './use-logger.tsx';
import {useConfetti} from '@/components/providers/confetti-provider';
import {useToast} from './use-toast';

// --- Timer Types and Helpers ---
type ActiveTimerItem =
  | {type: 'task'; item: StudyTask}
  | {type: 'routine'; item: Routine};

type StoredTimer = {
  item: ActiveTimerItem;
  endTime?: number; // For countdown
  startTime?: number; // For stopwatch
  isPaused: boolean;
  pausedTime: number; // For countdown, stores remaining seconds. For stopwatch, stores timestamp of pause.
  pausedDuration: number; // For stopwatch, stores total elapsed ms when paused
  overtimeNotified?: boolean;
};

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

const sendTimerEndNotification = (task: StudyTask) => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      const notification = new Notification(`Time's up for "${task.title}"!`, {
        body: "You're now in overtime. This time will still be counted as productive!",
        tag: `study-timer-end-${task.id}`,
      });
      notification.onclick = () => window.focus();
    }
  }
};

const TASKS_KEY = 'studySentinelTasks';
const TIMER_KEY = 'studySentinelActiveTimer_v2';

// --- Context Setup ---
interface TasksContextType {
  tasks: StudyTask[];
  isLoaded: boolean;
  addTask: (task: Omit<StudyTask, 'id' | 'status'>) => void;
  updateTask: (updatedTask: StudyTask) => void;
  archiveTask: (taskId: string) => void;
  unarchiveTask: (taskId: string) => void;
  pushTaskToNextDay: (taskId: string) => void;
  activeItem: ActiveTimerItem | null;
  timeDisplay: string;
  isPaused: boolean;
  isOvertime: boolean;
  startTimer: (item: StudyTask | Routine) => void;
  togglePause: () => void;
  completeTimer: () => void;
  stopTimer: (reason: string) => void;
  // Derived state for dashboard
  todaysCompletedTasks: StudyTask[];
  todaysPendingTasks: StudyTask[];
}

const TasksContext = createContext<TasksContextType | null>(null);

// --- Provider Component ---
export function TasksProvider({children}: {children: ReactNode}) {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const {addLog, isLoaded: loggerLoaded} = useLogger();
  const {fire} = useConfetti();
  const {toast} = useToast();

  const [activeTimer, setActiveTimer] = useState<StoredTimer | null>(null);
  const [timeDisplay, setTimeDisplay] = useState('00:00');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(
        'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
      );
      audioRef.current.volume = 0.5;
    }
  }, []);

  const saveTimer = useCallback((timer: StoredTimer | null) => {
    setActiveTimer(timer);
    if (timer) {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    } else {
      localStorage.removeItem(TIMER_KEY);
    }
  }, []);

  useEffect(() => {
    if (!loggerLoaded) return;
    setIsLoaded(false);
    try {
      const savedTasks = localStorage.getItem(TASKS_KEY);
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }

      const savedTimer = localStorage.getItem(TIMER_KEY);
      if (savedTimer) {
        setActiveTimer(JSON.parse(savedTimer));
      }
    } catch (error) {
      console.error('Failed to load data from localStorage', error);
      localStorage.removeItem(TASKS_KEY);
      localStorage.removeItem(TIMER_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, [loggerLoaded]);

  const saveTasks = useCallback((tasksToSave: StudyTask[]) => {
    const sortedTasks = [...tasksToSave].sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
    );
    localStorage.setItem(TASKS_KEY, JSON.stringify(sortedTasks));
    setTasks(sortedTasks);
  }, []);

  const addTask = useCallback(
    (task: Omit<StudyTask, 'id' | 'status'>) => {
      setTasks(currentTasks => {
        const newTask: StudyTask = {
          ...task,
          id: crypto.randomUUID(),
          status: 'todo',
          description: task.description || '',
        };
        const updatedTasks = [...currentTasks, newTask];
        const sortedTasks = [...updatedTasks].sort(
          (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );
        localStorage.setItem(TASKS_KEY, JSON.stringify(sortedTasks));
        addLog('TASK_ADD', {taskId: newTask.id, title: newTask.title});
        return sortedTasks;
      });
    },
    [addLog]
  );

  const updateTask = useCallback(
    (updatedTask: StudyTask) => {
      let oldStatus: StudyTask['status'] | undefined;
      setTasks(currentTasks => {
        const taskExists = currentTasks.find(t => t.id === updatedTask.id);
        if (taskExists) {
          oldStatus = taskExists.status;
        }
        const newTasks = currentTasks.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        );
        const sortedTasks = [...newTasks].sort(
          (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );
        localStorage.setItem(TASKS_KEY, JSON.stringify(sortedTasks));

        if (oldStatus && oldStatus !== updatedTask.status) {
          switch (updatedTask.status) {
            case 'completed':
              addLog('TASK_COMPLETE', {
                taskId: updatedTask.id,
                title: updatedTask.title,
                points: updatedTask.points,
              });
              break;
            case 'in_progress':
              addLog('TASK_IN_PROGRESS', {
                taskId: updatedTask.id,
                title: updatedTask.title,
              });
              break;
            case 'todo':
              addLog('TASK_UPDATE', {
                taskId: updatedTask.id,
                title: updatedTask.title,
                newStatus: 'todo',
              });
              break;
          }
        } else {
          addLog('TASK_UPDATE', {
            taskId: updatedTask.id,
            title: updatedTask.title,
          });
        }
        return sortedTasks;
      });
    },
    [addLog]
  );

  const archiveTask = useCallback(
    (taskId: string) => {
      setTasks(prevTasks => {
        let taskToArchive: StudyTask | undefined;
        const newTasks = prevTasks.map(task => {
          if (task.id === taskId) {
            taskToArchive = task;
            return {...task, status: 'archived'};
          }
          return task;
        });

        if (taskToArchive) {
          addLog('TASK_ARCHIVE', {taskId, title: taskToArchive.title});
          localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks));
        }
        return newTasks;
      });
    },
    [addLog]
  );

  const unarchiveTask = useCallback(
    (taskId: string) => {
      setTasks(prevTasks => {
        let taskToUnarchive: StudyTask | undefined;
        const newTasks = prevTasks.map(task => {
          if (task.id === taskId) {
            taskToUnarchive = task;
            return {...task, status: 'todo'};
          }
          return task;
        });

        if (taskToUnarchive) {
          addLog('TASK_UNARCHIVE', {taskId, title: taskToUnarchive.title});
          localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks));
        }
        return newTasks;
      });
    },
    [addLog]
  );

  const pushTaskToNextDay = useCallback(
    (taskId: string) => {
      setTasks(prevTasks => {
        let pushedTask: StudyTask | undefined;
        const newTasks = prevTasks.map(task => {
          if (task.id === taskId) {
            const taskDate = new Date(`${task.date}T00:00:00`);
            const nextDay = addDays(taskDate, 1);
            pushedTask = task;
            return {...task, date: format(nextDay, 'yyyy-MM-dd')};
          }
          return task;
        });

        if (pushedTask) {
          addLog('TASK_PUSH_NEXT_DAY', {taskId, title: pushedTask.title});
          localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks));
        }
        return newTasks;
      });
    },
    [addLog]
  );

  const startTimer = useCallback(
    (item: StudyTask | Routine) => {
      if (activeTimer) {
        toast({
          title: 'Timer Already Active',
          description: `Please stop or complete the timer for "${activeTimer.item.item.title}" first.`,
          variant: 'destructive',
        });
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
        timerData.pausedTime = task.duration * 60;
        addLog('TIMER_START', {taskId: task.id, taskTitle: task.title});
        updateTask({...task, status: 'in_progress'});
      } else {
        const routine = item as Routine;
        timerData.startTime = Date.now();
        addLog('TIMER_START', {
          routineId: routine.id,
          routineTitle: routine.title,
        });
      }
      saveTimer(timerData);
    },
    [activeTimer, toast, addLog, updateTask, saveTimer]
  );

  const togglePause = useCallback(() => {
    setActiveTimer(currentTimer => {
      if (!currentTimer) return null;

      let newTimerState = {...currentTimer};
      const logPayload =
        newTimerState.item.type === 'task'
          ? {
              taskId: newTimerState.item.item.id,
              taskTitle: newTimerState.item.item.title,
            }
          : {
              routineId: newTimerState.item.item.id,
              routineTitle: newTimerState.item.item.title,
            };

      if (newTimerState.isPaused) {
        newTimerState.isPaused = false;
        if (
          newTimerState.item.type === 'task' &&
          newTimerState.pausedTime > 0
        ) {
          newTimerState.endTime = Date.now() + newTimerState.pausedTime * 1000;
        } else if (
          newTimerState.item.type === 'routine' &&
          newTimerState.pausedTime &&
          newTimerState.startTime
        ) {
          const pauseDuration = Date.now() - newTimerState.pausedTime;
          newTimerState.startTime = newTimerState.startTime + pauseDuration;
        }
        addLog('TIMER_START', {...logPayload, resumed: true});
      } else {
        newTimerState.isPaused = true;
        if (newTimerState.item.type === 'task' && newTimerState.endTime) {
          newTimerState.pausedTime = Math.max(
            0,
            Math.round((newTimerState.endTime - Date.now()) / 1000)
          );
        } else if (newTimerState.item.type === 'routine') {
          if (newTimerState.startTime) {
            const elapsed = Date.now() - newTimerState.startTime;
            newTimerState.pausedDuration = elapsed;
          }
          newTimerState.pausedTime = Date.now();
        }
        addLog('TIMER_PAUSE', logPayload);
      }

      saveTimer(newTimerState);
      return newTimerState;
    });
  }, [addLog, saveTimer]);

  const stopTimer = useCallback(
    (reason: string) => {
      if (!activeTimer) return;
      if (activeTimer.item.type === 'task') {
        const originalDuration = activeTimer.item.item.duration * 60;
        const timeRemaining = activeTimer.isPaused
          ? activeTimer.pausedTime
          : activeTimer.endTime
          ? Math.round((activeTimer.endTime - Date.now()) / 1000)
          : 0;
        const timeSpent = originalDuration - timeRemaining;
        addLog('TIMER_STOP', {
          taskId: activeTimer.item.item.id,
          taskTitle: activeTimer.item.item.title,
          reason,
          timeSpentSeconds: Math.max(0, Math.round(timeSpent)),
        });
        updateTask({...activeTimer.item.item, status: 'todo'});
      } else {
        let finalDurationMs;
        if (activeTimer.isPaused) {
          finalDurationMs = activeTimer.pausedDuration;
        } else if (activeTimer.startTime) {
          finalDurationMs = Date.now() - activeTimer.startTime;
        } else {
          finalDurationMs = 0;
        }
        const durationInSeconds = Math.round(finalDurationMs / 1000);
        addLog('TIMER_STOP', {
          routineId: activeTimer.item.item.id,
          routineTitle: activeTimer.item.item.title,
          reason,
          timeSpentSeconds: durationInSeconds,
        });
      }
      saveTimer(null);
    },
    [activeTimer, addLog, updateTask, saveTimer]
  );

  const completeTimer = useCallback(() => {
    if (!activeTimer) return;
    const {item} = activeTimer;

    if (item.type === 'task') {
      const overtimeElapsed =
        activeTimer.isPaused ||
        !activeTimer.endTime ||
        activeTimer.endTime > Date.now()
          ? 0
          : Math.round((Date.now() - activeTimer.endTime) / 1000);

      const totalDurationSecs = item.item.duration * 60 + overtimeElapsed;

      addLog('TIMER_SESSION_COMPLETE', {
        taskId: item.item.id,
        title: item.item.title,
        duration: totalDurationSecs,
        points: item.item.points,
      });
      updateTask({...item.item, status: 'completed'});
      fire();
      toast({
        title: 'Task Completed!',
        description: `You've earned ${item.item.points} points!`,
      });
    } else {
      let finalDurationMs;
      if (activeTimer.isPaused) {
        finalDurationMs = activeTimer.pausedDuration;
      } else if (activeTimer.startTime) {
        finalDurationMs = Date.now() - activeTimer.startTime;
      } else {
        finalDurationMs = 0;
      }

      const durationInSeconds = Math.round(finalDurationMs / 1000);
      const durationInMinutes = Math.floor(durationInSeconds / 60);
      const points = Math.floor(durationInMinutes / 10);

      addLog('ROUTINE_SESSION_COMPLETE', {
        routineId: item.item.id,
        title: item.item.title,
        duration: durationInSeconds,
        points,
      });
      fire();
      toast({
        title: 'Routine Completed!',
        description: `You logged ${formatTime(
          durationInSeconds
        )} and earned ${points} points.`,
      });
    }
    saveTimer(null);
  }, [activeTimer, addLog, updateTask, fire, toast, saveTimer]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!activeTimer || activeTimer.isPaused) {
        return;
      }

      if (activeTimer.item.type === 'task') {
        if (!activeTimer.endTime) return;
        const remaining = Math.round((activeTimer.endTime - Date.now()) / 1000);
        setTimeDisplay(formatTime(remaining));
        setIsOvertime(remaining < 0);
      } else {
        if (!activeTimer.startTime) return;
        const elapsed = Date.now() - activeTimer.startTime;
        setTimeDisplay(formatTime(Math.round(elapsed / 1000)));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Effect to handle overtime notification side-effect
  useEffect(() => {
    if (
      isOvertime &&
      activeTimer &&
      activeTimer.item.type === 'task' &&
      !activeTimer.overtimeNotified
    ) {
      const task = activeTimer.item.item as StudyTask;
      sendTimerEndNotification(task);
      audioRef.current?.play().catch(e => console.error('Audio error:', e));
      addLog('TIMER_OVERTIME_STARTED', {
        taskId: task.id,
        taskTitle: task.title,
      });
      // Mark as notified to prevent re-triggering
      saveTimer({...activeTimer, overtimeNotified: true});
    }
  }, [isOvertime, activeTimer, addLog, saveTimer]);

  // Derived state for the dashboard
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todaysCompletedTasks = useMemo(
    () =>
      tasks.filter(t => t.status === 'completed' && t.date === todayStr),
    [tasks, todayStr]
  );
  const todaysPendingTasks = useMemo(
    () =>
      tasks.filter(
        t =>
          t.date === todayStr &&
          (t.status === 'todo' || t.status === 'in_progress')
      ),
    [tasks, todayStr]
  );

  const value: TasksContextType = {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    archiveTask,
    unarchiveTask,
    pushTaskToNextDay,
    activeItem: activeTimer?.item ?? null,
    timeDisplay,
    isPaused: activeTimer?.isPaused ?? true,
    isOvertime,
    startTimer,
    togglePause,
    completeTimer,
    stopTimer,
    todaysCompletedTasks,
    todaysPendingTasks,
  };

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};
