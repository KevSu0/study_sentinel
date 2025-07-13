
'use client';
import React, {useState, useMemo} from 'react';
import dynamic from 'next/dynamic';
import {Button} from '@/components/ui/button';
import {
  PlusCircle,
  X,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks.tsx';
import {TaskList} from '@/components/tasks/task-list';
import {SimpleTaskList} from '@/components/tasks/simple-task-list';
import {EmptyState} from '@/components/tasks/empty-state';
import {Skeleton} from '@/components/ui/skeleton';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Calendar} from '@/components/ui/calendar';
import type {StudyTask} from '@/lib/types';
import {format} from 'date-fns';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {cn} from '@/lib/utils';
import {useViewMode} from '@/hooks/use-view-mode.tsx';

const TaskDialog = dynamic(
  () => import('@/components/tasks/add-task-dialog').then(m => m.TaskDialog),
  {ssr: false}
);

type TaskFilter = 'all' | 'todo' | 'in_progress' | 'completed';

export default function AllTasksPage() {
  const {
    tasks,
    addTask,
    updateTask,
    archiveTask,
    unarchiveTask,
    pushTaskToNextDay,
    isLoaded: tasksLoaded,
  } = useTasks();
  const {viewMode, setViewMode, isLoaded: viewModeLoaded} = useViewMode();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);

  const isTaskFormOpen = isAddDialogOpen || !!editingTask;
  const isLoaded = tasksLoaded && viewModeLoaded;

  const openAddTaskDialog = () => {
    setEditingTask(null);
    setAddDialogOpen(true);
  };

  const openEditTaskDialog = (task: StudyTask) => {
    setAddDialogOpen(false);
    setEditingTask(task);
  };

  const closeTaskFormDialog = () => {
    setAddDialogOpen(false);
    setEditingTask(null);
  };

  const filteredTasks = useMemo(() => {
    let activeTasks = tasks.filter(task => task.status !== 'archived');

    let tasksByStatus = activeTasks;
    if (filter !== 'all') {
      tasksByStatus = activeTasks.filter(task => task.status === filter);
    }

    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      return tasksByStatus.filter(task => task.date === dateStr);
    }

    return tasksByStatus;
  }, [tasks, filter, selectedDate]);

  const hasFilters = filter !== 'all' || !!selectedDate;

  const renderTaskList = () => {
    const props = {
      tasks: filteredTasks,
      onUpdate: updateTask,
      onArchive: archiveTask,
      onUnarchive: unarchiveTask,
      onPushToNextDay: pushTaskToNextDay,
      onEdit: openEditTaskDialog,
    };
    if (viewMode === 'card') {
      return <TaskList {...props} />;
    }
    return <SimpleTaskList {...props} />;
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b gap-2">
        <div>
          <h1 className="text-3xl font-bold text-primary">All Tasks</h1>
          <p className="text-muted-foreground">
            View and manage all your study tasks.
          </p>
        </div>
        <Button onClick={openAddTaskDialog} className="w-full sm:w-auto">
          <PlusCircle className="mr-2" />
          Add New Task
        </Button>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-6">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Tabs
            value={filter}
            onValueChange={value => setFilter(value as TaskFilter)}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="todo">To Do</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>

          <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal sm:w-auto',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, 'PPP')
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => {
                  setSelectedDate(date);
                  setDatePickerOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                setFilter('all');
                setSelectedDate(undefined);
              }}
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}

          <div className="flex-1" />

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

        {/* Task List Section */}
        <div className="flex-1">
          {!isLoaded ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : filteredTasks.length > 0 ? (
            renderTaskList()
          ) : (
            <div className="flex items-center justify-center h-full pt-16">
              <EmptyState
                onAddTask={openAddTaskDialog}
                title={
                  hasFilters ? 'No Tasks Match Your Filters' : 'No Tasks Yet'
                }
                message={
                  hasFilters
                    ? 'Try adjusting or clearing your filters to see more tasks.'
                    : 'Create a new task to get started on your study journey!'
                }
                buttonText="Create First Task"
              />
            </div>
          )}
        </div>
      </main>

      <TaskDialog
        isOpen={isTaskFormOpen}
        onOpenChange={open => !open && closeTaskFormDialog()}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        taskToEdit={editingTask}
      />
    </div>
  );
}
