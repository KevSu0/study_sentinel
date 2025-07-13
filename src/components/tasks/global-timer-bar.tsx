
'use client';
import React, {useState} from 'react';
import { useTasks } from '@/hooks/use-tasks.tsx';
import type {StudyTask, Routine} from '@/lib/types';
import {Button} from '@/components/ui/button';
import {Timer, CheckCircle, XCircle, Pause, Play} from 'lucide-react';
import {StopTimerDialog} from './stop-timer-dialog';

export function GlobalTimerBar() {
  const {
    activeItem,
    timeDisplay,
    isPaused,
    isOvertime,
    togglePause,
    completeTimer,
    stopTimer,
  } = useTasks();

  const [isStopDialogOpen, setStopDialogOpen] = useState(false);

  if (!activeItem) {
    return null;
  }

  const isTask = activeItem.type === 'task';
  const item = activeItem.item as StudyTask | Routine;

  const handleStop = () => {
    if (isTask) {
      if (!isPaused) {
        togglePause();
      }
      setStopDialogOpen(true);
    } else {
      // For routines, stop immediately without a dialog
      stopTimer('Stopped routine timer from global bar');
    }
  };

  const handleConfirmStopTask = (reason: string) => {
    stopTimer(reason);
    setStopDialogOpen(false);
  };


  return (
    <>
      <div
        className={`sticky top-[65px] md:top-0 z-20 w-full ${
          isTask ? 'bg-primary/95 text-primary-foreground' : 'bg-accent/95 text-accent-foreground'
        } backdrop-blur-sm shadow-lg animate-in fade-in-0 slide-in-from-top-full`}
      >
        <div className="container mx-auto flex items-center justify-between gap-4 p-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <Timer className="h-6 w-6 shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 overflow-hidden">
              <p className="font-semibold text-base truncate">{item.title}</p>
              <div className="flex items-baseline gap-2">
                <p className="font-mono tracking-wider text-xl">{timeDisplay}</p>
                {isTask && isOvertime && (
                  <span className="text-xs font-sans uppercase text-destructive-foreground bg-destructive px-1 rounded">
                    Overtime
                  </span>
                )}
                {isPaused && (!isTask || !isOvertime) && (
                  <span className="text-xs font-sans uppercase">(Paused)</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={togglePause}
              className="hover:bg-white/20 px-2 sm:px-3"
            >
              {isPaused ? <Play /> : <Pause />}
              <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={completeTimer}
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
      {isTask && (
         <StopTimerDialog
          isOpen={isStopDialogOpen}
          onOpenChange={setStopDialogOpen}
          onConfirm={handleConfirmStopTask}
        />
      )}
    </>
  );
}

    