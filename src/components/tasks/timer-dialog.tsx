'use client';

import React, {useState, useEffect, useRef} from 'react';
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

interface TimerDialogProps {
  task: StudyTask;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onComplete: () => void;
}

export function TimerDialog({
  task,
  isOpen,
  onOpenChange,
  onComplete,
}: TimerDialogProps) {
  const [timeRemaining, setTimeRemaining] = useState(task.duration * 60);
  const [isPaused, setIsPaused] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const {fire} = useConfetti();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Only create audio element on client side
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(
        'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
      );
      audioRef.current.volume = 0.5;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset timer when dialog opens
      setTimeRemaining(task.duration * 60);
      setIsPaused(true);
      setIsFinished(false);
    }
  }, [isOpen, task.duration]);

  useEffect(() => {
    if (isPaused || !isOpen || isFinished) {
      return;
    }

    const timerId = setInterval(() => {
      setTimeRemaining(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerId);
          setIsFinished(true);
          fire();
          audioRef.current?.play().catch(e => console.error("Error playing sound:", e));
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isPaused, isOpen, isFinished, fire]);

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
  };

  const handleStop = () => {
    onOpenChange(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
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
              Session Complete!
            </p>
          )}
        </div>
        <DialogFooter className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {!isFinished ? (
            <>
              <Button size="lg" onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? (
                  <Play className="mr-2" />
                ) : (
                  <Pause className="mr-2" />
                )}
                {isPaused ? 'Start' : 'Pause'}
              </Button>
              <Button size="lg" variant="outline" onClick={handleStop}>
                <XCircle className="mr-2" />
                Stop
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleComplete}
                className="border-accent text-accent hover:bg-accent/10 hover:text-accent"
              >
                <CheckCircle className="mr-2" />
                Complete
              </Button>
            </>
          ) : (
            <Button size="lg" onClick={handleComplete} className="sm:col-span-3">
              <CheckCircle className="mr-2" />
              Mark Task as Completed
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
