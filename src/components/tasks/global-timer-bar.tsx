'use client';
import {useState, useEffect, useCallback} from 'react';
import {useTasks} from '@/hooks/use-tasks';
import {useLogger} from '@/hooks/use-logger';
import {useConfetti} from '@/components/providers/confetti-provider';
import type {StudyTask} from '@/lib/types';
import {Button} from '@/components/ui/button';
import {Timer, CheckCircle, XCircle} from 'lucide-react';
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
              const remaining = Math.round((savedTimer.endTime - Date.now()) / 1000);
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
            console.error("Failed to parse timer data from localStorage", error);
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
              <p className="font-semibold truncate">{activeTask.title}</p>
              <p className="font-mono tracking-wider text-lg">
                {isPaused ? (
                  <span className="text-sm font-sans">(Paused)</span>
                ) : (
                  formatTime(timeRemaining)
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleMarkComplete}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete
            </Button>
            <Button size="sm" variant="destructive" onClick={handleStop}>
              <XCircle className="mr-2 h-4 w-4" />
              Stop
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
