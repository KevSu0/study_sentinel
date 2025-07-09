'use client';
import React, {useState, useMemo, lazy, Suspense} from 'react';
import {Button} from '@/components/ui/button';
import {PlusCircle, X} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks';
import {TaskList} from '@/components/tasks/task-list';
import {EmptyState} from '@/components/tasks/empty-state';
import {Skeleton} from '@/components/ui/skeleton';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Calendar} from '@/components/ui/calendar';
import type {StudyTask} from '@/lib/types';
import {format} from 'date-fns';

const TaskDialog = lazy(() =>
  import('@/components/tasks/add-task-dialog').then(m => ({
    default: m.TaskDialog,
  }))
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
    isLoaded,
  } = useTasks();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const isTaskFormOpen = isAddDialogOpen || !!editingTask;

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

  return (
    <div className="flex flex-col h-full">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">All Tasks</h1>
          <p className="text-muted-foreground">
            View and manage all your study tasks.
          </p>
        </div>
        <Button onClick={openAddTaskDialog} className="w-full sm:w-auto">
          <PlusCircle className="mr-2" />
          Add New Task
        </Button>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-auto lg:min-w-[320px]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filter Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs
                  value={filter}
                  onValueChange={value => setFilter(value as TaskFilter)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="todo">To Do</TabsTrigger>
                    <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">By Date</h3>
                    {selectedDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDate(undefined)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border p-0"
                  />
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="flex-1">
            {!isLoaded ? (
              <div className="space-y-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : filteredTasks.length > 0 ? (
              <TaskList
                tasks={filteredTasks}
                onUpdate={updateTask}
                onArchive={archiveTask}
                onUnarchive={unarchiveTask}
                onPushToNextDay={pushTaskToNextDay}
                onEdit={openEditTaskDialog}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <EmptyState
                  onAddTask={openAddTaskDialog}
                  title={`No tasks found`}
                  message="Try adjusting your filters or create a new task to get started!"
                  buttonText="Create Task"
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <Suspense fallback={null}>
        <TaskDialog
          isOpen={isTaskFormOpen}
          onOpenChange={open => !open && closeTaskFormDialog()}
          onAddTask={addTask}
          onUpdateTask={updateTask}
          taskToEdit={editingTask}
        />
      </Suspense>
    </div>
  );
}
