'use client';

import React, {useState, useEffect, useCallback} from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Pause, Play, CheckCircle, XCircle} from 'lucide-react';
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
  pausedTime: number;
  overtimeNotified?: boolean;
};

// Helper to request permission, as it can be called from here.
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export function TimerDialog({
  task,
  isOpen,
  onOpenChange,
  onComplete,
}: TimerDialogProps) {
  const [timeRemaining, setTimeRemaining] = useState(task.duration * 60);
  const [isPaused, setIsPaused] = useState(true);
  const [isStopDialogOpen, setStopDialogOpen] = useState(false);
  const {fire} = useConfetti();
  const {addLog} = useLogger();

  const isOvertime = timeRemaining <= 0;

  const clearTimer = useCallback(() => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }, []);

  // This effect now only syncs the dialog's UI with localStorage.
  // It does not contain any timer logic itself.
  useEffect(() => {
    if (!isOpen) return;

    const syncWithStorage = () => {
      const savedTimerRaw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (savedTimerRaw) {
        try {
          const savedTimer: StoredTimer = JSON.parse(savedTimerRaw);
          if (savedTimer.taskId === task.id) {
            setIsPaused(savedTimer.isPaused);
            if (savedTimer.isPaused) {
              setTimeRemaining(savedTimer.pausedTime);
            } else {
              const remaining = Math.round(
                (savedTimer.endTime - Date.now()) / 1000
              );
              setTimeRemaining(remaining);
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        // No timer in storage, reset to default state for this task
        setTimeRemaining(task.duration * 60);
        setIsPaused(true);
      }
    };

    syncWithStorage(); // Sync immediately on open
    const syncInterval = setInterval(syncWithStorage, 250);

    return () => clearInterval(syncInterval);
  }, [isOpen, task.id, task.duration]);

  const handleStartPause = async () => {
    // This function now only modifies localStorage, the main logic is in GlobalTimerBar
    const savedTimerRaw = localStorage.getItem(TIMER_STORAGE_KEY);
    let savedTimer: Partial<StoredTimer> = savedTimerRaw
      ? JSON.parse(savedTimerRaw)
      : {};

    if (savedTimer.taskId && savedTimer.taskId !== task.id) {
      // This case should be handled by disabling buttons, but as a safeguard:
      alert('Another timer is already active.');
      return;
    }

    if (isPaused) {
      // Starting or Resuming
      await requestNotificationPermission();
      const endTime = Date.now() + timeRemaining * 1000;
      savedTimer = {
        ...savedTimer,
        taskId: task.id,
        endTime,
        isPaused: false,
        pausedTime: timeRemaining,
      };
      addLog('TIMER_START', {
        taskId: task.id,
        taskTitle: task.title,
        resumed: !!savedTimerRaw,
      });
    } else {
      // Pausing
      savedTimer = {
        ...savedTimer,
        taskId: task.id,
        isPaused: true,
        pausedTime: timeRemaining,
      };
      addLog('TIMER_PAUSE', {taskId: task.id, taskTitle: task.title});
    }

    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(savedTimer));
    setIsPaused(savedTimer.isPaused ?? true); // Update local state immediately for UI responsiveness
  };

  const handleMarkComplete = () => {
    const overtimeElapsed = isOvertime ? -timeRemaining : 0;
    const totalDurationSecs = task.duration * 60 + overtimeElapsed;
    addLog('TIMER_SESSION_COMPLETE', {
      taskId: task.id,
      title: task.title,
      duration: totalDurationSecs,
      points: task.points,
    });
    fire();
    clearTimer();
    onComplete();
    onOpenChange(false);
  };

  const handleOpenStopDialog = () => {
    if (!isPaused) {
      // Pause the timer if it's running before opening dialog
      const savedTimer: StoredTimer = JSON.parse(
        localStorage.getItem(TIMER_STORAGE_KEY) || '{}'
      );
      const updatedTimer = {
        ...savedTimer,
        isPaused: true,
        pausedTime: timeRemaining,
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(updatedTimer));
      setIsPaused(true);
      addLog('TIMER_PAUSE', {taskId: task.id, taskTitle: task.title});
    }
    setStopDialogOpen(true);
  };

  const handleConfirmStop = (reason: string) => {
    const timeSpent = task.duration * 60 - timeRemaining;
    addLog('TIMER_STOP', {
      taskId: task.id,
      taskTitle: task.title,
      reason,
      timeSpentSeconds: Math.round(timeSpent),
    });
    clearTimer();
    onOpenChange(false);
  };

  const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isOvertime ? 'Overtime!' : 'Study Timer'}</DialogTitle>
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
              {formatTime(timeRemaining)}
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
