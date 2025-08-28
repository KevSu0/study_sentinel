'use client';
import {
  LazyBarChart as BarChart,
  LazyBar as Bar,
  LazyXAxis as XAxis,
  LazyYAxis as YAxis,
  LazyCartesianGrid as CartesianGrid,
  LazyTooltip as Tooltip,
  LazyLegend as Legend,
  LazyResponsiveContainer as ResponsiveContainer
} from '@/components/lazy/chart-components';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';

interface StudyActivityChartProps {
    data: { name: string; hours: number; goal?: number }[];
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
                <ResponsiveContainer {...({} as any)} width="100%" height={300}>
                    <BarChart {...({} as any)} data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid {...({} as any)} strokeDasharray="3 3" />
                        <XAxis 
                            {...({} as any)}
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            interval={timeRange === 'monthly' ? 4 : 0}
                        />
                        <YAxis 
                            {...({} as any)}
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            allowDecimals={false} 
                            unit="h" 
                        />
                        <Tooltip 
                            {...({} as any)}
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius)'
                            }}
                        />
                        <Legend {...({} as any)} wrapperStyle={{fontSize: "0.875rem"}}/>
                        <Bar
                            {...({} as any)}
                            dataKey="hours"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                            name="Hours Studied"
                        />
                        <Bar
                             {...({} as any)}
                             dataKey="goal"
                             fill="hsl(var(--secondary))"
                             radius={[4, 4, 0, 0]}
                             name="Goal"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
