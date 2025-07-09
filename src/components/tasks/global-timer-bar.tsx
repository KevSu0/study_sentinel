'use client';
import {useState, useEffect, useCallback} from 'react';
import {useTasks} from '@/hooks/use-tasks';
import {useRoutines} from '@/hooks/use-routines';
import {useLogger} from '@/hooks/use-logger';
import {useConfetti} from '@/components/providers/confetti-provider';
import type {StudyTask, Routine} from '@/lib/types';
import {Button} from '@/components/ui/button';
import {Timer, CheckCircle, XCircle, Pause, Play, Stopwatch} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import {StopTimerDialog} from './stop-timer-dialog';

const TASK_TIMER_KEY = 'studySentinelActiveTimer';
const ROUTINE_TIMER_KEY = 'studySentinelActiveRoutineTimer';

type StoredTaskTimer = {
  taskId: string;
  endTime: number;
  isPaused: boolean;
  pausedTime: number;
};

type StoredRoutineTimer = {
  routineId: string;
  startTime: number;
  isPaused: boolean;
  pausedDuration: number;
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
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts = [];
    if (hours > 0) parts.push(String(hours).padStart(2, '0'));
    parts.push(String(mins).padStart(2, '0'));
    parts.push(String(secs).padStart(2, '0'));
    return parts.join(':');
  };

  // --- Task Timer Logic ---
  const handleMarkComplete = useCallback(() => {
    if (activeTask) {
      updateTask({...activeTask, status: 'completed'});
      fire();
      toast({
        title: 'Task Completed!',
        description: `You've earned ${activeTask.points} points!`,
      });
      addLog('TASK_COMPLETE', {taskId: activeTask.id, title: activeTask.title});
      clearTaskTimer();
    }
  }, [activeTask, updateTask, addLog, clearTaskTimer, fire, toast]);

  const handleToggleTaskPause = useCallback(() => {
    const savedTimerRaw = localStorage.getItem(TASK_TIMER_KEY);
    if (!savedTimerRaw || !activeTask) return;

    let savedTimer: StoredTaskTimer = JSON.parse(savedTimerRaw);
    if (savedTimer.isPaused) {
      const newEndTime = Date.now() + savedTimer.pausedTime * 1000;
      savedTimer = {...savedTimer, isPaused: false, endTime: newEndTime};
      addLog('TIMER_START', {taskId: activeTask.id, taskTitle: activeTask.title, resumed: true});
    } else {
      savedTimer = {...savedTimer, isPaused: true, pausedTime: timeRemaining};
      addLog('TIMER_PAUSE', {taskId: activeTask.id, taskTitle: activeTask.title});
    }
    localStorage.setItem(TASK_TIMER_KEY, JSON.stringify(savedTimer));
    setIsTaskTimerPaused(savedTimer.isPaused);
  }, [activeTask, addLog, timeRemaining]);

  const handleConfirmStopTask = (reason: string) => {
    if (activeTask) {
      addLog('TIMER_STOP', {taskId: activeTask.id, taskTitle: activeTask.title, reason, timeRemaining});
      clearTaskTimer();
    }
    setStopDialogOpen(false);
  };
  
  const handleStopTask = () => {
    const savedTimerRaw = localStorage.getItem(TASK_TIMER_KEY);
    if (savedTimerRaw) {
      const savedTimer: StoredTaskTimer = JSON.parse(savedTimerRaw);
      if (!savedTimer.isPaused) {
        const timerData: StoredTaskTimer = {...savedTimer, isPaused: true, pausedTime: timeRemaining};
        localStorage.setItem(TASK_TIMER_KEY, JSON.stringify(timerData));
        setIsTaskTimerPaused(true);
        if (activeTask) {
          addLog('TIMER_PAUSE', {taskId: activeTask.id, taskTitle: activeTask.title});
        }
      }
    }
    setStopDialogOpen(true);
  };
  
  // --- Routine Timer Logic ---
  const handleToggleRoutinePause = useCallback(() => {
    const savedTimerRaw = localStorage.getItem(ROUTINE_TIMER_KEY);
    if (!savedTimerRaw || !activeRoutine) return;
    
    let savedTimer: StoredRoutineTimer = JSON.parse(savedTimerRaw);
    if (savedTimer.isPaused) { // Resuming
      savedTimer = {...savedTimer, isPaused: false, startTime: Date.now()};
    } else { // Pausing
      const now = Date.now();
      const newPausedDuration = savedTimer.pausedDuration + (now - savedTimer.startTime);
      savedTimer = {...savedTimer, isPaused: true, pausedDuration: newPausedDuration};
    }
    localStorage.setItem(ROUTINE_TIMER_KEY, JSON.stringify(savedTimer));
    setIsRoutineTimerPaused(savedTimer.isPaused);
  }, [activeRoutine]);
  
  const handleStopRoutine = useCallback(() => {
    const savedTimerRaw = localStorage.getItem(ROUTINE_TIMER_KEY);
    if (!savedTimerRaw || !activeRoutine) return;
    
    let savedTimer: StoredRoutineTimer = JSON.parse(savedTimerRaw);
    let finalDuration = savedTimer.pausedDuration;
    if (!savedTimer.isPaused) {
      finalDuration += (Date.now() - savedTimer.startTime);
    }
    
    addLog('ROUTINE_SESSION_COMPLETE', {
        routineId: activeRoutine.id,
        title: activeRoutine.title,
        duration: Math.round(finalDuration / 1000)
    });
    toast({
        title: "Routine Stopped",
        description: `You logged ${formatTime(Math.round(finalDuration / 1000))} of productive time.`
    });
    clearRoutineTimer();
  }, [activeRoutine, addLog, clearRoutineTimer, toast]);

  // Main polling effect
  useEffect(() => {
    if (!tasksLoaded || !routinesLoaded) return;

    const intervalId = setInterval(() => {
      // Prioritize task timer
      const savedTaskTimerRaw = localStorage.getItem(TASK_TIMER_KEY);
      if (savedTaskTimerRaw) {
        if (activeRoutine) clearRoutineTimer(); // Ensure no routine timer is active
        try {
          const savedTimer: StoredTaskTimer = JSON.parse(savedTaskTimerRaw);
          const task = tasks.find(t => t.id === savedTimer.taskId);
          if (task) {
            if (task.id !== activeTask?.id) setActiveTask(task);
            setIsTaskTimerPaused(savedTimer.isPaused);
            if (savedTimer.isPaused) {
              setTimeRemaining(savedTimer.pausedTime);
            } else {
              const remaining = Math.round((savedTimer.endTime - Date.now()) / 1000);
              setTimeRemaining(remaining >= 0 ? remaining : 0);
            }
          } else {
            clearTaskTimer();
          }
        } catch (e) { clearTaskTimer(); }
        return; // Exit early if task timer is active
      } else if (activeTask) {
         setActiveTask(null);
      }

      // Check for routine timer
      const savedRoutineTimerRaw = localStorage.getItem(ROUTINE_TIMER_KEY);
      if (savedRoutineTimerRaw) {
        try {
          const savedTimer: StoredRoutineTimer = JSON.parse(savedRoutineTimerRaw);
          const routine = routines.find(r => r.id === savedTimer.routineId);
          if (routine) {
            if (routine.id !== activeRoutine?.id) setActiveRoutine(routine);
            setIsRoutineTimerPaused(savedTimer.isPaused);
            let currentElapsedTime = savedTimer.pausedDuration;
            if (!savedTimer.isPaused) {
              currentElapsedTime += (Date.now() - savedTimer.startTime);
            }
            setElapsedTime(Math.round(currentElapsedTime / 1000));
          } else {
            clearRoutineTimer();
          }
        } catch (e) { clearRoutineTimer(); }
      } else if (activeRoutine) {
        setActiveRoutine(null);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [tasks, routines, tasksLoaded, routinesLoaded, clearTaskTimer, clearRoutineTimer, activeTask, activeRoutine]);

  // Render logic
  if (activeTask) {
    return ( // Task Timer UI (Countdown)
      <>
        <div className="sticky top-[65px] md:top-0 z-20 w-full bg-primary/95 text-primary-foreground backdrop-blur-sm shadow-lg animate-in fade-in-0 slide-in-from-top-full">
          <div className="container mx-auto flex items-center justify-between gap-4 p-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <Timer className="h-6 w-6 shrink-0" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 overflow-hidden">
                <p className="font-semibold text-base truncate">{activeTask.title}</p>
                <div className="flex items-baseline gap-2">
                  <p className="font-mono tracking-wider text-xl">{formatTime(timeRemaining)}</p>
                  {isTaskTimerPaused && <span className="text-xs font-sans uppercase">(Paused)</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={handleToggleTaskPause} className="hover:bg-white/20 px-2 sm:px-3">
                {isTaskTimerPaused ? <Play /> : <Pause />}
                <span className="hidden sm:inline">{isTaskTimerPaused ? 'Resume' : 'Pause'}</span>
              </Button>
              <Button size="sm" variant="secondary" onClick={handleMarkComplete} className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3">
                <CheckCircle /><span className="hidden sm:inline">Complete</span>
              </Button>
              <Button size="sm" variant="destructive" onClick={handleStopTask} className="px-2 sm:px-3">
                <XCircle /><span className="hidden sm:inline">Stop</span>
              </Button>
            </div>
          </div>
        </div>
        <StopTimerDialog isOpen={isStopDialogOpen} onOpenChange={setStopDialogOpen} onConfirm={handleConfirmStopTask} />
      </>
    );
  }

  if (activeRoutine) {
    return ( // Routine Timer UI (Stopwatch)
      <div className="sticky top-[65px] md:top-0 z-20 w-full bg-accent/95 text-accent-foreground backdrop-blur-sm shadow-lg animate-in fade-in-0 slide-in-from-top-full">
        <div className="container mx-auto flex items-center justify-between gap-4 p-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <Stopwatch className="h-6 w-6 shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 overflow-hidden">
              <p className="font-semibold text-base truncate">{activeRoutine.title}</p>
              <div className="flex items-baseline gap-2">
                <p className="font-mono tracking-wider text-xl">{formatTime(elapsedTime)}</p>
                {isRoutineTimerPaused && <span className="text-xs font-sans uppercase">(Paused)</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleToggleRoutinePause} className="hover:bg-white/20 px-2 sm:px-3">
              {isRoutineTimerPaused ? <Play /> : <Pause />}
              <span className="hidden sm:inline">{isRoutineTimerPaused ? 'Resume' : 'Pause'}</span>
            </Button>
            <Button size="sm" variant="destructive" onClick={handleStopRoutine} className="px-2 sm:px-3">
              <XCircle /><span className="hidden sm:inline">Stop</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
