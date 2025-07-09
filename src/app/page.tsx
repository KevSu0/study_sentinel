'use client';

import React, {useMemo} from 'react';
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
];

export default function DashboardPage() {
  const {
    tasks,
    updateTask,
    archiveTask,
    unarchiveTask,
    pushTaskToNextDay,
    isLoaded: tasksLoaded,
  } = useTasks();
  const {allBadges, earnedBadges, isLoaded: badgesLoaded} = useBadges();

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
      badge => earnedBadges.has(badge.id) && earnedBadges.get(badge.id) === todayStr
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
    const dayOfMonth = new Date().getDate();
    return motivationalQuotes[dayOfMonth % motivationalQuotes.length];
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
                        onPushToNextDay={pushToNextDay}
                        onEdit={() => {}}
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
                        onPushToNextDay={pushToNextDay}
                        onEdit={() => {}}
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
    </div>
  );
}
