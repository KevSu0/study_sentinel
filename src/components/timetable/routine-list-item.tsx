
'use client';

import React, {useState, memo} from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {
  MoreVertical,
  PlayCircle,
  Pencil,
  Trash2,
  Clock,
  Timer,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Badge} from '@/components/ui/badge';
import {Routine} from '@/lib/types';
import {useToast} from '@/hooks/use-toast';
import {useGlobalState} from '@/hooks/use-global-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RoutineListItemProps {
  routine: Routine;
  onEdit: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
}

const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOrder = [1, 2, 3, 4, 5, 6, 0];

export const RoutineListItem = memo(function RoutineListItem({
  routine,
  onEdit,
  onDelete,
}: RoutineListItemProps) {
  const {toast} = useToast();
  const {
    state: {activeItem},
    startTimer,
    openRoutineLogDialog,
  } = useGlobalState();
  const [isAlertOpen, setAlertOpen] = useState(false);

  const isTimerActiveForThis =
    activeItem?.type === 'routine' && activeItem.item.id === routine.id;
  const isAnyTimerActive = !!activeItem;

  const handleStartTimer = () => {
    if (isAnyTimerActive && !isTimerActiveForThis) {
      toast({
        variant: 'destructive',
        title: 'Another Timer is Active',
        description:
          'You can only have one timer (task or routine) running at a time.',
      });
      return;
    }

    if (isTimerActiveForThis) {
      openRoutineLogDialog('stop');
    } else {
      startTimer(routine);
      toast({
        title: 'Routine Started!',
        description: `Timer for "${routine.title}" is now running.`,
      });
    }
  };

  const sortedDays = dayOrder.filter(day => routine.days.includes(day));

  const handleDeleteConfirm = () => {
    onDelete(routine.id);
    setAlertOpen(false);
  };

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start gap-2">
            <div>
              <CardTitle>{routine.title}</CardTitle>
              <CardDescription className="mt-1">
                {routine.description || 'No description'}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(routine)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setAlertOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {routine.startTime} - {routine.endTime}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {sortedDays.map(dayIndex => (
              <Badge key={dayIndex} variant="secondary">
                {daysMap[dayIndex]}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleStartTimer}
            disabled={isAnyTimerActive && !isTimerActiveForThis}
            className="w-full"
            variant={isTimerActiveForThis ? 'destructive' : 'default'}
          >
            {isTimerActiveForThis ? (
              <>
                <Timer className="mr-2 animate-pulse" />
                Stop Timer
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

      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the routine "{routine.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
