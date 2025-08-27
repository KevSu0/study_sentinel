'use client'


import React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Expand } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { FullscreenChartDialog } from '@/components/stats/fullscreen-chart-dialog'
import type { Activity } from '@/components/stats/daily-activity-timeline'
import { type PolarActivity, type HourBin } from '@/lib/stats/useDailyPolarData'


/**
 * DailyPolarChart — phone‑first 24h radial chart with weekly‑avg overlay
 *
 * Props
 *  - today:   sessions for the current day (4→4 window)
 *  - last7:   array of day-arrays for weekly average (optional)
 *  - ganttData: pass your existing Activity[] so the Expand dialog keeps the Gantt
 */
export default function DailyPolarChart({
  today,
  last7,
  ganttData,
  bins,
  maxProductiveMin,
}: {
  today: PolarActivity[]
  last7?: PolarActivity[][]
  ganttData?: Activity[]
  bins: HourBin[]
  maxProductiveMin: number
}) {
  const { theme } = useTheme()
  const [isExpanded, setExpanded] = React.useState(false)


  // Compose chart-friendly data
  const chartData = bins.map((b) => ({
    idx: b.idx,
    label: b.label,
    productive: Math.round(b.productiveMin),
    paused: Math.round(b.pausedMin),
    weeklyAvg: Math.round(b.weeklyAvgProductiveMin),
  }))


  // colors (respect theme tokens)
  const isDark = theme === 'dark'
  
  // Function to generate a color for each hour, creating a gradient effect
  const getColorForHour = (hour: number) => {
    // We'll create a gradient from a teal-like color to a purple-like color
    const startHue = 170; // Teal/Cyan
    const endHue = 260; // Purple
    const hue = startHue + ((endHue - startHue) * (hour / 23));
    return `hsl(${hue}, 70%, 60%)`;
  };

  const avgColor = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(71, 85, 105, 0.35)'
  const pausedColor = isDark ? 'rgba(255, 165, 0, 0.7)' : 'rgba(255, 165, 0, 0.8)';


  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    // RadialBar passes each series separately; payload[0] will be whichever bar the user touched.
    const p: any = payload[0].payload
    const hour = Number(p.label)
    const nextHour = (hour + 1) % 24
    const asTime = (h: number) => new Date(0, 0, 0, h).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })


    return (
      <div className="rounded-lg border bg-background/90 p-2 text-sm shadow-md">
        <div className="font-semibold">
          {asTime(hour)} – {asTime(nextHour)}
        </div>
        <div className="text-muted-foreground">Productive: {p.productive} min</div>
        {p.paused > 0 && <div className="text-muted-foreground">Paused: {p.paused} min</div>}
        {p.weeklyAvg > 0 && <div className="text-muted-foreground">7‑day avg: {Math.round(p.weeklyAvg)} min</div>}
        {p.productive + p.paused > 0 && (
          <div className="text-muted-foreground">Paused %: {Math.round((p.paused / (p.productive + p.paused)) * 100)}%</div>
        )}
      </div>
    )
  }


  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Daily Activity</CardTitle>
          <CardDescription>24h activity</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={chartData}
                innerRadius="10%"
                outerRadius="105%"
                startAngle={90}
                endAngle={90 - 360}
                cx="50%"
                cy="50%"
                barCategoryGap="20%"
              >
                <PolarAngleAxis type="number" dataKey="idx" domain={[0, 23]} tick={false} />

                {/* Paused time (INNERMOST RING) */}
                <RadialBar
                  dataKey="paused"
                  background={{ fill: 'transparent' }}
                  className="opacity-80"
                  cornerRadius={2}
                >
                  {chartData.map((e, i) => (
                    <Cell key={`paused-${i}`} fill={pausedColor} className="stroke-transparent" />
                  ))}
                </RadialBar>

                {/* Weekly average ghost ring (MIDDLE RING) */}
                {last7 && last7.length > 0 && (
                  <RadialBar dataKey="weeklyAvg" background={{ fill: 'transparent' }} cornerRadius={4}>
                    {chartData.map((e, i) => (
                      <Cell key={`avg-${i}`} fill={avgColor} className="stroke-transparent" />
                    ))}
                  </RadialBar>
                )}

                {/* Today's productive time (OUTERMOST RING) */}
                <RadialBar dataKey="productive" background={{ fill: isDark ? 'hsla(var(--muted-foreground), 0.1)' : 'hsla(var(--muted-foreground), 0.15)' }} cornerRadius={4}>
                  {chartData.map((e, i) => (
                    <Cell key={`prod-${i}`} fill={getColorForHour(e.idx)} className="stroke-transparent" />
                  ))}
                </RadialBar>


                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--muted-foreground), 0.1)' }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
        {ganttData && ganttData.length > 0 && (
          <CardFooter className="flex-row-reverse">
            <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
              <Expand className="mr-2 h-4 w-4" />
              Expand
            </Button>
          </CardFooter>
        )}
      </Card>
      {ganttData && ganttData.length > 0 && (
        <FullscreenChartDialog isOpen={isExpanded} onOpenChange={setExpanded} data={ganttData} />
      )}
    </>
  )
}
