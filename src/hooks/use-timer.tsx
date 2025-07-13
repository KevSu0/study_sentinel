'use client';

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
  ReactNode,
} from 'react';
import {useTasks} from './use-tasks';
import {useLogger} from './use-logger';
import {useConfetti} from '@/components/providers/confetti-provider';
import type {StudyTask, Routine} from '@/lib/types';
import {useToast} from './use-toast';

const TIMER_KEY = 'studySentinelActiveTimer_v2';

type ActiveTimerItem =
  | { type: 'task'; item: StudyTask }
  | { type: 'routine'; item: Routine };

type StoredTimer = {
  item: ActiveTimerItem;
  endTime?: number; // For countdown
  startTime?: number; // For stopwatch
  isPaused: boolean;
  pausedTime: number; // For countdown
  pausedDuration: number; // For stopwatch
  overtimeNotified?: boolean;
};

// Helper to format seconds into HH:MM:SS or MM:SS
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
  if (Notification.permission === 'granted') {
    const notification = new Notification(`Time's up for "${task.title}"!`, {
      body: "You're now in overtime. This time will still be counted as productive!",
      tag: `study-timer-end-${task.id}`,
    });
    notification.onclick = () => window.focus();
  }
};


// Timer Context
interface TimerContextType {
  activeItem: ActiveTimerItem | null;
  timeDisplay: string;
  isPaused: boolean;
  isOvertime: boolean;
  startTimer: (item: StudyTask | Routine) => void;
  togglePause: () => void;
  completeTimer: () => void;
  stopTimer: (reason: string) => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

// Timer Provider Component
export const TimerProvider = ({children}: {children: ReactNode}) => {
  const {updateTask} = useTasks();
  const {addLog} = useLogger();
  const {fire} = useConfetti();
  const {toast} = useToast();

  const [activeTimer, setActiveTimer] = useState<StoredTimer | null>(null);
  const [timeDisplay, setTimeDisplay] = useState('00:00');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
      audioRef.current.volume = 0.5;
    }
  }, []);
  
  // Load timer from localStorage on mount
  useEffect(() => {
    try {
      const savedTimer = localStorage.getItem(TIMER_KEY);
      if (savedTimer) {
        setActiveTimer(JSON.parse(savedTimer));
      }
    } catch (e) {
      console.error("Failed to load timer from localStorage", e);
      localStorage.removeItem(TIMER_KEY);
    }
  }, []);

  const saveTimer = (timer: StoredTimer | null) => {
    setActiveTimer(timer);
    if (timer) {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    } else {
      localStorage.removeItem(TIMER_KEY);
    }
  };

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
      } else {
          timerData.startTime = Date.now();
          addLog('TIMER_START', { routineId: item.id, routineTitle: item.title });
      }

      saveTimer(timerData);
  }, [addLog, activeTimer, toast]);

  const togglePause = useCallback(() => {
    if (!activeTimer) return;
    
    let newTimerState = { ...activeTimer };
    if (activeTimer.isPaused) { // Resuming
      newTimerState.isPaused = false;
      if (newTimerState.item.type === 'task' && newTimerState.pausedTime > 0) {
        newTimerState.endTime = Date.now() + newTimerState.pausedTime * 1000;
        addLog('TIMER_START', { taskId: newTimerState.item.item.id, taskTitle: newTimerState.item.item.title, resumed: true });
      } else if(newTimerState.item.type === 'routine') {
        newTimerState.startTime = Date.now();
        addLog('TIMER_START', { routineId: newTimerState.item.item.id, routineTitle: newTimerState.item.item.title, resumed: true });
      }
    } else { // Pausing
      newTimerState.isPaused = true;
      if (newTimerState.item.type === 'task' && newTimerState.endTime) {
        newTimerState.pausedTime = Math.max(0, Math.round((newTimerState.endTime - Date.now()) / 1000));
        addLog('TIMER_PAUSE', { taskId: newTimerState.item.item.id, taskTitle: newTimerState.item.item.title });
      } else if (newTimerState.item.type === 'routine' && newTimerState.startTime) {
        newTimerState.pausedDuration += Date.now() - newTimerState.startTime;
        addLog('TIMER_PAUSE', { routineId: newTimerState.item.item.id, routineTitle: newTimerState.item.item.title });
      }
    }
    saveTimer(newTimerState);
  }, [activeTimer, addLog]);

  const stopTimer = useCallback((reason: string) => {
      if (!activeTimer) return;
      if (activeTimer.item.type === 'task') {
        const timeSpent = activeTimer.item.item.duration * 60 - (activeTimer.pausedTime || 0);
        addLog('TIMER_STOP', {taskId: activeTimer.item.item.id, taskTitle: activeTimer.item.item.title, reason, timeSpentSeconds: Math.round(timeSpent)});
      }
      saveTimer(null);
  }, [activeTimer, addLog]);

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
            saveTimer(newTimerState); // Save the notified state
        }
      } else { // Routine
        if (!newTimerState.startTime) return;
        const elapsed = (Date.now() - newTimerState.startTime) + newTimerState.pausedDuration;
        setTimeDisplay(formatTime(Math.round(elapsed / 1000)));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer, addLog]);
  

  const value = {
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
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
};
