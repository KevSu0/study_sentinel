'use client';

import React, {useState, useMemo, lazy, Suspense} from 'react';
import {format} from 'date-fns';
import {Button} from '@/components/ui/button';
import {PlusCircle, Star, Award as BadgeIcon, Lightbulb} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks';
import {TaskList} from '@/components/tasks/task-list';
import {EmptyState} from '@/components/tasks/empty-state';
import {Skeleton} from '@/components/ui/skeleton';
import {type StudyTask} from '@/lib/types';
import {useBadges} from '@/hooks/useBadges';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {BadgeCard} from '@/components/badges/badge-card';
import Link from 'next/link';

const TaskDialog = lazy(() =>
  import('@/components/tasks/add-task-dialog').then(m => ({
    default: m.TaskDialog,
  }))
);

const motivationalQuotes = [
  {
    quote: 'The secret of getting ahead is getting started.',
    author: 'Mark Twain',
  },
  {
    quote: "Don't watch the clock; do what it does. Keep going.",
    author: 'Sam Levenson',
  },
  {
    quote: 'The expert in anything was once a beginner. Keep learning.',
    author: 'Helen Hayes',
  },
  {
    quote: 'Your future is created by what you do today, not tomorrow.',
    author: 'Robert Kiyosaki',
  },
  {
    quote: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
  },
  {
    quote:
      'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
  },
  {
    quote: "Believe you can and you're halfway there.",
    author: 'Theodore Roosevelt',
  },
  {
    quote: 'Push yourself, because no one else is going to do it for you.',
    author: 'Unknown',
  },
  {
    quote: 'Every accomplishment starts with the decision to try.',
    author: 'John F. Kennedy',
  },
  {
    quote:
      "The harder you work for something, the greater you'll feel when you achieve it.",
    author: 'Unknown',
  },
  {
    quote: 'The secret to success is to start before you are ready.',
    author: 'Marie Forleo',
  },
  {
    quote: 'The only place where success comes before work is in the dictionary.',
    author: 'Vidal Sassoon',
  },
  {
    quote: 'I find that the harder I work, the more luck I seem to have.',
    author: 'Thomas Jefferson',
  },
  {
    quote:
      'Success is not final, failure is not fatal: it is the courage to continue that counts.',
    author: 'Winston Churchill',
  },
  {
    quote: "Don't wish it were easier, wish you were better.",
    author: 'Jim Rohn',
  },
  {
    quote: 'The way to get started is to quit talking and begin doing.',
    author: 'Walt Disney',
  },
  {
    quote:
      'I am not a product of my circumstances. I am a product of my decisions.',
    author: 'Stephen Covey',
  },
  {
    quote: 'You don’t have to be great to start, but you have to start to be great.',
    author: 'Zig Ziglar',
  },
  {
    quote: 'Procrastination makes easy things hard, and hard things harder.',
    author: 'Mason Cooley',
  },
  {
    quote: 'The future depends on what you do today.',
    author: 'Mahatma Gandhi',
  },
  {
    quote:
      'Study while others are sleeping; work while others are loafing; prepare while others are playing; and dream while others are wishing.',
    author: 'William Arthur Ward',
  },
  {
    quote:
      'The beautiful thing about learning is that no one can take it away from you.',
    author: 'B.B. King',
  },
  {
    quote: 'An investment in knowledge pays the best interest.',
    author: 'Benjamin Franklin',
  },
  {
    quote:
      'The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.',
    author: 'Brian Herbert',
  },
  {
    quote: 'Learning is not a spectator sport.',
    author: 'D. Blocher',
  },
  {
    quote: 'There are no shortcuts to any place worth going.',
    author: 'Beverly Sills',
  },
  {
    quote: 'The pain you feel today is the strength you will feel tomorrow.',
    author: 'Unknown',
  },
  {
    quote: 'It’s not about having time. It’s about making time.',
    author: 'Unknown',
  },
  {
    quote: 'Discipline is the bridge between goals and accomplishment.',
    author: 'Jim Rohn',
  },
  {
    quote: 'Strive for progress, not perfection.',
    author: 'Unknown',
  },
  {
    quote: 'You are capable of more than you know.',
    author: 'Unknown',
  },
  {
    quote: "Focus on your goal. Don't look in any direction but ahead.",
    author: 'Unknown',
  },
  {
    quote: 'A little progress each day adds up to big results.',
    author: 'Satya Nani',
  },
  {
    quote: "It always seems impossible until it's done.",
    author: 'Nelson Mandela',
  },
  {
    quote: 'Wake up with determination. Go to bed with satisfaction.',
    author: 'Unknown',
  },
  {
    quote:
      'The difference between ordinary and extraordinary is that little extra.',
    author: 'Jimmy Johnson',
  },
  {
    quote: 'The key to success is to focus on goals, not obstacles.',
    author: 'Unknown',
  },
  {
    quote: 'Your only limit is your mind.',
    author: 'Unknown',
  },
  {
    quote: 'Doubt kills more dreams than failure ever will.',
    author: 'Suzy Kassem',
  },
  {
    quote: 'Success doesn’t just find you. You have to go out and get it.',
    author: 'Unknown',
  },
  {
    quote: 'The secret of your future is hidden in your daily routine.',
    author: 'Mike Murdock',
  },
  {
    quote: 'If you can dream it, you can do it.',
    author: 'Walt Disney',
  },
  {
    quote: 'The journey of a thousand miles begins with a single step.',
    author: 'Lao Tzu',
  },
  {
    quote: "Don't stop when you're tired. Stop when you're done.",
    author: 'Unknown',
  },
  {
    quote: 'What you do today can improve all your tomorrows.',
    author: 'Ralph Marston',
  },
  {
    quote: "It's going to be hard, but hard does not mean impossible.",
    author: 'Unknown',
  },
  {
    quote: 'Success is the child of preparation and determination.',
    author: 'Unknown',
  },
  {
    quote: 'The best way to predict your future is to create it.',
    author: 'Abraham Lincoln',
  },
  {
    quote: 'Either you run the day or the day runs you.',
    author: 'Jim Rohn',
  },
  {
    quote:
      'Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.',
    author: 'Christian D. Larson',
  },
];

