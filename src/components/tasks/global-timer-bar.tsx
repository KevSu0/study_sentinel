'use client';
import {useState, useEffect, useCallback} from 'react';
import {useTasks} from '@/hooks/use-tasks';
import {useLogger} from '@/hooks/use-logger';
import {useConfetti} from '@/components/providers/confetti-provider';
import type {StudyTask} from '@/lib/types';
import {Button} from '@/components/ui/button';
import {Timer, CheckCircle, XCircle, Pause, Play} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import {StopTimerDialog} from './stop-timer-dialog';

const TIMER_STORAGE_KEY = 'studySentinelActiveTimer';
type StoredTimer = {
  taskId: string;
  endTime: number;
  isPaused: boolean;
  pausedTime: number;
};

export function GlobalTimerBar() {
  const {tasks, updateTask, isLoaded: tasksLoaded} = useTasks();
  const {addLog} = useLogger();
  const {fire} = useConfetti();
  const {toast} = useToast();
  const [activeTask, setActiveTask] = useState<StudyTask | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [isStopDialogOpen, setStopDialogOpen] = useState(false);

  const clearTimer = useCallback(() => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    setActiveTask(null);
    setTimeRemaining(0);
  }, []);

  const handleMarkComplete = useCallback(() => {
    if (activeTask) {
      updateTask({...activeTask, status: 'completed'});
      fire();
      toast({
        title: 'Task Completed!',
        description: `You've earned ${activeTask.points} points!`,
      });
      addLog('TASK_COMPLETE', {
        taskId: activeTask.id,
        title: activeTask.title,
      });
      clearTimer();
    }
  }, [activeTask, updateTask, addLog, clearTimer, fire, toast]);

  const handleTogglePause = useCallback(() => {
    const savedTimerRaw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!savedTimerRaw || !activeTask) return;

    let savedTimer: StoredTimer = JSON.parse(savedTimerRaw);

    if (savedTimer.isPaused) {
      // Resuming
      const newEndTime = Date.now() + savedTimer.pausedTime * 1000;
      savedTimer = {...savedTimer, isPaused: false, endTime: newEndTime};
      addLog('TIMER_START', {
        taskId: activeTask.id,
        taskTitle: activeTask.title,
        resumed: true,
      });
    } else {
      // Pausing
      savedTimer = {...savedTimer, isPaused: true, pausedTime: timeRemaining};
      addLog('TIMER_PAUSE', {
        taskId: activeTask.id,
        taskTitle: activeTask.title,
      });
    }

    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(savedTimer));
    setIsPaused(savedTimer.isPaused);
  }, [activeTask, addLog, timeRemaining]);

  const handleConfirmStop = (reason: string) => {
    if (activeTask) {
      addLog('TIMER_STOP', {
        taskId: activeTask.id,
        taskTitle: activeTask.title,
        reason,
        timeRemaining,
      });
      clearTimer();
    }
    setStopDialogOpen(false);
  };

  const handleStop = () => {
    const savedTimerRaw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (savedTimerRaw) {
      const savedTimer: StoredTimer = JSON.parse(savedTimerRaw);
      if (!savedTimer.isPaused) {
        const timerData: StoredTimer = {
          ...savedTimer,
          isPaused: true,
          pausedTime: timeRemaining,
        };
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerData));
        setIsPaused(true);
        if (activeTask) {
          addLog('TIMER_PAUSE', {
            taskId: activeTask.id,
            taskTitle: activeTask.title,
          });
        }
      }
    }
    setStopDialogOpen(true);
  };

  useEffect(() => {
    if (!tasksLoaded) return;

    const intervalId = setInterval(() => {
      const savedTimerRaw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (savedTimerRaw) {
        try {
          const savedTimer: StoredTimer = JSON.parse(savedTimerRaw);
          const task = tasks.find(t => t.id === savedTimer.taskId);

          if (task) {
            if (task.id !== activeTask?.id) setActiveTask(task);

            setIsPaused(savedTimer.isPaused);

            if (savedTimer.isPaused) {
              setTimeRemaining(savedTimer.pausedTime);
            } else {
              const remaining = Math.round(
                (savedTimer.endTime - Date.now()) / 1000
              );
              if (remaining >= 0) {
                setTimeRemaining(remaining);
              } else {
                setTimeRemaining(0);
              }
            }
          } else {
            clearTimer();
          }
        } catch (error) {
          console.error(
            'Failed to parse timer data from localStorage',
            error
          );
          clearTimer();
        }
      } else if (activeTask) {
        setActiveTask(null);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [tasks, tasksLoaded, clearTimer, activeTask]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!activeTask) return null;

  return (
    <>
      <div className="sticky top-[65px] md:top-0 z-20 w-full bg-primary/95 text-primary-foreground backdrop-blur-sm shadow-lg animate-in fade-in-0 slide-in-from-top-full">
        <div className="container mx-auto flex items-center justify-between gap-4 p-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <Timer className="h-6 w-6 shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 overflow-hidden">
              <p className="font-semibold text-base truncate">{activeTask.title}</p>
              <div className="flex items-baseline gap-2">
                <p className="font-mono tracking-wider text-xl">
                  {formatTime(timeRemaining)}
                </p>
                {isPaused && (
                  <span className="text-xs font-sans uppercase">(Paused)</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleTogglePause}
              className="hover:bg-white/20 px-2 sm:px-3"
            >
              {isPaused ? <Play /> : <Pause />}
              <span className="hidden sm:inline">
                {isPaused ? 'Resume' : 'Pause'}
              </span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleMarkComplete}
              className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3"
            >
              <CheckCircle />
              <span className="hidden sm:inline">Complete</span>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleStop}
              className="px-2 sm:px-3"
            >
              <XCircle />
              <span className="hidden sm:inline">Stop</span>
            </Button>
          </div>
        </div>
      </div>
      <StopTimerDialog
        isOpen={isStopDialogOpen}
        onOpenChange={setStopDialogOpen}
        onConfirm={handleConfirmStop}
      />
    </>
  );
}
