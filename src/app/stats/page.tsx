
'use client';
import React, {Suspense, useState, useMemo} from 'react';
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
import {DailyActivityTimeline} from '@/components/stats/daily-activity-timeline';
import { StatComparison } from '@/components/stats/stat-comparison';
import { getSessionDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay, addDays } from 'date-fns';
import { RoutineStatsList } from '@/components/stats/routine-stats-list';


// Lazy Loaded Chart Imports
const StudyActivityChart = React.lazy(() => import('@/components/stats/weekly-chart'));
const ProductivityPieChart = React.lazy(() => import('@/components/dashboard/productivity-pie-chart'));
const BadgeCollection = React.lazy(() => import('@/components/stats/badge-collection').then(m => ({ default: m.BadgeCollection })));
const PerformanceCoach = React.lazy(() => import('@/components/stats/performance-coach').then(m => ({ default: m.PerformanceCoach })));
const FocusAnalysisChart = React.lazy(() => import('@/components/stats/focus-analysis-chart').then(m => ({ default: m.FocusAnalysisChart })));
const PauseDistributionChart = React.lazy(() => import('@/components/stats/pause-distribution-chart').then(m => ({ default: m.PauseDistributionChart })));
const ProductivityPausedChart = React.lazy(() => import('@/components/stats/productivity-paused-chart').then(m => ({ default: m.ProductivityPausedChart })));

export default function StatsPage() {
  const {state} = useGlobalState();
  const {tasks, allCompletedWork, allBadges, earnedBadges, isLoaded, profile} = state;
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
    timeRangePieChartData,
    dailyComparisonStats,
    dailyActivityTimelineData,
    performanceCoachStats,
    routineStats
  } = useStats({
    tasks,
    allCompletedWork,
    allBadges,
    earnedBadges,
    timeRange,
    selectedDate: timeRange === 'daily' ? selectedDate : new Date(),
    profile: state.profile,
  });
  
  const changeDate = (amount: number) => {
    setSelectedDate((prev) => addDays(prev, amount));
  };


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
                <Button aria-label="Previous day" variant="ghost" size="icon" onClick={() => changeDate(-1)}>
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
                <Button aria-label="Next day" variant="ghost" size="icon" onClick={() => changeDate(1)}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <PerformanceCoach
                todaySeconds={dailyComparisonStats.today.duration}
                yesterdaySeconds={dailyComparisonStats.yesterday.duration}
                weeklyAverageSeconds={dailyComparisonStats.weeklyAverage.duration}
                todaySession={performanceCoachStats.selectedDateSession}
                weekAvgStart={performanceCoachStats.week.avgStart}
                weekAvgEnd={performanceCoachStats.week.avgEnd}
                selectedDate={selectedDate}
                idealStartTime={profile.idealStartTime}
                idealEndTime={profile.idealEndTime}
                dailyStudyGoal={profile.dailyStudyGoal}
              />
            </Suspense>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <FocusAnalysisChart timeRange="daily" selectedDate={selectedDate} />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <ProductivityPausedChart timeRange="daily" selectedDate={selectedDate} />
              </Suspense>
            </div>
            <StatComparison stats={dailyComparisonStats} selectedDate={selectedDate} />
          </TabsContent>

          <TabsContent value={timeRange !== 'daily' ? timeRange : ''} className="mt-6 space-y-6">
            <StatCardGrid
              timeRange={timeRange}
              timeRangeStats={timeRangeStats}
              badgeStats={badgeStats}
              studyStreak={studyStreak}
              isLoaded={isLoaded}
            />

            <section className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <Suspense fallback={<Skeleton className="w-full h-[380px] rounded-lg" />}>
                  <FocusAnalysisChart timeRange={timeRange as 'daily' | 'weekly' | 'monthly' | 'overall'} selectedDate={selectedDate} />
                </Suspense>
              </div>
              <div className="lg:col-span-2">
                <Suspense fallback={<Skeleton className="w-full h-[380px] rounded-lg" />}>
                   <PauseDistributionChart timeRange={timeRange as 'daily' | 'weekly' | 'monthly' | 'overall'} selectedDate={selectedDate} />
                </Suspense>
              </div>
            </section>
            
            <section className="space-y-6">
                 <h2 className="text-2xl font-bold text-primary">Routine Analysis</h2>
                 <div className="grid gap-6 grid-cols-1">
                    <RoutineStatsList data={routineStats} />
                 </div>
            </section>

            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <ProductivityPausedChart timeRange={timeRange as 'daily' | 'weekly' | 'monthly' | 'overall'} selectedDate={selectedDate} />
            </Suspense>

            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <BadgeCollection
                badgeStats={badgeStats}
                categorizedBadges={categorizedBadges}
                earnedBadges={earnedBadges}
                isLoaded={isLoaded}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
