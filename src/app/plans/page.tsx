
'use client';

import React, {useState, useMemo, useCallback} from 'react';
import dynamic from 'next/dynamic';
import {useGlobalState} from '@/hooks/use-global-state';
import {useViewMode} from '@/hooks/use-view-mode.tsx';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Button} from '@/components/ui/button';
import {TaskList} from '@/components/tasks/task-list';
import {SimpleTaskList} from '@/components/tasks/simple-task-list';
import {RoutineCard} from '@/components/routines/routine-card';
import {SimpleRoutineItem} from '@/components/routines/simple-routine-item';
import {EmptyState} from '@/components/tasks/empty-state';
import {Skeleton} from '@/components/ui/skeleton';
import {format} from 'date-fns';
import {
  CardCompletedRoutineItem,
  SimpleCompletedRoutineItem,
} from '@/components/dashboard/completed-routine-card';
import {
  LayoutGrid,
  List,
  Clock,
  PlusCircle,
  CalendarPlus,
  Repeat,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {StudyTask, Routine} from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';

const TaskDialog = dynamic(
  () => import('@/components/tasks/add-task-dialog').then(m => m.TaskDialog),
  {ssr: false}
);

const AddRoutineDialog = dynamic(
  () =>
    import('@/components/timetable/add-routine-dialog').then(
      m => m.AddRoutineDialog
    ),
  {ssr: false}
);

export default function PlansPage() {
  const {
    state,
    updateTask,
    archiveTask,
    unarchiveTask,
    pushTaskToNextDay,
    addTask,
    updateRoutine,
    addRoutine,
    deleteRoutine,
    onEditTask,
  } = useGlobalState();
  const {viewMode, setViewMode} = useViewMode();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);

  const [isRoutineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  const openAddTaskDialog = useCallback(() => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  }, []);

  const handleEditTask = useCallback((task: StudyTask) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  }, []);

  const openAddRoutineDialog = useCallback(() => {
    setEditingRoutine(null);
    setRoutineDialogOpen(true);
  }, []);

  const {
    isLoaded,
    tasks,
    logs,
    routines,
    activeItem,
    allCompletedWork,
  } = state;

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const selectedDayRoutines = useMemo(() => {
    if (!isLoaded) return [];
    return routines.filter(r => r.days.includes(selectedDate.getDay()));
  }, [routines, selectedDate, isLoaded]);

  const selectedDayTasks = useMemo(() => {
    if (!isLoaded) return [];
    return tasks.filter(task => task.date === selectedDateStr);
  }, [tasks, selectedDateStr, isLoaded]);

  const pendingTasks = useMemo(
    () =>
      selectedDayTasks.filter(
        t => t.status === 'todo' || t.status === 'in_progress'
      ),
    [selectedDayTasks]
  );

  const completedTasks = useMemo(
    () => selectedDayTasks.filter(t => t.status === 'completed'),
    [selectedDayTasks]
  );

  const completedRoutines = useMemo(() => {
    if (!isLoaded) return [];
    return logs.filter(
      l =>
        l.type === 'ROUTINE_SESSION_COMPLETE' &&
        l.timestamp.startsWith(selectedDateStr)
    );
  }, [logs, selectedDateStr, isLoaded]);

  const overdueTasks = useMemo(() => {
    if (!isLoaded) return [];
    return tasks.filter(
      task =>
        task.date < selectedDateStr &&
        task.status !== 'completed' &&
        task.status !== 'archived'
    );
  }, [tasks, selectedDateStr, isLoaded]);

  const productiveTimeForDay = useMemo(() => {
    if (!isLoaded) return 0;
    return allCompletedWork
      .filter(work => work.date === selectedDateStr)
      .reduce((sum, work) => sum + work.duration, 0);
  }, [allCompletedWork, selectedDateStr, isLoaded]);

  const formatProductiveTime = (totalSeconds: number) => {
    if (totalSeconds === 0) return '0s';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  };

  const renderTaskList = (tasksToRender: StudyTask[]) => {
    const props = {
      tasks: tasksToRender,
      onUpdate: updateTask,
      onArchive: archiveTask,
      onUnarchive: unarchiveTask,
      onPushToNextDay: pushTaskToNextDay,
      onEdit: handleEditTask,
      activeItem: activeItem,
    };
    return viewMode === 'card' ? (
      <TaskList {...props} />
    ) : (
      <SimpleTaskList {...props} />
    );
  };

  const renderRoutines = (routinesToRender: Routine[]) => {
    return viewMode === 'card' ? (
      <div className="grid gap-4 md:grid-cols-2">
        {routinesToRender.map(routine => (
          <RoutineCard key={routine.id} routine={routine} />
        ))}
      </div>
    ) : (
      <div className="space-y-2">
        {routinesToRender.map(routine => (
          <SimpleRoutineItem key={routine.id} routine={routine} />
        ))}
      </div>
    );
  };

  const renderCompletedRoutines = (logs: any[]) => {
    return viewMode === 'card' ? (
      <div className="space-y-4">
        {logs.map(log => (
          <CardCompletedRoutineItem key={log.id} log={log} />
        ))}
      </div>
    ) : (
      <div className="space-y-2">
        {logs.map(log => (
          <SimpleCompletedRoutineItem key={log.id} log={log} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Plans & Routines
            </h1>
            <p className="text-muted-foreground mt-1">
              Your agenda for {format(selectedDate, 'MMMM d, yyyy')}.
            </p>
            {isLoaded && (
              <div className="flex items-center gap-2 mt-2 text-sm font-medium text-accent">
                <Clock className="h-4 w-4" />
                <span>
                  Productive Time:{' '}
                  {formatProductiveTime(productiveTimeForDay)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={'outline'}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={date => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <PlusCircle /> Add New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={openAddTaskDialog}>
                  <CalendarPlus />
                  New Task
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={openAddRoutineDialog}>
                  <Repeat />
                  New Routine
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="sr-only">Card View</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
                <span className="sr-only">List View</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>

          {/* Upcoming Tab */}
          <TabsContent value="upcoming" className="mt-6 space-y-6">
            {!isLoaded ? (
              <Skeleton className="h-40 w-full" />
            ) : pendingTasks.length > 0 || selectedDayRoutines.length > 0 ? (
              <>
                {selectedDayRoutines.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-primary mb-3">
                      Routines for this Day
                    </h2>
                    {renderRoutines(selectedDayRoutines)}
                  </section>
                )}
                {pendingTasks.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-primary mb-3">
                      Pending Tasks
                    </h2>
                    {renderTaskList(pendingTasks)}
                  </section>
                )}
              </>
            ) : (
              <div className="pt-16">
                <EmptyState
                  onAddTask={openAddTaskDialog}
                  title="All Clear for this Day!"
                  message="No upcoming tasks or routines. Enjoy the peace or plan a new task."
                  buttonText="Plan New Task"
                />
              </div>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="mt-6 space-y-6">
            {!isLoaded ? (
              <Skeleton className="h-40 w-full" />
            ) : completedTasks.length > 0 || completedRoutines.length > 0 ? (
              <>
                {completedRoutines.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-primary mb-3">
                      Completed Routines
                    </h2>
                    {renderCompletedRoutines(completedRoutines)}
                  </section>
                )}
                {completedTasks.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-primary mb-3">
                      Completed Tasks
                    </h2>
                    {renderTaskList(completedTasks)}
                  </section>
                )}
              </>
            ) : (
              <div className="pt-16">
                <EmptyState
                  onAddTask={openAddTaskDialog}
                  title="Nothing Completed Yet"
                  message="Get started on your tasks to see your achievements here."
                  buttonText="View Upcoming Tasks"
                />
              </div>
            )}
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue" className="mt-6">
            {!isLoaded ? (
              <Skeleton className="h-40 w-full" />
            ) : overdueTasks.length > 0 ? (
              <section>
                <h2 className="text-xl font-semibold text-destructive mb-3">
                  Overdue Tasks
                </h2>
                {renderTaskList(overdueTasks)}
              </section>
            ) : (
              <div className="pt-16">
                <EmptyState
                  onAddTask={openAddTaskDialog}
                  title="No Overdue Tasks"
                  message="Great job staying on top of your work!"
                  buttonText="View All Tasks"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {isTaskDialogOpen && (
        <TaskDialog
          isOpen={isTaskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          onAddTask={addTask}
          onUpdateTask={updateTask}
          taskToEdit={editingTask}
        />
      )}

      {isRoutineDialogOpen && (
        <AddRoutineDialog
          isOpen={isRoutineDialogOpen}
          onOpenChange={setRoutineDialogOpen}
          onAddRoutine={addRoutine}
          onUpdateRoutine={updateRoutine}
          routineToEdit={editingRoutine}
        />
      )}
    </div>
  );
}
