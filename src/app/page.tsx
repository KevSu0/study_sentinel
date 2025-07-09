"use client";

import React, {useState, useMemo, useEffect} from 'react';
import {format} from 'date-fns';
import {Button} from '@/components/ui/button';
import {PlusCircle} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks';
import {TaskList} from '@/components/tasks/task-list';
import {AddTaskDialog} from '@/components/tasks/add-task-dialog';
import {EmptyState} from '@/components/tasks/empty-state';
import {useToast} from '@/hooks/use-toast';
import {Skeleton} from '@/components/ui/skeleton';

export default function DashboardPage() {
  const {tasks, addTask, updateTask, deleteTask, isLoaded} = useTasks();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const {toast} = useToast();

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const todayTasks = useMemo(() => {
    return tasks
      .filter(task => task.date === today)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [tasks, today]);

  useEffect(() => {
    const checkTasks = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      const notifiedTasks = new Set(
        JSON.parse(sessionStorage.getItem('notifiedTasks') || '[]')
      );

      todayTasks.forEach(task => {
        if (
          task.time === currentTime &&
          task.status !== 'completed' &&
          !notifiedTasks.has(task.id)
        ) {
          toast({
            title: `Time for: ${task.title}`,
            description: "It's time to start your scheduled task. Let's get to it!",
          });
          notifiedTasks.add(task.id);
        }
      });
      sessionStorage.setItem('notifiedTasks', JSON.stringify([...notifiedTasks]));
    };

    const intervalId = setInterval(checkTasks, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [todayTasks, toast]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-primary">Today's Focus</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <PlusCircle className="mr-2" />
          Add Task
        </Button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {!isLoaded ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : todayTasks.length > 0 ? (
          <TaskList
            tasks={todayTasks}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        ) : (
          <EmptyState onAddTask={() => setAddDialogOpen(true)} />
        )}
      </main>

      <AddTaskDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAddTask={addTask}
      />
    </div>
  );
}
