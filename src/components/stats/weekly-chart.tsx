'use client';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';

interface StudyActivityChartProps {
    data: { name: string; hours: number }[];
    title: string;
    description: string;
    timeRange: string;
}

export default function StudyActivityChart({ data, title, description, timeRange }: StudyActivityChartProps) {
    if (!data || data.length === 0) {
        return (
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[300px]">
              <p className="text-muted-foreground">
                Complete some tasks to see your activity.
              </p>
            </CardContent>
          </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            interval={timeRange === 'monthly' ? 4 : 'auto'}
                        />
                        <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            allowDecimals={false} 
                            unit="h" 
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius)'
                            }}
                        />
                        <Legend wrapperStyle={{fontSize: "0.875rem"}}/>
                        <Bar 
                            dataKey="hours" 
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]} 
                            name="Hours Studied" 
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
