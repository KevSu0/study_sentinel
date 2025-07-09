
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
    const checkOverdueTasks = () => {
        const now = new Date();
        const notifiedOverdue = new Set(JSON.parse(sessionStorage.getItem('notifiedOverdueTasks') || '[]'));

        tasks.forEach(task => {
            if (task.status === 'completed' || notifiedOverdue.has(task.id)) {
                return;
            }
            
            // Create a local date time object from task date and time
            const taskStartDateTime = new Date(`${task.date}T${task.time}`);
            const taskEndDateTime = new Date(taskStartDateTime.getTime() + task.duration * 60000);

            if (now > taskEndDateTime) {
                toast({
                    variant: 'destructive',
                    title: `Task Overdue: ${task.title}`,
                    description: "Time's up! Mark it complete to claim your points, or it will remain overdue.",
                });
                notifiedOverdue.add(task.id);
                sessionStorage.setItem('notifiedOverdueTasks', JSON.stringify([...notifiedOverdue]));
            }
        });
    };

    const intervalId = setInterval(checkOverdueTasks, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [tasks, toast]);


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
