'use client';
import React, {useMemo, lazy, Suspense} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Target, CheckCircle, Clock} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks';
import {format, subDays} from 'date-fns';
import {Skeleton} from '@/components/ui/skeleton';

const WeeklyChart = lazy(() => import('@/components/stats/weekly-chart'));

export default function StatsPage() {
    const {tasks, isLoaded: tasksLoaded} = useTasks();

    const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed'), [tasks]);
    const totalMinutesStudied = useMemo(() => completedTasks.reduce((sum, task) => sum + task.duration, 0), [completedTasks]);
    const totalHoursStudied = (totalMinutesStudied / 60).toFixed(1);

    const weeklyCompletionData = useMemo(() => {
        const data: { name: string; hours: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const formattedDate = format(date, 'yyyy-MM-dd');
            const dayName = format(date, 'eee');

            const durationOnDay = completedTasks
                .filter(task => task.date === formattedDate)
                .reduce((sum, task) => sum + task.duration, 0);
            
            data.push({ name: dayName, hours: parseFloat((durationOnDay / 60).toFixed(2)) });
        }
        return data;
    }, [completedTasks]);

    const totalTasks = tasks.length;
    const overallCompletionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
    
    const isLoaded = tasksLoaded;

    const statCards = [
        {
            title: 'Total Study Time',
            value: totalHoursStudied,
            unit: 'hours',
            description: 'Total time spent on completed tasks',
            Icon: Clock,
        },
        {
            title: 'Completed Tasks',
            value: completedTasks.length,
            description: 'Total tasks conquered',
            Icon: CheckCircle,
        },
        {
            title: 'Completion Rate',
            value: overallCompletionRate.toFixed(0),
            unit: '%',
            description: 'Of all created tasks',
            Icon: Target,
        },
    ];

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b">
                <h1 className="text-2xl font-bold text-primary">Your Progress & Stats</h1>
                <p className="text-muted-foreground">Track your achievements and study habits.</p>
            </header>
            <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-6">
                <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {statCards.map(stat => (
                        <Card key={stat.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                                <stat.Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                               {isLoaded ? (
                                    <div className="text-2xl font-bold">
                                        {stat.value}
                                        {stat.unit && <span className="text-lg font-normal ml-1">{stat.unit}</span>}
                                    </div>
                                ) : (
                                    <Skeleton className="h-8 w-3/4" />
                                )}
                               <p className="text-xs text-muted-foreground">{stat.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </section>

                <section className="grid gap-4">
                     {isLoaded ? (
                        <Suspense fallback={<Skeleton className="w-full h-[380px] rounded-lg" />}>
                            <WeeklyChart data={weeklyCompletionData} />
                        </Suspense>
                    ) : (
                        <Skeleton className="w-full h-[380px] rounded-lg" />
                    )}
                </section>
            </main>
        </div>
    );
}