export default function DashboardPage() {
  const {
    tasks,
    addTask,
    updateTask,
    archiveTask,
    unarchiveTask,
    pushTaskToNextDay,
    isLoaded: tasksLoaded,
  } = useTasks();
  const {allBadges, earnedBadges, isLoaded: badgesLoaded} = useBadges();

  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);

  const isTaskFormOpen = !!editingTask;

  const openEditTaskDialog = (task: StudyTask) => {
    setEditingTask(task);
  };

  const closeTaskFormDialog = () => {
    setEditingTask(null);
  };

  const isLoaded = tasksLoaded && badgesLoaded;
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const {
    todaysTasks,
    pendingTasks,
    todaysCompletedTasks,
    pointsToday,
    todaysBadges,
  } = useMemo(() => {
    const todays = tasks.filter(
      t => t.date === todayStr && t.status !== 'archived'
    );
    const pending = todays.filter(
      t => t.status === 'todo' || t.status === 'in_progress'
    );
    const completed = todays.filter(t => t.status === 'completed');
    const points = completed.reduce((sum, task) => sum + task.points, 0);
    const badges = allBadges.filter(
      badge =>
        earnedBadges.has(badge.id) &&
        earnedBadges.get(badge.id) === todayStr
    );

    return {
      todaysTasks: todays,
      pendingTasks: pending,
      todaysCompletedTasks: completed,
      pointsToday: points,
      todaysBadges: badges,
    };
  }, [tasks, todayStr, allBadges, earnedBadges]);

  const dailyQuote = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return motivationalQuotes[dayOfYear % motivationalQuotes.length];
  }, []);

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              Today's Dashboard
            </h1>
            <p className="text-muted-foreground">
              Your achievements for {format(new Date(), 'MMMM d, yyyy')}.
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/tasks">
              <PlusCircle className="mr-2" />
              Manage Tasks
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-6">
        {!isLoaded ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <>
            <Card className="bg-primary/5">
              <CardContent className="p-4 flex items-center gap-4">
                <Lightbulb className="h-8 w-8 text-yellow-400 shrink-0" />
                <div>
                  <p className="italic text-primary/90">
                    "{dailyQuote.quote}"
                  </p>
                  <p className="text-sm text-right font-medium text-muted-foreground mt-1">
                    - {dailyQuote.author}
                  </p>
                </div>
              </CardContent>
            </Card>

            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Today's Stats</CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-8">
                  <div className="flex items-center gap-4">
                    <Star className="h-10 w-10 text-yellow-400" />
                    <div>
                      <p className="text-2xl font-bold">{pointsToday}</p>
                      <p className="text-sm text-muted-foreground">
                        Points Earned
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <BadgeIcon className="h-10 w-10 text-accent" />
                    <div>
                      <p className="text-2xl font-bold">
                        {todaysBadges.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Badges Unlocked
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <div className="space-y-6">
              {todaysBadges.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">
                    Badges Unlocked Today
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {todaysBadges.map(badge => (
                      <BadgeCard
                        key={badge.id}
                        badge={badge}
                        isEarned={true}
                      />
                    ))}
                  </div>
                </section>
              )}

              {todaysTasks.length > 0 ? (
                <>
                  {pendingTasks.length > 0 && (
                    <section>
                      <h2 className="text-xl font-semibold text-primary mb-3">
                        Today's Plan
                      </h2>
                      <TaskList
                        tasks={pendingTasks}
                        onUpdate={updateTask}
                        onArchive={archiveTask}
                        onUnarchive={unarchiveTask}
                        onPushToNextDay={pushTaskToNextDay}
                        onEdit={openEditTaskDialog}
                      />
                    </section>
                  )}
                  {todaysCompletedTasks.length > 0 && (
                    <section>
                      <h2 className="text-xl font-semibold text-primary mb-3">
                        Completed Today
                      </h2>
                      <TaskList
                        tasks={todaysCompletedTasks}
                        onUpdate={updateTask}
                        onArchive={archiveTask}
                        onUnarchive={unarchiveTask}
                        onPushToNextDay={pushTaskToNextDay}
                        onEdit={openEditTaskDialog}
                      />
                    </section>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <EmptyState
                    onAddTask={() => {}}
                    title="A Fresh Start!"
                    message="No tasks scheduled for today. Let's plan your day and make it a productive one!"
                    buttonText="Plan Your Day"
                  >
                    <Button asChild className="mt-6">
                      <Link href="/tasks">
                        <PlusCircle className="mr-2" /> Plan Your Day
                      </Link>
                    </Button>
                  </EmptyState>
                </div>
              )}
            </div>
          </>
        )}
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
