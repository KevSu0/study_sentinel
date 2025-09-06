'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {PlayCircle, Timer, Clock, Flame} from 'lucide-react';
import {Routine} from '@/lib/types';
import toast from 'react-hot-toast';
import {useGlobalState} from '@/hooks/use-global-state';
import {getPriorityCardStyles, getPriorityBadgeStyles} from '@/lib/priority-colors';
import {Badge} from '@/components/ui/badge';
import {cn} from '@/lib/utils';

interface RoutineCardProps {
  routine: Routine;
}

export const RoutineCard = React.memo(function RoutineCard({
  routine,
}: RoutineCardProps) {
  const {
    state: {activeAttempt},
    startTimer,
  } = useGlobalState();

  const isTimerActiveForThis =
    activeAttempt?.entityId === routine.id;
  const isAnyTimerActive = !!activeAttempt;

  const handleStartTimer = () => {
    if (isAnyTimerActive) {
      toast.error(
          'You can only have one timer (task or routine) running at a time.'
      );
      return;
    }
    startTimer(routine);
    toast.success(`Timer for "${routine.title}" is now running.`);
  };

  return (
    <Card className={cn(
      "flex flex-col border-l-4 transition-all duration-300",
      getPriorityCardStyles(routine.priority)
    )}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{routine.title}</CardTitle>
          <Badge 
            variant="outline" 
            className="text-xs font-mono bg-muted/50 text-muted-foreground border-muted-foreground/30"
          >
            {routine.shortId}
          </Badge>
        </div>
        <CardDescription className="mt-1 flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span>
            {routine.startTime} - {routine.endTime}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          {routine.description || 'No description'}
        </p>
        <div className="mt-3">
          <Badge
            variant="outline"
            className={cn(
              "capitalize flex items-center gap-1.5 w-fit",
              getPriorityBadgeStyles(routine.priority)
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            {routine.priority}
          </Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleStartTimer}
          disabled={isAnyTimerActive}
          className="w-full"
        >
          {isTimerActiveForThis ? (
            <>
              <Timer className="mr-2 animate-pulse text-green-400" />
              Timer Active
            </>
          ) : (
            <>
              <PlayCircle className="mr-2" />
              Start Infinity Timer
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
});
