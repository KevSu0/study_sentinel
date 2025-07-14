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
import {PlayCircle, Timer, Clock} from 'lucide-react';
import {Routine} from '@/lib/types';
import {useToast} from '@/hooks/use-toast';
import {useGlobalState} from '@/hooks/use-global-state';

interface RoutineDashboardCardProps {
  routine: Routine;
}

export function RoutineDashboardCard({routine}: RoutineDashboardCardProps) {
  const {toast} = useToast();
  const {
    state: {activeItem},
    startTimer,
  } = useGlobalState();

  const isTimerActiveForThis =
    activeItem?.type === 'routine' && activeItem.item.id === routine.id;
  const isAnyTimerActive = !!activeItem;

  const handleStartTimer = () => {
    if (isAnyTimerActive) {
      toast({
        variant: 'destructive',
        title: 'Another Timer is Active',
        description:
          'You can only have one timer (task or routine) running at a time.',
      });
      return;
    }
    startTimer(routine);
    toast({
      title: 'Routine Started!',
      description: `Timer for "${routine.title}" is now running.`,
    });
  };

  return (
    <Card className="flex flex-col bg-card/70">
      <CardHeader>
        <CardTitle>{routine.title}</CardTitle>
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
}
