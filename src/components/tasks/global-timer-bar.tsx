'use client';
import {useState, useEffect, useCallback, useRef} from 'react';
import {useTasks} from '@/hooks/use-tasks';
import {useRoutines} from '@/hooks/use-routines';
import {useLogger} from '@/hooks/use-logger';
import {useConfetti} from '@/components/providers/confetti-provider';
import type {StudyTask, Routine} from '@/lib/types';
import {Button} from '@/components/ui/button';
import {Timer, CheckCircle, XCircle, Pause, Play} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import {StopTimerDialog} from './stop-timer-dialog';

const TASK_TIMER_KEY = 'studySentinelActiveTimer';
const ROUTINE_TIMER_KEY = 'studySentinelActiveRoutineTimer';

type StoredTaskTimer = {
  taskId: string;
  endTime: number;
  isPaused: boolean;
  pausedTime: number;
  overtimeNotified?: boolean;
};

type StoredRoutineTimer = {
  routineId: string;
  startTime: number;
  isPaused: boolean;
  pausedDuration: number;
};

// Helper functions for notifications, now centralized here.
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
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

export function GlobalTimerBar() {
  const {tasks, updateTask, isLoaded: tasksLoaded} = useTasks();
  const {routines, isLoaded: routinesLoaded} = useRoutines();
  const {addLog} = useLogger();
  const {fire} = useConfetti();
  const {toast} = useToast();

  // State for Task Timer (Countdown)
  const [activeTask, setActiveTask] = useState<StudyTask | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTaskTimerPaused, setIsTaskTimerPaused] = useState(true);
  const [isStopDialogOpen, setStopDialogOpen] = useState(false);

  // State for Routine Timer (Stopwatch)
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRoutineTimerPaused, setIsRoutineTimerPaused] = useState(true);

  // Ref for audio to avoid re-creating it on each render
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(
        'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
      );
      audioRef.current.volume = 0.5;
    }
  }, []);

  const clearTaskTimer = useCallback(() => {
    localStorage.removeItem(TASK_TIMER_KEY);
    setActiveTask(null);
    setTimeRemaining(0);
  }, []);

  const clearRoutineTimer = useCallback(() => {
    localStorage.removeItem(ROUTINE_TIMER_KEY);
    setActiveRoutine(null);
    setElapsedTime(0);
  }, []);

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

  const handleMarkComplete = useCallback(() => {
    if (activeTask) {
      const overtimeElapsed = timeRemaining < 0 ? -timeRemaining : 0;
      const totalDurationSecs = activeTask.duration * 60 + overtimeElapsed;

      addLog('TIMER_SESSION_COMPLETE', {
        taskId: activeTask.id,
        title: activeTask.title,
        duration: totalDurationSecs,
        points: activeTask.points,
      });
      fire();
      toast({
        title: 'Task Completed!',
        description: `You've earned ${activeTask.points} points!`,
      });
      updateTask({...activeTask, status: 'completed'});
      clearTaskTimer();
    }
  }, [activeTask, updateTask, addLog, clearTaskTimer, fire, toast, timeRemaining]);

  const handleToggleTaskPause = useCallback(async () => {
    const savedTimerRaw = localStorage.getItem(TASK_TIMER_KEY);
    if (!savedTimerRaw || !activeTask) return;

    let savedTimer: StoredTaskTimer = JSON.parse(savedTimerRaw);
    if (savedTimer.isPaused) {
      // Resuming
      await requestNotificationPermission();
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
    localStorage.setItem(TASK_TIMER_KEY, JSON.stringify(savedTimer));
    setIsTaskTimerPaused(savedTimer.isPaused);
  }, [activeTask, addLog, timeRemaining]);

  const handleConfirmStopTask = (reason: string) => {
    if (activeTask) {
      const timeSpent = activeTask.duration * 60 - timeRemaining;
      addLog('TIMER_STOP', {
        taskId: activeTask.id,
        taskTitle: activeTask.title,
        reason,
        timeSpentSeconds: Math.round(timeSpent),
      });
      clearTaskTimer();
    }
    setStopDialogOpen(false);
  };

  const handleStopTask = () => {
    const savedTimerRaw = localStorage.getItem(TASK_TIMER_KEY);
    if (savedTimerRaw) {
      const savedTimer: StoredTaskTimer = JSON.parse(savedTimerRaw);
      if (!savedTimer.isPaused) {
        // If running, pause it first
        const timerData: StoredTaskTimer = {
          ...savedTimer,
          isPaused: true,
          pausedTime: timeRemaining,
        };
        localStorage.setItem(TASK_TIMER_KEY, JSON.stringify(timerData));
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

  const handleToggleRoutinePause = useCallback(() => {
    const savedTimerRaw = localStorage.getItem(ROUTINE_TIMER_KEY);
    if (!savedTimerRaw || !activeRoutine) return;

    let savedTimer: StoredRoutineTimer = JSON.parse(savedTimerRaw);
    if (savedTimer.isPaused) {
      // Resuming
      savedTimer = {...savedTimer, isPaused: false, startTime: Date.now()};
    } else {
      // Pausing
      const now = Date.now();
      const newPausedDuration =
        savedTimer.pausedDuration + (now - savedTimer.startTime);
      savedTimer = {
        ...savedTimer,
        isPaused: true,
        pausedDuration: newPausedDuration,
      };
    }
    localStorage.setItem(ROUTINE_TIMER_KEY, JSON.stringify(savedTimer));
    setIsRoutineTimerPaused(savedTimer.isPaused);
  }, [activeRoutine]);

  const handleCompleteRoutine = useCallback(() => {
    const savedTimerRaw = localStorage.getItem(ROUTINE_TIMER_KEY);
    if (!savedTimerRaw || !activeRoutine) return;

    let savedTimer: StoredRoutineTimer = JSON.parse(savedTimerRaw);
    let finalDuration = savedTimer.pausedDuration;
    if (!savedTimer.isPaused) {
      finalDuration += Date.now() - savedTimer.startTime;
    }

    const durationInSeconds = Math.round(finalDuration / 1000);
    const durationInMinutes = Math.floor(durationInSeconds / 60);
    const points = Math.floor(durationInMinutes / 10);

    addLog('ROUTINE_SESSION_COMPLETE', {
      routineId: activeRoutine.id,
      title: activeRoutine.title,
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
    clearRoutineTimer();
  }, [activeRoutine, addLog, clearRoutineTimer, toast, fire]);

  // Main timer polling effect, now the single source of truth for time progression.
  useEffect(() => {
    if (!tasksLoaded || !routinesLoaded) return;

    const syncWithStorage = () => {
      // Task Timer has priority
      const savedTaskTimerRaw = localStorage.getItem(TASK_TIMER_KEY);
      if (savedTaskTimerRaw) {
        if (activeRoutine) clearRoutineTimer();
        try {
          const savedTimer: StoredTaskTimer = JSON.parse(savedTaskTimerRaw);
          const task = tasks.find(t => t.id === savedTimer.taskId);

          if (task) {
            setActiveTask(currentTask =>
              currentTask?.id === task.id ? currentTask : task
            );
            setIsTaskTimerPaused(savedTimer.isPaused);

            if (savedTimer.isPaused) {
              setTimeRemaining(savedTimer.pausedTime);
            } else {
              const remaining = Math.round((savedTimer.endTime - Date.now()) / 1000);
              setTimeRemaining(remaining);

              // Overtime check
              if (remaining <= 0 && !savedTimer.overtimeNotified) {
                sendTimerEndNotification(task);
                audioRef.current?.play().catch(e => console.error('Audio error:', e));
                addLog('TIMER_OVERTIME_STARTED', {
                  taskId: task.id,
                  taskTitle: task.title,
                });
                const updatedTimer = {...savedTimer, overtimeNotified: true};
                localStorage.setItem(TASK_TIMER_KEY, JSON.stringify(updatedTimer));
              }
            }
          } else {
            clearTaskTimer();
          }
        } catch (e) {
          clearTaskTimer();
        }
        return;
      } else if (activeTask) {
        setActiveTask(null);
      }

      // Routine Timer
      const savedRoutineTimerRaw = localStorage.getItem(ROUTINE_TIMER_KEY);
      if (savedRoutineTimerRaw) {
        try {
          const savedTimer: StoredRoutineTimer = JSON.parse(savedRoutineTimerRaw);
          const routine = routines.find(r => r.id === savedTimer.routineId);

          if (routine) {
            setActiveRoutine(currentRoutine =>
              currentRoutine?.id === routine.id ? currentRoutine : routine
            );
            setIsRoutineTimerPaused(savedTimer.isPaused);
            let currentElapsedTime = savedTimer.pausedDuration;
            if (!savedTimer.isPaused) {
              currentElapsedTime += Date.now() - savedTimer.startTime;
            }
            setElapsedTime(Math.round(currentElapsedTime / 1000));
          } else {
            clearRoutineTimer();
          }
        } catch (e) {
          clearRoutineTimer();
        }
      } else if (activeRoutine) {
        setActiveRoutine(null);
      }
    };

    syncWithStorage();
    const intervalId = setInterval(syncWithStorage, 1000);
    window.addEventListener('storage', syncWithStorage); // Sync across tabs

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', syncWithStorage);
    };
  }, [
    tasksLoaded,
    routinesLoaded,
    tasks,
    routines,
    addLog,
    clearTaskTimer,
    clearRoutineTimer,
    activeTask,
    activeRoutine,
  ]);

  const isOvertime = activeTask && timeRemaining <= 0;

  // Render logic
  if (activeTask) {
    return (
      <>
        <div className="sticky top-[65px] md:top-0 z-20 w-full bg-primary/95 text-primary-foreground backdrop-blur-sm shadow-lg animate-in fade-in-0 slide-in-from-top-full">
          <div className="container mx-auto flex items-center justify-between gap-4 p-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <Timer className="h-6 w-6 shrink-0" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 overflow-hidden">
                <p className="font-semibold text-base truncate">
                  {activeTask.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="font-mono tracking-wider text-xl">
                    {formatTime(timeRemaining)}
                  </p>
                  {isOvertime && (
                    <span className="text-xs font-sans uppercase text-destructive-foreground bg-destructive px-1 rounded">
                      Overtime
                    </span>
                  )}
                  {isTaskTimerPaused && !isOvertime && (
                    <span className="text-xs font-sans uppercase">(Paused)</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleTaskPause}
                className="hover:bg-white/20 px-2 sm:px-3"
              >
                {isTaskTimerPaused ? <Play /> : <Pause />}
                <span className="hidden sm:inline">
                  {isTaskTimerPaused ? 'Resume' : 'Pause'}
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
                onClick={handleStopTask}
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
          onConfirm={handleConfirmStopTask}
        />
      </>
    );
  }

  if (activeRoutine) {
    return (
      <div className="sticky top-[65px] md:top-0 z-20 w-full bg-accent/95 text-accent-foreground backdrop-blur-sm shadow-lg animate-in fade-in-0 slide-in-from-top-full">
        <div className="container mx-auto flex items-center justify-between gap-4 p-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <Timer className="h-6 w-6 shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 overflow-hidden">
              <p className="font-semibold text-base truncate">
                {activeRoutine.title}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="font-mono tracking-wider text-xl">
                  {formatTime(elapsedTime)}
                </p>
                {isRoutineTimerPaused && (
                  <span className="text-xs font-sans uppercase">(Paused)</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleToggleRoutinePause}
              className="hover:bg-white/20 px-2 sm:px-3"
            >
              {isRoutineTimerPaused ? <Play /> : <Pause />}
              <span className="hidden sm:inline">
                {isRoutineTimerPaused ? 'Resume' : 'Pause'}
              </span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCompleteRoutine}
              className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3"
            >
              <CheckCircle />
              <span className="hidden sm:inline">Complete</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
