"use client";

import React, {useState, useMemo, useEffect} from 'react';
import {format} from 'date-fns';
import {Button} from '@/components/ui/button';
import {PlusCircle, Award, BarChart, Trophy} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks';
import {TaskList} from '@/components/tasks/task-list';
import {AddTaskDialog} from '@/components/tasks/add-task-dialog';
import {EmptyState} from '@/components/tasks/empty-state';
import {useToast} from '@/hooks/use-toast';
import {Skeleton} from '@/components/ui/skeleton';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Progress} from '@/components/ui/progress';
import {useGamification} from '@/hooks/use-gamification';

export default function DashboardPage() {
  const {tasks, addTask, updateTask, deleteTask, isLoaded} = useTasks();
  const { isLoaded: gamificationLoaded, score, level, levelProgress, pointsToNextLevel } = useGamification();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const {toast} = useToast();

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const upcomingTasks = useMemo(() => {
    const today = new Date(todayStr);
    today.setHours(0, 0, 0, 0);

    return tasks
      .filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        
        return task.status !== 'completed' && taskDate >= today;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [tasks, todayStr]);

  const overdueTasks = useMemo(() => {
    return tasks
      .filter(task => task.date < todayStr && task.status !== 'completed')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [tasks, todayStr]);


  useEffect(() => {
    const checkTasks = () => {
      if (!upcomingTasks.length) return;

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const todayFormatted = format(now, 'yyyy-MM-dd');

      const notifiedTasks = new Set(
        JSON.parse(sessionStorage.getItem('notifiedTasks') || '[]')
      );

      upcomingTasks.forEach(task => {
        if (
          task.date === todayFormatted &&
          task.time === currentTime &&
          task.status !== 'completed' &&
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
  }, [upcomingTasks, toast]);

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
            <Button onClick={() => setAddDialogOpen(true)} className="w-full sm:w-auto">
                <PlusCircle className="mr-2" />
                Add New Task
            </Button>
        </div>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-6">
        {/* Gamification Stats */}
        <section>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Level</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                {!gamificationLoaded ? <Skeleton className="h-8 w-1/4"/> : <div className="text-2xl font-bold">Level {level}</div>}
                <p className="text-xs text-muted-foreground">Keep up the great work!</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Score</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                {!gamificationLoaded ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{score}</div>}
                <p className="text-xs text-muted-foreground">Points earned from completed tasks</p>
                </CardContent>
            </Card>
            <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Next Level Progress</CardTitle>
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {!gamificationLoaded ? <Skeleton className="h-8 w-full"/> : 
                    <>
                        <div className="text-2xl font-bold">{pointsToNextLevel} pts to Level {level + 1}</div>
                        <Progress value={levelProgress} className="mt-2 h-2" />
                    </>
                    }
                </CardContent>
            </Card>
            </div>
        </section>

        {/* Task Lists */}
        <div className="space-y-6">
            {overdueTasks.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold text-destructive mb-3">Overdue Tasks</h2>
                    <TaskList
                        tasks={overdueTasks}
                        onUpdate={updateTask}
                        onDelete={deleteTask}
                    />
                </section>
            )}

            <section>
                <h2 className="text-xl font-semibold text-primary-dark mb-3">Upcoming Tasks</h2>
                {!isLoaded ? (
                <div className="space-y-4">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
                ) : upcomingTasks.length > 0 ? (
                <TaskList
                    tasks={upcomingTasks}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                />
                ) : (
                <EmptyState onAddTask={() => setAddDialogOpen(true)} title="No Upcoming Tasks" message="Your schedule is clear. Plan your next study session to get ahead!"/>
                )}
            </section>
        </div>
      </main>

      <AddTaskDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAddTask={addTask}
      />
    </div>
  );
}
