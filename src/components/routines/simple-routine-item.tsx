'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, Timer, Clock, CheckCircle } from 'lucide-react';
import type { Routine } from '@/lib/types';
import toast from 'react-hot-toast';
import { useGlobalState } from '@/hooks/use-global-state';
import { cn } from '@/lib/utils';

interface SimpleRoutineItemProps {
  routine: Routine;
  onEdit: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
  onComplete: (routine: Routine) => void;
}

export const SimpleRoutineItem = React.memo(function SimpleRoutineItem({ routine, onEdit, onDelete, onComplete }: SimpleRoutineItemProps) {
  const {
    state: { activeItem },
    startTimer,
  } = useGlobalState();

  const isTimerActiveForThis =
    activeItem?.type === 'routine' && activeItem.item.id === routine.id;
  const isAnyTimerActive = !!activeItem;

  const handleStartTimer = () => {
    if (isAnyTimerActive) {
      toast.error('You can only have one timer (task or routine) running at a time.');
      return;
    }
    startTimer(routine);
    toast.success(`Timer for "${routine.title}" is now running.`);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-3 border rounded-lg transition-colors hover:bg-muted/50',
        isTimerActiveForThis && 'ring-2 ring-primary'
      )}
    >
      <div className="flex-1 grid gap-1">
        <p className="font-medium">{routine.title}</p>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {routine.startTime} - {routine.endTime}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onComplete(routine)}
          aria-label="Mark as complete"
        >
          <CheckCircle className="h-5 w-5 text-muted-foreground hover:text-green-500 transition-colors" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStartTimer}
          disabled={isAnyTimerActive}
          className="w-24"
        >
          {isTimerActiveForThis ? (
            <>
              <Timer className="mr-2 animate-pulse text-green-400" />
              Active
            </>
          ) : (
            <>
              <PlayCircle className="mr-2" />
              Start
            </>
          )}
        </Button>
      </div>
    </div>
  );
});
