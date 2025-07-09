
"use client";

import React, {useState, useMemo, useEffect, lazy, Suspense} from 'react';
import {format} from 'date-fns';
import {Button} from '@/components/ui/button';
import {PlusCircle} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks';
import {TaskList} from '@/components/tasks/task-list';
import {EmptyState} from '@/components/tasks/empty-state';
import {useToast} from '@/hooks/use-toast';
import {Skeleton} from '@/components/ui/skeleton';
import { type StudyTask } from '@/lib/types';
import { useBadges } from '@/hooks/useBadges';

const TaskDialog = lazy(() => import('@/components/tasks/add-task-dialog').then(m => ({ default: m.TaskDialog })));

export default function DashboardPage() {
  const {tasks, addTask, updateTask, deleteTask, isLoaded} = useTasks();
  useBadges(); // Initialize badge checking
  
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const {toast} = useToast();
  
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

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const { overdueTasks, todaysTasks, upcomingTasks } = useMemo(() => {
    const overdue: StudyTask[] = [];
    const todays: StudyTask[] = [];
    const upcoming: StudyTask[] = [];

    const sortFn = (a: StudyTask, b: StudyTask) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
    
    tasks.forEach(task => {
        if (task.status === 'completed') return;
        
        if (task.date < todayStr) {
            overdue.push(task);
        } else if (task.date === todayStr) {
            todays.push(task);
        } else {
            upcoming.push(task);
        }
    });

    return { 
      overdueTasks: overdue.sort(sortFn),
      todaysTasks: todays.sort(sortFn),
      upcomingTasks: upcoming.sort(sortFn)
    };
  }, [tasks, todayStr]);


  useEffect(() => {
    const checkTasks = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const todayFormatted = format(now, 'yyyy-MM-dd');

      const notifiedTasks = new Set(
        JSON.parse(sessionStorage.getItem('notifiedTasks') || '[]')
      );

      todaysTasks.forEach(task => {
        if (
          task.time === currentTime &&
          !notifiedTasks.has(task.id)
        ) {
          toast({
            title: `Time for: ${task.title}`,
            description: "It's time to start your scheduled task. Let's get to it!",
          });
          notifiedTasks.add(task.id);
          sessionStorage.setItem('notifiedTasks', JSON.stringify([...notifiedTasks]));
        }
      });
    };

    const intervalId = setInterval(checkTasks, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [todaysTasks, toast]);

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
                <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
                <p className="text-muted-foreground">
                    Your study command center.
                </p>
            </div>
            <Button onClick={openAddTaskDialog} className="w-full sm:w-auto">
                <PlusCircle className="mr-2" />
                Add New Task
            </Button>
        </div>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-6">
        {!isLoaded ? (
          <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
              {overdueTasks.length > 0 && (
                  <section>
                      <h2 className="text-xl font-semibold text-destructive mb-3">Overdue Tasks</h2>
                      <TaskList
                          tasks={overdueTasks}
                          onUpdate={updateTask}
                          onDelete={deleteTask}
                          onEdit={openEditTaskDialog}
                      />
                  </section>
              )}

              {todaysTasks.length > 0 && (
                  <section>
                      <h2 className="text-xl font-semibold text-primary mb-3">Today's Tasks</h2>
                      <TaskList
                          tasks={todaysTasks}
                          onUpdate={updateTask}
                          onDelete={deleteTask}
                          onEdit={openEditTaskDialog}
                      />
                  </section>
              )}
              
              {upcomingTasks.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold text-primary-dark mb-3">Upcoming Tasks</h2>
                    <TaskList
                        tasks={upcomingTasks}
                        onUpdate={updateTask}
                        onDelete={deleteTask}
                        onEdit={openEditTaskDialog}
                    />
                </section>
              )}

              {tasks.length === 0 && (
                  <EmptyState onAddTask={() => setAddDialogOpen(true)} title="No Tasks Yet" message="Your schedule is clear. Plan your next study session to get ahead!"/>
              )}

              {tasks.length > 0 && overdueTasks.length === 0 && todaysTasks.length === 0 && upcomingTasks.length === 0 && (
                  <EmptyState onAddTask={() => setAddDialogOpen(true)} title="All Caught Up!" message="No pending tasks. Time to plan your next move or enjoy a well-deserved break!"/>
              )}
          </div>
        )}
      </main>

      <Suspense fallback={null}>
        <TaskDialog
          isOpen={isTaskFormOpen}
          onOpenChange={(open) => !open && closeTaskFormDialog()}
          onAddTask={addTask}
          onUpdateTask={updateTask}
          taskToEdit={editingTask}
        />
      </Suspense>
    </div>
  );
}
