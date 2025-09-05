'use client';
import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useGlobalState } from '@/hooks/use-global-state';
import { StudyTask, Routine } from '@/lib/types';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { PlayCircle, Timer, Repeat, RotateCw, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

interface QuickStartItemProps {
    item: StudyTask | Routine;
    onStart: (item: StudyTask | Routine) => void;
    isAnyTimerActive: boolean;
    isCompleted: boolean;
}

type CompletedActivity = Extract<ActivityFeedItem, { attempt: { status: 'COMPLETED' } }>;

const QuickStartItem = ({ item, onStart, isAnyTimerActive, isCompleted }: QuickStartItemProps) => {
    const isTask = 'timerType' in item;
    return (
        <div className={cn(
            "flex items-center gap-3 p-3 border rounded-lg transition-colors",
            isCompleted ? "bg-muted/50 border-dashed" : "bg-card"
        )}>
            <div className="flex-shrink-0">
                {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                ) : isTask ? (
                    <Timer className="h-5 w-5 text-primary" />
                ) : (
                    <Repeat className="h-5 w-5 text-purple-500" />
                )}
            </div>
            <div className="flex-1 overflow-hidden">
                <p className={cn("font-medium truncate", isCompleted && "line-through text-muted-foreground")}>
                    {item.title}
                </p>
                <p className="text-xs text-muted-foreground">
                    {isTask ? `Task - ${item.duration || '∞'} min` : `Routine - ${item.startTime}`}
                </p>
            </div>
            <Button 
                size="sm" 
                onClick={() => onStart(item)} 
                disabled={isAnyTimerActive && !isCompleted}
                variant={isCompleted ? "outline" : "default"}
            >
                {isCompleted ? (
                    <>
                     <RotateCw className="mr-2 h-4 w-4" /> Redo
                    </>
                ) : (
                    <>
                     <PlayCircle className="mr-2 h-4 w-4" /> Start
                    </>
                )}
            </Button>
        </div>
    );
};

export function QuickStartSheet() {
    const { state, closeQuickStart, startTimer } = useGlobalState();
    const { quickStartOpen, tasks, routines, activeAttempt, todaysActivity } = state;

    const { todaysItems, completedItemIds } = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        const upcomingTasks = tasks.filter(
          (t) => t.date === todayStr && t.status !== 'archived'
        );
        const todaysRoutines = routines.filter((r) =>
          r.days.includes(new Date().getDay())
        );

        const allTodaysItems = [...upcomingTasks, ...todaysRoutines].sort((a, b) => {
            const timeA = 'time' in a ? a.time : a.startTime;
            const timeB = 'time' in b ? b.time : b.startTime;
            return timeA.localeCompare(timeB);
        });

        const completedIds = new Set(
            todaysActivity
                .filter((activity): activity is CompletedActivity =>
                    'attempt' in activity && activity.attempt.status === 'COMPLETED'
                )
                .map(activity => activity.template.id)
        );

        return { todaysItems: allTodaysItems, completedItemIds: completedIds };
    }, [tasks, routines, todaysActivity]);

    const handleStartTimer = (item: StudyTask | Routine) => {
        startTimer(item);
        toast.success(`Timer started for "${item.title}"`);
        closeQuickStart();
    };

    return (
        <Sheet open={quickStartOpen} onOpenChange={closeQuickStart}>
            <SheetContent side="bottom" className="h-[60vh] flex flex-col">
                <SheetHeader>
                    <SheetTitle>Quick Start Today's Session</SheetTitle>
                    <SheetDescription>
                        Select a task or routine to begin your focus session immediately.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-3 py-4">
                        {todaysItems.length > 0 ? (
                            todaysItems.map((item) => (
                                <QuickStartItem 
                                    key={item.id} 
                                    item={item} 
                                    onStart={handleStartTimer}
                                    isAnyTimerActive={!!activeAttempt}
                                    isCompleted={completedItemIds.has(item.id)}
                                />
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground py-10">
                                <p>No upcoming tasks or routines for today.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
