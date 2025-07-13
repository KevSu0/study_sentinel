
'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import {type StudyTask, type Routine} from '@/lib/types';
import {addDays, format} from 'date-fns';
import {useLogger} from './use-logger';
import {useConfetti} from '@/components/providers/confetti-provider';
import {useToast} from './use-toast';

const TASKS_KEY = 'studySentinelTasks';
const TIMER_KEY = 'studySentinelActiveTimer_v2';

// --- Timer Types and Helpers ---
type ActiveTimerItem =
  | {type: 'task'; item: StudyTask}
  | {type: 'routine'; item: Routine};

type StoredTimer = {
  item: ActiveTimerItem;
  endTime?: number; // For countdown
  startTime?: number; // For stopwatch
  isPaused: boolean;
  pausedTime: number; // For countdown
  pausedDuration: number; // For stopwatch
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


// --- Context Setup ---
interface TasksContextType {
  // Task state
  tasks: StudyTask[];
  isLoaded: boolean;
  // Task actions
  addTask: (task: Omit<StudyTask, 'id' | 'status'>) => void;
  updateTask: (updatedTask: StudyTask) => void;
  archiveTask: (taskId: string) => void;
  unarchiveTask: (taskId: string) => void;
  pushTaskToNextDay: (taskId: string) => void;
  // Timer state
  activeItem: ActiveTimerItem | null;
  timeDisplay: string;
  isPaused: boolean;
  isOvertime: boolean;
  // Timer actions
  startTimer: (item: StudyTask | Routine) => void;
  togglePause: () => void;
  completeTimer: () => void;
  stopTimer: (reason: string) => void;
}

const TasksContext = createContext<TasksContextType | null>(null);

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};


