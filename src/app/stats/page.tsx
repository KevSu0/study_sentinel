
'use client';
import React, {Suspense, useState, useMemo} from 'react';
import dynamic from 'next/dynamic';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {useGlobalState} from '@/hooks/use-global-state';
import {useStats} from '@/hooks/use-stats';
import {Skeleton} from '@/components/ui/skeleton';

// New Component Imports
import {StatCardGrid} from '@/components/stats/stat-card-grid';
import {BadgeCollection} from '@/components/stats/badge-collection';
import ProductivityPieChart from '@/components/dashboard/productivity-pie-chart';
import { StatComparison } from '@/components/stats/stat-comparison';
import { PerformanceCoach } from '@/components/stats/performance-coach';
import { getSessionDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay, addDays } from 'date-fns';
import { RoutineStatsList } from '@/components/stats/routine-stats-list';
import { PeakProductivityCard } from '@/components/stats/peak-productivity-card';
import DailyActivityChart from '@/components/stats/daily-activity-chart';
import { RealProductivityWidget } from '@/components/dashboard/widgets/real-productivity-widget';
import { ActiveProductivityWidget } from '@/components/dashboard/widgets/active-productivity-widget';
import { sessionsToPolarActivities } from '@/lib/stats/polarAdapters';
import { DailyRealProductivityWidget } from '@/components/dashboard/widgets/daily-real-productivity-widget';
import { DailyActiveProductivityWidget } from '@/components/dashboard/widgets/daily-active-productivity-widget';


// Lazy Loaded Chart Imports
const StudyActivityChart = React.lazy(
  () => import('@/components/stats/weekly-chart')
);
import DailyActivityCard from '@/components/stats/daily-activity-card';
const DailyActivitySkeleton = dynamic(
  () => import('@/components/stats/daily-activity-skeleton'),
  { ssr: false }
)

export default function StatsPage() {
  const [timeRange, setTimeRange] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(getSessionDate());

  const {
    timeRangeStats,
    studyStreak,
    badgeStats,
    categorizedBadges,
    barChartData,
    chartDetails,
    dailyPieChartData,
    dailyComparisonStats,
    performanceCoachStats,
    routineStats,
    peakProductivityData,
    dailyActivityTimelineData,
    realProductivityData,
    activeProductivityData,
  } = useStats({
    timeRange,
    selectedDate: timeRange === 'daily' ? selectedDate : new Date(),
  });
  
  const changeDate = (amount: number) => {
    setSelectedDate((prev) => addDays(prev, amount));
  };

  const isLoading = !dailyActivityTimelineData;

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold text-primary">
          Your Progress & Stats
        </h1>
        <p className="text-muted-foreground">
          Track your achievements and study habits.
        </p>
      </header>
      <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-6">
        <Tabs
          defaultValue="daily"
          value={timeRange}
          onValueChange={setTimeRange}
          className="w-full"
        >
          <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-4">
            <TabsTrigger value="daily">Today</TabsTrigger>
            <TabsTrigger value="weekly">Last 7 Days</TabsTrigger>
            <TabsTrigger value="monthly">Last 30 Days</TabsTrigger>
            <TabsTrigger value="overall">Overall</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="mt-6 space-y-6">
            <div className="flex items-center justify-center gap-2 mb-4">
                <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={'outline'} className="text-base font-semibold w-40 sm:w-48 justify-center">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {isSameDay(selectedDate, getSessionDate()) ? 'Today' : format(selectedDate, 'MMM d, yyyy')}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
                    </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
            {dailyComparisonStats && performanceCoachStats && (
              <PerformanceCoach
                todaySeconds={dailyComparisonStats.today.duration}
                yesterdaySeconds={dailyComparisonStats.yesterday.duration}
                weeklyAverageSeconds={dailyComparisonStats.weeklyAverage.duration}
                todaySession={performanceCoachStats.selectedDateSession}
                weekAvgStart={performanceCoachStats.week.avgStart}
                weekAvgEnd={performanceCoachStats.week.avgEnd}
                selectedDate={selectedDate}
              />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {timeRangeStats && dailyPieChartData && <ProductivityPieChart data={dailyPieChartData} focusScore={timeRangeStats.focusScore} />}
              {dailyActivityTimelineData && (
                <DailyActivityCard
                  todaySessions={dailyActivityTimelineData}
                  ganttData={dailyActivityTimelineData}
                />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {realProductivityData && (
                <DailyRealProductivityWidget productivity={realProductivityData[realProductivityData.length - 1]?.productivity || 0} isLoaded={!isLoading} />
              )}
              {activeProductivityData && (
                <DailyActiveProductivityWidget productivity={activeProductivityData[activeProductivityData.length - 1]?.productivity || 0} isLoaded={!isLoading} />
              )}
            </div>
            {dailyComparisonStats && <StatComparison stats={dailyComparisonStats} selectedDate={selectedDate} />}
          </TabsContent>
          
          {timeRange === 'weekly' && (
            <TabsContent value="weekly" className="mt-6 space-y-6">
                 <StatCardGrid
                    timeRange={timeRange}
                    timeRangeStats={timeRangeStats}
                    badgeStats={badgeStats}
                    studyStreak={studyStreak}
                    isLoaded={!isLoading}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {realProductivityData && <RealProductivityWidget data={realProductivityData} isLoaded={!isLoading} />}
                    {activeProductivityData && <ActiveProductivityWidget data={activeProductivityData} isLoaded={!isLoading} />}
                </div>
                 <section className="grid gap-6 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <Suspense fallback={<Skeleton className="w-full h-[380px] rounded-lg" />}>
                        {barChartData && chartDetails && <StudyActivityChart
                            data={barChartData}
                            title={chartDetails.title}
                            description={chartDetails.description}
                            timeRange={timeRange}
                        />}
                        </Suspense>
                    </div>
                    <div className="lg:col-span-2">
                        <Suspense fallback={<Skeleton className="w-full h-[380px] rounded-lg" />}>
                        {peakProductivityData && <PeakProductivityCard data={peakProductivityData} />}
                        </Suspense>
                    </div>
                </section>
                <BadgeCollection
                    badgeStats={badgeStats}
                    categorizedBadges={categorizedBadges}
                    earnedBadges={new Map()}
                    isLoaded={!isLoading}
                />
            </TabsContent>
          )}

          {(timeRange === 'monthly' || timeRange === 'overall') && (
            <TabsContent value={timeRange} className="mt-6 space-y-6">
                <StatCardGrid
                    timeRange={timeRange}
                    timeRangeStats={timeRangeStats}
                    badgeStats={badgeStats}
                    studyStreak={studyStreak}
                    isLoaded={!isLoading}
                />
                <section className="grid gap-6 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <Suspense fallback={<Skeleton className="w-full h-[380px] rounded-lg" />}>
                        {barChartData && chartDetails && <StudyActivityChart
                            data={barChartData}
                            title={chartDetails.title}
                            description={chartDetails.description}
                            timeRange={timeRange}
                        />}
                        </Suspense>
                    </div>
                    <div className="lg:col-span-2">
                        <Suspense fallback={<Skeleton className="w-full h-[380px] rounded-lg" />}>
                        {peakProductivityData && <PeakProductivityCard data={peakProductivityData} />}
                        </Suspense>
                    </div>
                </section>
                <BadgeCollection
                    badgeStats={badgeStats}
                    categorizedBadges={categorizedBadges}
                    earnedBadges={new Map()}
                    isLoaded={!isLoading}
                />
            </TabsContent>
          )}

        </Tabs>
      </main>
    </div>
  );
}
