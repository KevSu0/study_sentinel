'use client';
import React, {useMemo} from 'react';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import {Target, CheckCircle, Clock} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks';
import {format, subDays} from 'date-fns';
import {Skeleton} from '@/components/ui/skeleton';

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

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b">
                <h1 className="text-2xl font-bold text-primary">Your Progress & Stats</h1>
                <p className="text-muted-foreground">Track your achievements and study habits.</p>
            </header>
            <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-6">
                <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           {isLoaded ? <div className="text-2xl font-bold">{totalHoursStudied} <span className="text-lg font-normal">hours</span></div> : <Skeleton className="h-8 w-3/4" />}
                           <p className="text-xs text-muted-foreground">Total time spent on completed tasks</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           {isLoaded ? <div className="text-2xl font-bold">{completedTasks.length}</div> : <Skeleton className="h-8 w-1/4" />}
                           <p className="text-xs text-muted-foreground">Total tasks conquered</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           {isLoaded ? <div className="text-2xl font-bold">{overallCompletionRate.toFixed(0)}%</div> : <Skeleton className="h-8 w-1/2" />}
                           <p className="text-xs text-muted-foreground">Of all created tasks</p>
                        </CardContent>
                    </Card>
                </section>

                <section className="grid gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Weekly Study Hours</CardTitle>
                            <CardDescription>Hours studied in the last 7 days.</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            {isLoaded ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={weeklyCompletionData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={true} unit="h" />
                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                                        <Legend />
                                        <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Hours Studied" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <Skeleton className="w-full h-[300px]" />}
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    );
}
