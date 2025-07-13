
'use client';
import React, {useState} from 'react';
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
import { useTasks } from '@/hooks/use-tasks';
import {StopTimerDialog} from './stop-timer-dialog';

interface TimerDialogProps {
  task: StudyTask;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onComplete: () => void; // Kept for chaining actions like closing dialogs
}

export function TimerDialog({task, isOpen, onOpenChange, onComplete}: TimerDialogProps) {
  const {
    activeItem,
    timeDisplay,
    isPaused,
    isOvertime,
    startTimer,
    togglePause,
    completeTimer,
    stopTimer,
  } = useTasks();

  const [isStopDialogOpen, setStopDialogOpen] = useState(false);

  const isTimerForThisTask = activeItem?.type === 'task' && activeItem.item.id === task.id;

  const handleStart = () => {
    startTimer(task);
  };
  
  const handleComplete = () => {
    completeTimer();
    onComplete(); // Call parent onComplete
    onOpenChange(false);
  };

  const handleOpenStopDialog = () => {
    if (!isPaused) {
      togglePause();
    }
    setStopDialogOpen(true);
  };

  const handleConfirmStop = (reason: string) => {
    stopTimer(reason);
    onOpenChange(false);
  };

  // If the dialog is open for a task, but a different timer is active, show a message.
  if (isOpen && activeItem && (!isTimerForThisTask)) {
    return (
       <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
           <DialogHeader>
            <DialogTitle>Another Timer is Active</DialogTitle>
            <DialogDescription>
              You can only have one timer running at a time. Please complete or stop the active timer for "{activeItem.item.title}" before starting a new one.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Main dialog render
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
              {isTimerForThisTask ? timeDisplay : `${String(task.duration).padStart(2, '0')}:00`}
            </div>
            {isOvertime && (
              <p className="mt-4 text-lg font-semibold text-destructive">
                Great focus! Keep going!
              </p>
            )}
          </div>
          <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {!isTimerForThisTask ? (
               <Button size="lg" onClick={handleStart} className="w-full sm:col-span-2">
                <Play className="mr-2" /> Start Timer
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={togglePause} className="w-full">
                  {isPaused ? <Play className="mr-2" /> : <Pause className="mr-2" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button size="lg" variant="outline" onClick={handleOpenStopDialog} className="w-full">
                  <XCircle className="mr-2" /> Stop
                </Button>
                <div className="sm:col-span-2">
                  <Button size="lg" onClick={handleComplete} className="w-full">
                    <CheckCircle className="mr-2" /> Mark as Completed
                  </Button>
                </div>
              </>
            )}
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
