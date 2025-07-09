'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Pause, Play, CheckCircle, XCircle, RefreshCw} from 'lucide-react';
import type {StudyTask} from '@/lib/types';
import {cn} from '@/lib/utils';
import {useConfetti} from '@/components/providers/confetti-provider';
import {useLogger} from '@/hooks/use-logger';
import {StopTimerDialog} from './stop-timer-dialog';


interface TimerDialogProps {
  task: StudyTask;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onComplete: () => void;
}

const TIMER_STORAGE_KEY = 'studySentinelActiveTimer';

type StoredTimer = {
  taskId: string;
  endTime: number;
  isPaused: boolean;
  pausedTime: number; // The remaining time in seconds when it was paused
  overtimeNotified?: boolean; // New flag for overtime notification
};

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

const sendTimerEndNotification = (task: StudyTask) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(`Time's up for "${task.title}"!`, {
      body: "You're now in overtime. This time will still be counted as productive!",
      tag: `study-timer-end-${task.id}`, // Prevents multiple notifications for the same task
    });
    notification.onclick = () => {
      window.focus();
    };
  }
};

export function TimerDialog({
  task,
  isOpen,
  onOpenChange,
  onComplete,
}: TimerDialogProps) {
  const [timeRemaining, setTimeRemaining] = useState(task.duration * 60);
  const [overtimeElapsed, setOvertimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [isStopDialogOpen, setStopDialogOpen] = useState(false);
  const {fire} = useConfetti();
  const {addLog} = useLogger();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isOvertime = timeRemaining === 0 && overtimeElapsed > 0;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(
        'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
      );
      audioRef.current.volume = 0.5;
    }
  }, []);

  const clearTimer = useCallback(() => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimerInterval = useCallback(
    (endTime: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        const remaining = Math.round((endTime - Date.now()) / 1000);

        if (remaining > 0) {
          setTimeRemaining(remaining);
          setOvertimeElapsed(0);
        } else {
          // Overtime logic
          const savedTimerRaw = localStorage.getItem(TIMER_STORAGE_KEY);
          if (savedTimerRaw) {
            try {
              const savedTimer: StoredTimer = JSON.parse(savedTimerRaw);
              if (!savedTimer.overtimeNotified) {
                sendTimerEndNotification(task);
                audioRef.current?.play().catch(e => console.error('Error playing sound:', e));
                addLog('TIMER_OVERTIME_STARTED', { taskId: task.id, taskTitle: task.title });
                
                const updatedTimer = {...savedTimer, overtimeNotified: true};
                localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(updatedTimer));
              }
            } catch (e) {
              console.error("Failed to update timer for overtime", e);
            }
          }
          
          setTimeRemaining(0);
          setOvertimeElapsed(-remaining);
        }
      }, 1000);
    },
    [task, addLog]
  );

  useEffect(() => {
    if (isOpen) {
      const savedTimerRaw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (savedTimerRaw) {
        try {
          const savedTimer: StoredTimer = JSON.parse(savedTimerRaw);
          if (savedTimer.taskId === task.id) {
            setIsPaused(savedTimer.isPaused);
            if (savedTimer.isPaused) {
              setTimeRemaining(savedTimer.pausedTime);
              if (savedTimer.pausedTime <= 0) {
                setOvertimeElapsed(-savedTimer.pausedTime);
              }
            } else {
              startTimerInterval(savedTimer.endTime);
            }
          }
        } catch(e) { console.error(e); clearTimer(); }
      } else {
        setTimeRemaining(task.duration * 60);
        setOvertimeElapsed(0);
        setIsPaused(true);
      }
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, task.id, task.duration, startTimerInterval, clearTimer]);

  const handleStartPause = async () => {
    if (isPaused) {
      // Starting or Resuming
      await requestNotificationPermission();

      const currentRemainingTime = (timeRemaining > 0) ? timeRemaining : -overtimeElapsed;
      const endTime = Date.now() + currentRemainingTime * 1000;
      
      const savedTimerRaw = localStorage.getItem(TIMER_STORAGE_KEY);
      const existingTimer = savedTimerRaw ? (JSON.parse(savedTimerRaw) as StoredTimer) : {};

      const timerData: StoredTimer = {
        ...existingTimer,
        taskId: task.id,
        endTime,
        isPaused: false,
        pausedTime: currentRemainingTime,
      };

      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerData));
      setIsPaused(false);
      startTimerInterval(endTime);
      if (!overtimeElapsed) {
        addLog('TIMER_START', {taskId: task.id, taskTitle: task.title});
      }
    } else {
      // Pausing
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      const savedTimerRaw = localStorage.getItem(TIMER_STORAGE_KEY);
      const savedTimer = savedTimerRaw ? JSON.parse(savedTimerRaw) as StoredTimer : null;

      const timerData: StoredTimer = {
        ...(savedTimer || {}),
        taskId: task.id,
        endTime: 0,
        isPaused: true,
        pausedTime: timeRemaining > 0 ? timeRemaining : -overtimeElapsed,
      };

      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerData));
      setIsPaused(true);
      addLog('TIMER_PAUSE', {taskId: task.id, taskTitle: task.title});
    }
  };

  const handleMarkComplete = () => {
    const totalDurationSecs = (task.duration * 60) + overtimeElapsed;
    addLog('TIMER_SESSION_COMPLETE', {
        taskId: task.id,
        title: task.title,
        duration: totalDurationSecs,
        points: task.points, // Points do not increase with overtime for now
    });
    fire();
    clearTimer();
    onComplete();
    onOpenChange(false);
  };

  const handleOpenStopDialog = () => {
    if (!isPaused) handleStartPause(); // Pause the timer first
    setStopDialogOpen(true);
  };

  const handleConfirmStop = (reason: string) => {
    const timeSpent = (task.duration * 60) - timeRemaining + overtimeElapsed;
    addLog('TIMER_STOP', {
      taskId: task.id,
      taskTitle: task.title,
      reason,
      timeSpentSeconds: Math.round(timeSpent),
    });
    clearTimer();
    onOpenChange(false);
  };

  const handleReset = () => {
    clearTimer();
    setTimeRemaining(task.duration * 60);
    setOvertimeElapsed(0);
    setIsPaused(true);
    localStorage.removeItem(TIMER_STORAGE_KEY);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  const displayedTime = isOvertime ? overtimeElapsed : timeRemaining;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isOvertime ? 'Overtime!' : 'Study Timer'}
            </DialogTitle>
            <DialogDescription>
              Focus on your task: <strong>{task.title}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center my-8">
            <div
              className={cn(
                'text-7xl font-mono font-bold tracking-widest',
                isOvertime ? 'text-destructive animate-pulse' : 'text-primary'
              )}
            >
              {formatTime(displayedTime)}
            </div>
            {isOvertime && (
              <p className="mt-4 text-lg font-semibold text-destructive">
                Great focus! Keep going!
              </p>
            )}
          </div>
          <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <>
                <Button size="lg" onClick={handleStartPause} className="w-full">
                  {isPaused ? (
                    <Play className="mr-2" />
                  ) : (
                    <Pause className="mr-2" />
                  )}
                  {isPaused ? 'Start' : 'Pause'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleOpenStopDialog}
                  className="w-full"
                >
                  <XCircle className="mr-2" />
                  Stop
                </Button>
                <div className="sm:col-span-2">
                  <Button
                    size="lg"
                    onClick={handleMarkComplete}
                    className="w-full"
                  >
                    <CheckCircle className="mr-2" />
                    Mark as Completed
                  </Button>
                </div>
              </>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StopTimerDialog
        isOpen={isStopDialogOpen}
        onOpenChange={setStopDialogOpen}
        onConfirm={handleConfirmStop}
      />
    </>
  );
}
