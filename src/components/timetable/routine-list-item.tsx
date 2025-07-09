import React, { memo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, PlayCircle, Pencil, Trash2, Clock, Timer } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Routine } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const TASK_TIMER_KEY = 'studySentinelActiveTimer';
const ROUTINE_TIMER_KEY = 'studySentinelActiveRoutineTimer';

interface RoutineListItemProps {
  routine: Routine;
  onEdit: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
}

const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOrder = [1, 2, 3, 4, 5, 6, 0];

export const RoutineListItem = memo(function RoutineListItem({ routine, onEdit, onDelete }: RoutineListItemProps) {
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

  const sortedDays = dayOrder.filter(d => routine.days.includes(d));

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
            <div>
                <CardTitle>{routine.title}</CardTitle>
                <CardDescription className="mt-1">{routine.description || 'No description'}</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(routine)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                     <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the routine "{routine.title}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(routine.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4"/>
            <span>{routine.startTime} - {routine.endTime}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {sortedDays.map(dayIndex => (
            <Badge key={dayIndex} variant="secondary">{daysMap[dayIndex]}</Badge>
          ))}
        </div>
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
});
