'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Timer, Clock } from 'lucide-react';
import { Routine } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const TASK_TIMER_KEY = 'studySentinelActiveTimer';
const ROUTINE_TIMER_KEY = 'studySentinelActiveRoutineTimer';

interface RoutineDashboardCardProps {
  routine: Routine;
}

export function RoutineDashboardCard({ routine }: RoutineDashboardCardProps) {
  const { toast } = useToast();
  const [isTimerActiveForThis, setIsTimerActiveForThis] = useState(false);
  const [isAnyTimerActive, setIsAnyTimerActive] = useState(false);

  useEffect(() => {
    const checkTimers = () => {
      const taskTimer = localStorage.getItem(TASK_TIMER_KEY);
      const routineTimerRaw = localStorage.getItem(ROUTINE_TIMER_KEY);
      setIsAnyTimerActive(!!taskTimer || !!routineTimerRaw);
      if (routineTimerRaw) {
        try {
            const routineTimer = JSON.parse(routineTimerRaw);
            setIsTimerActiveForThis(routineTimer.routineId === routine.id);
        } catch {
            setIsTimerActiveForThis(false);
        }
      } else {
        setIsTimerActiveForThis(false);
      }
    };
    checkTimers();
    const interval = setInterval(checkTimers, 1000);
    window.addEventListener('storage', checkTimers);

    return () => {
        clearInterval(interval);
        window.removeEventListener('storage', checkTimers);
    };
  }, [routine.id]);

  const handleStartTimer = () => {
    if (isAnyTimerActive) {
      toast({
        variant: 'destructive',
        title: 'Another Timer is Active',
        description: 'You can only have one timer (task or routine) running at a time.',
      });
      return;
    }
    const routineTimer = {
      routineId: routine.id,
      startTime: Date.now(),
      isPaused: false,
      pausedDuration: 0,
    };
    localStorage.setItem(ROUTINE_TIMER_KEY, JSON.stringify(routineTimer));
    toast({
        title: "Routine Started!",
        description: `Timer for "${routine.title}" is now running.`
    })
  };

  return (
    <Card className="flex flex-col bg-card/70">
      <CardHeader>
        <CardTitle>{routine.title}</CardTitle>
        <CardDescription className="mt-1 flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4"/>
            <span>{routine.startTime} - {routine.endTime}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{routine.description || 'No description'}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleStartTimer} disabled={isAnyTimerActive} className="w-full">
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
