'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
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

const StopTimerDialog = lazy(() =>
  import('./stop-timer-dialog').then(module => ({
    default: module.StopTimerDialog,
  }))
);

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
      body: 'Great focus! Did you complete the task? Click here to update your progress.',
      tag: 'study-timer-end', // Prevents multiple notifications
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
  const [isPaused, setIsPaused] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [isStopDialogOpen, setStopDialogOpen] = useState(false);
  const {fire} = useConfetti();
  const {addLog} = useLogger();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleFinish = useCallback(() => {
    setIsFinished(true);
    fire();
    audioRef.current
      ?.play()
      .catch(e => console.error('Error playing sound:', e));
    sendTimerEndNotification(task);
    addLog('TIMER_COMPLETE', {
      taskId: task.id,
      taskTitle: task.title,
      duration: task.duration,
    });
    clearTimer();
  }, [fire, task, clearTimer, addLog]);

  const startTimerInterval = useCallback(
    (endTime: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        const remaining = Math.round((endTime - Date.now()) / 1000);
        if (remaining > 0) {
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(0);
          handleFinish();
        }
      }, 1000);
    },
    [handleFinish]
  );

  useEffect(() => {
    if (isOpen) {
      const savedTimerRaw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (savedTimerRaw) {
        const savedTimer: StoredTimer = JSON.parse(savedTimerRaw);
        if (savedTimer.taskId === task.id) {
          setIsPaused(savedTimer.isPaused);
          if (savedTimer.isPaused) {
            setTimeRemaining(savedTimer.pausedTime);
          } else {
            startTimerInterval(savedTimer.endTime);
          }
        }
      } else {
        setTimeRemaining(task.duration * 60);
        setIsPaused(true);
        setIsFinished(false);
      }
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, task.id, startTimerInterval]);

  const handleStartPause = async () => {
    if (isPaused) {
      // Starting or Resuming
      const permissionGranted = await requestNotificationPermission();
      if (!permissionGranted && Notification.permission !== 'granted') {
        alert('Please enable notifications to be alerted when the timer ends.');
      }

      const endTime = Date.now() + timeRemaining * 1000;
      const timerData: StoredTimer = {
        taskId: task.id,
        endTime,
        isPaused: false,
        pausedTime: timeRemaining,
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerData));
      setIsPaused(false);
      startTimerInterval(endTime);
      addLog('TIMER_START', {taskId: task.id, taskTitle: task.title});
    } else {
      // Pausing
      if (intervalRef.current) clearInterval(intervalRef.current);
      const timerData: StoredTimer = {
        taskId: task.id,
        endTime: 0, // Not relevant when paused
        isPaused: true,
        pausedTime: timeRemaining,
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerData));
      setIsPaused(true);
      addLog('TIMER_PAUSE', {taskId: task.id, taskTitle: task.title});
    }
  };

  const handleMarkComplete = () => {
    clearTimer();
    onComplete();
    onOpenChange(false);
  };

  const handleOpenStopDialog = () => {
    if (!isPaused) handleStartPause(); // Pause the timer first
    setStopDialogOpen(true);
  };

  const handleConfirmStop = (reason: string) => {
    addLog('TIMER_STOP', {
      taskId: task.id,
      taskTitle: task.title,
      reason,
      timeRemaining,
    });
    clearTimer();
    onOpenChange(false);
  };

  const handleReset = () => {
    clearTimer();
    setTimeRemaining(task.duration * 60);
    setIsPaused(true);
    setIsFinished(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Study Timer</DialogTitle>
            <DialogDescription>
              Focus on your task: <strong>{task.title}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center my-8">
            <div
              className={cn(
                'text-7xl font-mono font-bold tracking-widest',
                isFinished ? 'text-accent' : 'text-primary'
              )}
            >
              {formatTime(timeRemaining)}
            </div>
            {isFinished && (
              <p className="mt-4 text-lg font-semibold text-accent animate-pulse">
                Session Complete! Great work!
              </p>
            )}
          </div>
          <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {!isFinished ? (
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
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={handleMarkComplete}
                  className="w-full"
                >
                  <CheckCircle className="mr-2" />
                  Mark as Completed
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleReset}
                  className="w-full"
                >
                  <RefreshCw className="mr-2" />
                  Start Again
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isStopDialogOpen && (
        <Suspense fallback={null}>
          <StopTimerDialog
            isOpen={isStopDialogOpen}
            onOpenChange={setStopDialogOpen}
            onConfirm={handleConfirmStop}
          />
        </Suspense>
      )}
    </>
  );
}
