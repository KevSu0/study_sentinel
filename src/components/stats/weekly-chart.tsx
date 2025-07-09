'use client';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';

interface WeeklyChartProps {
    data: { name: string; hours: number }[];
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Weekly Study Hours</CardTitle>
                <CardDescription>Hours studied in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={true} unit="h" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                        <Legend />
                        <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Hours Studied" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