// --- Provider Component ---
export function TasksProvider({children}: {children: ReactNode}) {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const {addLog} = useLogger();
  const {fire} = useConfetti();
  const {toast} = useToast();

  const [activeTimer, setActiveTimer] = useState<StoredTimer | null>(null);
  const [timeDisplay, setTimeDisplay] = useState('00:00');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
      audioRef.current.volume = 0.5;
    }
  }, []);

  const saveTasks = (tasks: StudyTask[]) => {
    const sortedTasks = [...tasks].sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
    );
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(sortedTasks));
    } catch (error) {
      console.error('Failed to save tasks to localStorage', error);
    }
    return sortedTasks;
  };

  const saveTimer = (timer: StoredTimer | null) => {
    setActiveTimer(timer);
    if (timer) {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    } else {
      localStorage.removeItem(TIMER_KEY);
    }
  };
  
  // Load tasks and timer from localStorage on initial mount
  useEffect(() => {
    setIsLoaded(false);
    try {
      const savedTasks = localStorage.getItem(TASKS_KEY);
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      
      const savedTimer = localStorage.getItem(TIMER_KEY);
      if (savedTimer) setActiveTimer(JSON.parse(savedTimer));
    } catch (error) {
      console.error('Failed to load data from localStorage', error);
      localStorage.removeItem(TASKS_KEY);
      localStorage.removeItem(TIMER_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // --- Task Actions ---
  const addTask = useCallback((task: Omit<StudyTask, 'id' | 'status'>) => {
    const newTask: StudyTask = {
      ...task,
      id: crypto.randomUUID(),
      status: 'todo',
      description: task.description || '',
    };
    setTasks(prevTasks => {
      const updatedTasks = [...prevTasks, newTask];
      addLog('TASK_ADD', {taskId: newTask.id, title: newTask.title});
      return saveTasks(updatedTasks);
    });
  }, [addLog]);

  const updateTask = useCallback((updatedTask: StudyTask) => {
      let oldTask: StudyTask | undefined;
      setTasks(prevTasks => {
        oldTask = prevTasks.find(t => t.id === updatedTask.id);
        const newTasks = prevTasks.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        );
        return saveTasks(newTasks);
      });

      if (oldTask && oldTask.status !== updatedTask.status) {
        if (updatedTask.status === 'completed') {
          addLog('TASK_COMPLETE', {
            taskId: updatedTask.id,
            title: updatedTask.title,
            points: updatedTask.points
          });
        } else if (updatedTask.status === 'in_progress') {
          addLog('TASK_IN_PROGRESS', {
            taskId: updatedTask.id,
            title: updatedTask.title,
          });
        }
      } else {
        addLog('TASK_UPDATE', {
          taskId: updatedTask.id,
          title: updatedTask.title,
        });
      }
    }, [addLog]
  );
  
  const archiveTask = useCallback((taskId: string) => {
    let taskTitle = '';
    setTasks(prevTasks => {
      const taskToArchive = prevTasks.find(t => t.id === taskId);
      if (taskToArchive) taskTitle = taskToArchive.title;
      const newTasks = prevTasks.map(task =>
        task.id === taskId ? {...task, status: 'archived'} : task
      );
      return saveTasks(newTasks);
    });
    addLog('TASK_ARCHIVE', {taskId, title: taskTitle});
  }, [addLog]);

  const unarchiveTask = useCallback((taskId: string) => {
    let taskTitle = '';
    setTasks(prevTasks => {
      const taskToUnarchive = prevTasks.find(t => t.id === taskId);
      if (taskToUnarchive) taskTitle = taskToUnarchive.title;
      const newTasks = prevTasks.map(task =>
        task.id === taskId ? {...task, status: 'todo'} : task
      );
      return saveTasks(newTasks);
    });
    addLog('TASK_UNARCHIVE', {taskId, title: taskTitle});
  }, [addLog]);

  const pushTaskToNextDay = useCallback((taskId: string) => {
    let taskTitle = '';
    setTasks(prevTasks => {
      const newTasks = prevTasks.map(task => {
        if (task.id === taskId) {
          if (!taskTitle) taskTitle = task.title;
          const taskDate = new Date(`${task.date}T00:00:00`);
          const nextDay = addDays(taskDate, 1);
          return {...task, date: format(nextDay, 'yyyy-MM-dd')};
        }
        return task;
      });
      return saveTasks(newTasks);
    });
    addLog('TASK_PUSH_NEXT_DAY', {taskId, title: taskTitle});
  }, [addLog]);
  
  // --- Timer Actions ---
  const startTimer = useCallback((item: StudyTask | Routine) => {
    if(activeTimer) {
      toast({
        title: 'Timer Already Active',
        description: `Please stop or complete the timer for "${activeTimer.item.item.title}" first.`,
        variant: 'destructive',
      });
      return;
    }
      const type = 'duration' in item ? 'task' : 'routine';
      const timerData: StoredTimer = {
          item: { type, item },
          isPaused: false,
          pausedTime: 0,
          pausedDuration: 0,
      };

      if (type === 'task') {
          timerData.endTime = Date.now() + item.duration * 60 * 1000;
          timerData.pausedTime = item.duration * 60;
          addLog('TIMER_START', { taskId: item.id, taskTitle: item.title });
          updateTask({...item, status: 'in_progress'});
      } else {
          timerData.startTime = Date.now();
          addLog('TIMER_START', { routineId: item.id, routineTitle: item.title });
      }

      saveTimer(timerData);
  }, [addLog, activeTimer, toast, updateTask]);

  const togglePause = useCallback(() => {
    if (!activeTimer) return;
    
    let newTimerState = { ...activeTimer };
    const logPayload = newTimerState.item.type === 'task' 
      ? { taskId: newTimerState.item.item.id, taskTitle: newTimerState.item.item.title }
      : { routineId: newTimerState.item.item.id, routineTitle: newTimerState.item.item.title };

    if (activeTimer.isPaused) { // Resuming
      newTimerState.isPaused = false;
      if (newTimerState.item.type === 'task' && newTimerState.pausedTime > 0) {
        newTimerState.endTime = Date.now() + newTimerState.pausedTime * 1000;
      } else if(newTimerState.item.type === 'routine' && newTimerState.startTime) {
        // Correctly calculate new start time when resuming a stopwatch
        const timePaused = Date.now() - newTimerState.pausedDuration;
        newTimerState.startTime = timePaused;
        newTimerState.pausedDuration = activeTimer.pausedDuration;
      }
      addLog('TIMER_START', { ...logPayload, resumed: true });
    } else { // Pausing
      newTimerState.isPaused = true;
      if (newTimerState.item.type === 'task' && newTimerState.endTime) {
        newTimerState.pausedTime = Math.max(0, Math.round((newTimerState.endTime - Date.now()) / 1000));
      } else if (newTimerState.item.type === 'routine' && newTimerState.startTime) {
        // Store current time in pausedDuration to calculate total later
        newTimerState.pausedDuration = Date.now();
      }
       addLog('TIMER_PAUSE', logPayload);
    }
    saveTimer(newTimerState);
  }, [activeTimer, addLog]);

  const stopTimer = useCallback((reason: string) => {
      if (!activeTimer) return;
      if (activeTimer.item.type === 'task') {
        const originalDuration = activeTimer.item.item.duration * 60;
        const timeRemaining = activeTimer.isPaused ? activeTimer.pausedTime : (activeTimer.endTime ? Math.round((activeTimer.endTime - Date.now())/1000) : 0);
        const timeSpent = originalDuration - timeRemaining;
        addLog('TIMER_STOP', {taskId: activeTimer.item.item.id, taskTitle: activeTimer.item.item.title, reason, timeSpentSeconds: Math.round(timeSpent)});
        updateTask({ ...activeTimer.item.item, status: 'todo' });
      }
      saveTimer(null);
  }, [activeTimer, addLog, updateTask]);

  const completeTimer = useCallback(() => {
    if (!activeTimer) return;
    const { item } = activeTimer;

    if (item.type === 'task') {
      const overtimeElapsed = activeTimer.isPaused ? 0 : (activeTimer.endTime && activeTimer.endTime < Date.now()) ? Math.round((Date.now() - activeTimer.endTime) / 1000) : 0;
      const totalDurationSecs = item.item.duration * 60 + overtimeElapsed;

      addLog('TIMER_SESSION_COMPLETE', { taskId: item.item.id, title: item.item.title, duration: totalDurationSecs, points: item.item.points });
      updateTask({ ...item.item, status: 'completed' });
      fire();
      toast({ title: 'Task Completed!', description: `You've earned ${item.item.points} points!` });

    } else { // Routine
      let finalDuration = activeTimer.pausedDuration;
      if (!activeTimer.isPaused && activeTimer.startTime) {
        finalDuration += Date.now() - activeTimer.startTime;
      }
      const durationInSeconds = Math.round(finalDuration / 1000);
      const durationInMinutes = Math.floor(durationInSeconds / 60);
      // Award 1 point per 10 minutes of routine study
      const points = Math.floor(durationInMinutes / 10);

      addLog('ROUTINE_SESSION_COMPLETE', { routineId: item.item.id, title: item.item.title, duration: durationInSeconds, points });
      fire();
      toast({ title: 'Routine Completed!', description: `You logged ${formatTime(durationInSeconds)} and earned ${points} points.` });
    }
    saveTimer(null);

  }, [activeTimer, addLog, updateTask, fire, toast]);

  // Main timer loop effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (!activeTimer || activeTimer.isPaused) return;
      
      let newTimerState = { ...activeTimer };
      if (newTimerState.item.type === 'task') {
        if (!newTimerState.endTime) return;
        const remaining = Math.round((newTimerState.endTime - Date.now()) / 1000);
        setTimeDisplay(formatTime(remaining));
        
        if (remaining <= 0 && !newTimerState.overtimeNotified) {
            sendTimerEndNotification(newTimerState.item.item as StudyTask);
            audioRef.current?.play().catch(e => console.error("Audio error:", e));
            addLog('TIMER_OVERTIME_STARTED', { taskId: newTimerState.item.item.id, taskTitle: newTimerState.item.item.title });
            newTimerState.overtimeNotified = true;
            saveTimer(newTimerState);
        }
      } else { // Routine
        if (!newTimerState.startTime) return;
        const elapsed = (Date.now() - newTimerState.startTime) + newTimerState.pausedDuration;
        setTimeDisplay(formatTime(Math.round(elapsed / 1000)));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer, addLog]);

  // --- Final Context Value ---
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
    isOvertime: activeTimer?.item.type === 'task' && activeTimer.endTime ? activeTimer.endTime < Date.now() : false,
    startTimer,
    togglePause,
    completeTimer,
    stopTimer,
  };

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}
