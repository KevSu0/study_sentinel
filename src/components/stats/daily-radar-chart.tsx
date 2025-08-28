
'use client'


import React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Expand } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  LazyResponsiveContainer as ResponsiveContainer,
  LazyRadarChart as RadarChart,
  LazyRadar as Radar,
  LazyPolarGrid as PolarGrid,
  LazyPolarAngleAxis as PolarAngleAxis,
  LazyPolarRadiusAxis as PolarRadiusAxis,
  LazyTooltip as Tooltip,
  LazyCell as Cell,
} from '@/components/lazy/chart-components'
import { type PolarActivity, type HourBin } from '@/lib/stats/useDailyPolarData'
import type { Activity } from '@/components/stats/daily-activity-timeline'
import { FullscreenChartDialog } from '@/components/stats/fullscreen-chart-dialog'


/**
 * DailyRadarChart — 24h radar (spider) view comparing Today vs 7‑day average.
 * For readability on phones, we default to 8 spokes (every 3 hours). You can
 * change `step` to 1 to show all 24 spokes.
 */
export default function DailyRadarChart({
  today,
  last7,
  step = 3,
  ganttData,
  bins,
}: {
  today: PolarActivity[]
  last7?: PolarActivity[][]
  step?: 1 | 2 | 3 | 4
  ganttData?: Activity[]
  bins: HourBin[]
}) {
  const { theme } = useTheme()
  const [isExpanded, setExpanded] = React.useState(false)


  const data = bins
    .filter((_, i) => i % step === 0)
    .map((b) => ({
      label: b.hour.toString().padStart(2, '0'),
      today: Math.round(b.productiveMin),
      avg: Math.round(b.weeklyAvgProductiveMin),
    }))


  const primary = 'hsl(var(--primary))';
  const avg = theme === 'dark' ? 'rgba(148, 163, 184,.6)' : 'rgba(71, 85, 105,.6)';

  const getColorForHour = (hour: number) => {
    const startHue = 170; // Teal/Cyan
    const endHue = 260;   // Purple
    const hue = startHue + ((endHue - startHue) * (hour / 23));
    return `hsl(${hue}, 70%, 60%)`;
  };


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const p: any = payload[0].payload
    const hour = Number(p.label)
    const nextHour = (hour + 1) % 24
    const asTime = (h: number) => new Date(0, 0, 0, h).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return (
      <div className="rounded-lg border bg-background/90 p-2 text-sm shadow-md">
        <div className="font-semibold">{asTime(hour)} – {asTime(nextHour)}</div>
        <div className="text-muted-foreground">Today: {p.today} min</div>
        <div className="text-muted-foreground">7‑day avg: {p.avg} min</div>
      </div>
    )
  }


  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Daily Activity</CardTitle>
          <CardDescription>Radar view • {24 / step} spokes</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer {...({} as any)} width="100%" height="100%">
              <RadarChart {...({} as any)} data={data} outerRadius="80%">
                <PolarGrid {...({} as any)} />
                <PolarAngleAxis {...({} as any)} dataKey="label" />
                <Radar {...({} as any)} name="Today" dataKey="today" stroke={primary} fill={primary} fillOpacity={0.6}>
                  {data.map((e, i) => (
                    <Cell {...({} as any)} key={`cell-${i}`} fill={getColorForHour(parseInt(e.label, 10))} />
                  ))}
                </Radar>
                <Radar {...({} as any)} name="7-day Avg" dataKey="avg" stroke={avg} fill={avg} fillOpacity={0.5} />
                <Tooltip {...({} as any)} content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
