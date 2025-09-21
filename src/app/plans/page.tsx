
'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useGlobalState } from '@/hooks/use-global-state';
import { useViewMode } from '@/hooks/use-view-mode';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, parseISO } from 'date-fns';
import {
  Plus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { ViewModeToggle } from '@/components/plans/view-mode-toggle';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { PlanItemCard } from '@/components/plans/plan-item-card';
import { PlanListItem } from '@/components/plans/plan-item-list-item';
import { EmptyState } from '@/components/tasks/empty-state';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { StudyTask, Routine, LogEvent } from '@/lib/types';
import toast from 'react-hot-toast';
import { CompletedTodayWidget } from '@/components/dashboard/widgets/completed-today-widget';
import { ActivityInsights } from '@/components/plans/activity-insights';
import { cn } from '@/lib/utils';

const AddItemDialog = dynamic(
  () => import('@/components/tasks/add-task-dialog').then((m) => m.AddItemDialog),
  { ssr: false }
);

type PlanItem =
  | { type: 'task'; data: StudyTask }
  | { type: 'routine'; data: Routine };

type CompletedPlanItem =
  | { type: 'completed_task'; data: StudyTask; completed_at: string; timestamp: number; logId: string; }
  | { type: 'completed_routine'; data: LogEvent; completed_at: string; timestamp: number };

export default function PlansPage() {
  const {
    state,
    updateTask,
    pushTaskToNextDay,
    addTask,
    updateRoutine,
    addRoutine,
    deleteRoutine,
    addLog,
    removeLog,
    updateLog,
  } = useGlobalState();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StudyTask | Routine | null>(null);
  const [editingItemType, setEditingItemType] = useState<'task' | 'routine' | undefined>(undefined);

  const { viewMode, setViewMode } = useViewMode();
  const { isEnabled } = useFeatureFlags();
  const { isLoaded, tasks, logs, routines, todaysActivity } = state;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const { upcomingItems, overdueTasks } = useMemo(() => {
    if (!isLoaded) {
      return { upcomingItems: [], overdueTasks: [] };
    }

    const selectedDayRoutines = routines.filter((r) => r.days.includes(selectedDate.getDay()));
    
    const completedRoutineLogsForDay = todaysActivity.filter(
        (activity) => activity.type === 'ROUTINE_COMPLETE' && activity.timestamp.startsWith(selectedDateStr) && !activity.data.isUndone
    ).map(activity => activity.data as LogEvent);

    const completedRoutineIds = new Set(completedRoutineLogsForDay.map((l) => l.payload.routineId));

    const upcomingRoutines: PlanItem[] = selectedDayRoutines
      .filter((r) => !completedRoutineIds.has(r.id))
      .map((r) => ({ type: 'routine', data: r }));

    const selectedDayTasks = tasks.filter((task) => task.date === selectedDateStr);
    const upcomingTasks: PlanItem[] = selectedDayTasks
      .filter((t) => t.status === 'todo' || t.status === 'in_progress')
      .map((t) => ({ type: 'task', data: t }));

    const allUpcoming = [...upcomingRoutines, ...upcomingTasks].sort((a, b) => {
      const timeA = a.type === 'task' ? a.data.time : a.data.startTime;
      const timeB = b.type === 'task' ? b.data.time : b.data.startTime;
      return (timeA || '').localeCompare(timeB || '');
    });
    
    const overdue = tasks.filter(
      (task) => task.date < todayStr && task.status !== 'completed' && task.status !== 'archived'
    );

    return {
      upcomingItems: allUpcoming,
      overdueTasks: overdue,
    };
  }, [isLoaded, routines, tasks, selectedDate, selectedDateStr, todayStr, todaysActivity]);

  const openAddItemDialog = (type: 'task' | 'routine', item: StudyTask | Routine | null) => {
    setEditingItem(item);
    setEditingItemType(type);
    setAddItemDialogOpen(true);
  }

  const changeDate = (amount: number) => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + amount);
      return newDate;
    });
  };

  const handleCompleteRoutine = (routine: Routine) => {
    addLog('ROUTINE_SESSION_COMPLETE', {
      routineId: routine.id,
      title: routine.title,
      duration: 0,
      points: 10,
      studyLog: 'Completed manually.',
      timestamp: new Date().toISOString(),
    });
    toast.success(`Routine "${routine.title}" marked as complete.`);
  };

  const handleUndoCompleteRoutine = (logId: string) => {
    updateLog(logId, { isUndone: true });
    toast.success('Routine completion undone.');
  };

  const handleHardUndo = (item: CompletedPlanItem) => {
    if (item.type === 'completed_routine') {
      removeLog(item.data.id);
      toast.error('Routine completion permanently removed.');
    } else {
      const logEntry = logs.find(l => l.id === item.logId);
      if (logEntry) {
        removeLog(logEntry.id);
      }
      updateTask({ ...item.data, status: 'todo' });
      toast.error('Task completion has been permanently reset.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900/50">
      <header className="p-2 sm:p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} aria-label="Previous day">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={'outline'} className="text-sm sm:text-base font-semibold w-32 sm:w-40 justify-center">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
                 <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setSelectedDate(new Date())} disabled={isToday(selectedDate)} aria-label="Go to Today">
                       Go to Today
                    </Button>
                 </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={() => changeDate(1)} aria-label="Next day">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
           <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-6 pb-28">
        {!isLoaded ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-xl font-bold text-primary px-2 mb-3">Upcoming</h2>
              {upcomingItems.length > 0 ? (
                <div className={cn("space-y-4", viewMode === 'list' && "space-y-1")}>
                  {upcomingItems.map((item, index) => {
                    const PlanComponent = viewMode === 'card' ? PlanItemCard : PlanListItem;
                    return (
                        <PlanComponent
                        key={`${item.type}-${item.data.id}-${index}`}
                        item={item}
                        onEditTask={(task) => openAddItemDialog('task', task)}
                        onEditRoutine={(routine) => openAddItemDialog('routine', routine)}
                        onDeleteRoutine={deleteRoutine}
                        onCompleteRoutine={handleCompleteRoutine}
                        onUpdateTask={updateTask}
                        onPushTaskToNextDay={pushTaskToNextDay}
                        />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-8 bg-background rounded-lg">
                  Nothing scheduled for this day.
                </div>
              )}
            </section>

            {overdueTasks.length > 0 && (
              <section>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="overdue">
                    <AccordionTrigger className="text-xl font-bold text-destructive px-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Overdue ({overdueTasks.length})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-3 space-y-4">
                      {overdueTasks.map((task) => (
                        <PlanItemCard
                          key={`overdue-${task.id}`}
                          item={{ type: 'task', data: task }}
                          onEditTask={(task) => openAddItemDialog('task', task)}
                          onUpdateTask={updateTask}
                          onPushTaskToNextDay={pushTaskToNextDay}
                        />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>
            )}
            
            <Separator />

            <CompletedTodayWidget
              todaysActivity={todaysActivity.filter(activity => activity.timestamp.startsWith(selectedDateStr))}
              viewMode={viewMode}
              onUndoComplete={(item) => {
                if (item.type === 'completed_routine') {
                  handleUndoCompleteRoutine(item.data.id);
                } else {
                  updateTask({ ...item.data, status: 'todo' });
                  toast.success('Task marked as not complete.');
                }
              }}
              onHardUndoComplete={handleHardUndo}
            />

            {/* Activity Insights for the first upcoming item */}
            {upcomingItems.length > 0 && isEnabled('activity_insights') && (
              <ActivityInsights
                activityId={upcomingItems[0].data.id}
                activityTitle={upcomingItems[0].data.title}
                activityType={upcomingItems[0].type}
              />
            )}

             {upcomingItems.length === 0 && overdueTasks.length === 0 && todaysActivity.filter(activity => activity.timestamp.startsWith(selectedDateStr)).length === 0 && (
                 <div className="pt-16">
                    <EmptyState
                    onAddTask={() => openAddItemDialog('task', null)}
                    title="A Blank Slate!"
                    message="Your schedule for this day is empty. Add a task or routine to get started."
                    buttonText="Add New Item"
                    />
                </div>
            )}
          </>
        )}
      </main>

       <Button 
            className="fixed bottom-28 right-4 rounded-full h-16 w-16 shadow-lg z-30 md:right-8 md:bottom-8"
            onClick={() => openAddItemDialog('task', null)}
        >
        <Plus className="h-8 w-8" />
        <span className="sr-only">Add New Item</span>
      </Button>

      {isAddItemDialogOpen && (
        <AddItemDialog
            isOpen={isAddItemDialogOpen}
            onOpenChange={setAddItemDialogOpen}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onAddRoutine={addRoutine}
            onUpdateRoutine={updateRoutine}
            editingItem={editingItem}
            itemType={editingItemType}
            selectedDate={selectedDate}
        />
      )}
    </div>
  );
}

