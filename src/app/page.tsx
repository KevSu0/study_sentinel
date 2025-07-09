'use client';

import React, {useMemo} from 'react';
import {format} from 'date-fns';
import {Button} from '@/components/ui/button';
import {PlusCircle, Star, Award as BadgeIcon} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks';
import {TaskList} from '@/components/tasks/task-list';
import {EmptyState} from '@/components/tasks/empty-state';
import {Skeleton} from '@/components/ui/skeleton';
import {type StudyTask} from '@/lib/types';
import {useBadges} from '@/hooks/useBadges';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {BadgeCard} from '@/components/badges/badge-card';
import Link from 'next/link';

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

  const {todaysCompletedTasks, pointsToday} = useMemo(() => {
    const completed = tasks.filter(
      t => t.status === 'completed' && t.date === todayStr
    );
    const points = completed.reduce((sum, task) => sum + task.points, 0);
    return {todaysCompletedTasks: completed, pointsToday: points};
  }, [tasks, todayStr]);

  const todaysBadges = useMemo(() => {
    return allBadges.filter(badge => earnedBadges.get(badge.id) === todayStr);
  }, [allBadges, earnedBadges, todayStr]);

  const hasContent =
    todaysCompletedTasks.length > 0 || todaysBadges.length > 0;

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
            {hasContent ? (
              <div className="space-y-6">
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
                      onEdit={() => {}}
                    />
                  </section>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <EmptyState
                  onAddTask={() => {}}
                  title="A Fresh Start!"
                  message="No tasks completed or badges earned yet today. Let's get studying!"
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
          </>
        )}
      </main>
    </div>
  );
}
