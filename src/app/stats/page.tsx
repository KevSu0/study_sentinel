'use client';
import React, {useMemo} from 'react';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Progress} from '@/components/ui/progress';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import {Trophy, Award, Target, CheckCircle} from 'lucide-react';
import {useGamification} from '@/hooks/use-gamification';
import {useTasks} from '@/hooks/use-tasks';
import {format, subDays, parseISO} from 'date-fns';
import {Skeleton} from '@/components/ui/skeleton';

export default function StatsPage() {
    const {isLoaded: gamificationLoaded, score, level, levelProgress, pointsToNextLevel} = useGamification();
    const {tasks, isLoaded: tasksLoaded} = useTasks();

    const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed'), [tasks]);

    const weeklyCompletionData = useMemo(() => {
        const data: { name: string; tasks: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const formattedDate = format(date, 'yyyy-MM-dd');
            const dayName = format(date, 'eee');

            const tasksOnDay = completedTasks.filter(task => task.date === formattedDate).length;
            data.push({ name: dayName, tasks: tasksOnDay });
        }
        return data;
    }, [completedTasks]);

    const totalTasks = tasks.length;
    const overallCompletionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
    
    const isLoaded = gamificationLoaded && tasksLoaded;

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b">
                <h1 className="text-2xl font-bold text-primary">Your Progress & Stats</h1>
                <p className="text-muted-foreground">Track your achievements and study habits.</p>
            </header>
            <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-6">
                <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Level</CardTitle>
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           {isLoaded ? <div className="text-2xl font-bold">Level {level}</div> : <Skeleton className="h-8 w-1/2" />}
                           <p className="text-xs text-muted-foreground">Current achievement rank</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Score</CardTitle>
                            <Award className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           {isLoaded ? <div className="text-2xl font-bold">{score}</div> : <Skeleton className="h-8 w-3/4" />}
                           <p className="text-xs text-muted-foreground">Points from all completed tasks</p>
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

                <section className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Weekly Activity</CardTitle>
                            <CardDescription>Tasks completed in the last 7 days.</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            {isLoaded ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={weeklyCompletionData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                                        <Legend />
                                        <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <Skeleton className="w-full h-[300px]" />}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Next Level</CardTitle>
                            <CardDescription>Your progress to the next level.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center h-3/4">
                             {isLoaded ? (
                                <>
                                    <div className="relative h-32 w-32">
                                        <svg className="h-full w-full" viewBox="0 0 36 36">
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3"></path>
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${levelProgress}, 100`} strokeLinecap="round"></path>
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-bold text-primary">{level + 1}</span>
                                            <span className="text-xs text-muted-foreground">Next Level</span>
                                        </div>
                                    </div>
                                    <Progress value={levelProgress} className="w-3/4 mt-4 h-2" />
                                    <p className="text-sm text-muted-foreground mt-2">{pointsToNextLevel} points to go!</p>
                                </>
                             ) : <Skeleton className="w-3/4 h-3/4" /> }
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    );
}
