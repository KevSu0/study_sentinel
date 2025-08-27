'use client'

import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProductivityClock } from '@/components/stats/productivity-clock'
import DailyRadarChart from '@/components/stats/daily-radar-chart'
import { useDailyPolarData, type PolarActivity } from '@/lib/stats/useDailyPolarData'
import type { Activity } from '@/components/stats/daily-activity-timeline'
import { sessionsToPolarActivities, daysToPolarActivities, type AnySession } from '@/lib/stats/polarAdapters'
 
 /**
  * DailyActivityCard — wrapper to switch between Polar & Radar views.
  * Pass in today's sessions, last7, and gantt data once; user can toggle.
  */
 export default function DailyActivityCard({
   todaySessions,
   last7Sessions,
   ganttData,
 }: {
   todaySessions: AnySession[]
   last7Sessions?: AnySession[][]
   ganttData?: Activity[]
 }) {
   const today = React.useMemo(() => sessionsToPolarActivities(todaySessions), [todaySessions])
   const last7 = React.useMemo(() => (last7Sessions ? daysToPolarActivities(last7Sessions) : undefined), [last7Sessions])
   const { bins, maxProductiveMin, totalProductiveMin, totalPausedMin } = useDailyPolarData({ today, last7 })
   const [tab, setTab] = React.useState<'polar' | 'radar'>('polar')
   const hours = Math.floor(totalProductiveMin / 60)
   const minutes = Math.round(totalProductiveMin % 60)
   return (
     <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
       <div className="flex items-center justify-between">
         <TabsList className="grid w-fit grid-cols-2">
           <TabsTrigger value="polar">Clock</TabsTrigger>
           <TabsTrigger value="radar">Radar</TabsTrigger>
         </TabsList>
         <div className="text-right">
           <p className="text-sm font-medium text-gray-500">
             Total Productive Time
           </p>
           <p className="text-lg font-bold">
             {hours}h {minutes}m
           </p>
         </div>
       </div>
       <TabsContent value="polar" className="mt-4">
         <ProductivityClock bins={bins} />
       </TabsContent>
      <TabsContent value="radar" className="mt-4">
        <DailyRadarChart today={today} last7={last7} ganttData={ganttData} bins={bins} />
      </TabsContent>
    </Tabs>
  )
}
