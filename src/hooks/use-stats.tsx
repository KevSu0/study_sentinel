'use client';

import {useMemo, useCallback} from 'react';
import {format, subDays, startOfDay, parseISO, isSameDay, set, parse, addDays} from 'date-fns';
import { getStudyDateForTimestamp, getTimeSinceStudyDayStart, getStudyDay } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  profileRepository,
  taskRepository,
  sessionRepository,
  statsDailyRepository,
  badgeRepository,
} from '@/lib/repositories';
import { activityRepository } from '@/lib/repositories/activity-repository';
import { buildSessionFromLog } from '@/lib/data/backfill-sessions';
import { useGlobalState } from '@/hooks/use-global-state';
import type {
  StudyTask,
  CompletedWork,
  Badge,
  BadgeCategory,
  UserProfile,
  HydratedActivityAttempt,
} from '@/lib/types';
import { RoutineStat } from '@/components/stats/routine-stats-list';
import type { Activity } from '@/components/stats/daily-activity-timeline';
import {
  selectDailyPieData,
  selectSubjectTrends,
  selectNewlyEarnedBadges,
  selectAiBriefingData,
  selectAchievementProgress,
} from '@/lib/stats/selectors';

interface UseStatsProps {
  timeRange: string;
  selectedDate: Date;
}

// Simple hash function to generate a color from a string
const generateColorFromString = (str: string) => {
    if (!str) return '#CCCCCC';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }
    const shortened = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return `#${"00000".substring(0, 6 - shortened.length)}${shortened}`;
};


export function useStats({
  timeRange,
  selectedDate,
}: UseStatsProps) {
  const { state } = useGlobalState();
  const { timeRange: timeRangeDep, selectedDate: selectedDateDep } = { timeRange, selectedDate };

  const dateRange = useMemo(() => {
    // Normalize to study-day boundaries to match how sessions are stored
    if (timeRange === 'daily') {
      const studyDay = getStudyDay(selectedDate);
      const d = format(studyDay, 'yyyy-MM-dd');
      return { startDate: d, endDate: d };
    }
    if (timeRange === 'overall') {
      return { startDate: '1970-01-01', endDate: '9999-12-31' };
    }
    const base = getStudyDay(new Date());
    const daysToSubtract = timeRange === 'weekly' ? 7 : 30;
    const startDate = format(subDays(base, daysToSubtract), 'yyyy-MM-dd');
    const endDate = format(base, 'yyyy-MM-dd');
    return { startDate, endDate };
  }, [timeRange, selectedDate]);

  const tasks = useLiveQuery(() => taskRepository.getByDateRange(dateRange.startDate, dateRange.endDate), [dateRange]);
  const sessionsForRange = useLiveQuery(
    () => sessionRepository.getByDateRange(dateRange.startDate, dateRange.endDate),
    [dateRange]
  );
  // Fallback: if sessions are not backfilled, derive sessions directly from logs across the selected date range
  const logsDerivedSessions = useLiveQuery(
    async () => {
      try {
        // Build an inclusive list of YYYY-MM-dd dates between start and end
        const start = parse(dateRange.startDate, 'yyyy-MM-dd', new Date());
        const end = parse(dateRange.endDate, 'yyyy-MM-dd', new Date());
        const days: string[] = [];
        let cursor = start;
        while (cursor <= end) {
          days.push(format(cursor, 'yyyy-MM-dd'));
          cursor = addDays(cursor, 1);
        }
        // Also include the previous study day to capture attempts that started yesterday but completed today
        const prevOfStart = format(addDays(start, -1), 'yyyy-MM-dd');
        const queryDays = [prevOfStart, ...days];
        const attemptsByDay = await Promise.all(queryDays.map(d => activityRepository.getHydratedAttemptsByDate(d)));
        // Flatten and dedupe by attempt id
        const seen = new Set<string>();
        const allAttempts = attemptsByDay.flat().filter(a => {
          if (!a?.id) return false;
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
        const completedAttempts = allAttempts.filter(attempt => attempt.status === 'COMPLETED') as HydratedActivityAttempt[];

        const completedWork: CompletedWork[] = completedAttempts.map(attempt => {
          let duration = 0;
          let pausedDuration = 0;
          let lastEventTime = attempt.createdAt;
          let isPaused = false;

          for (const event of attempt.events) {
            const eventTime = event.occurredAt;
            const delta = (new Date(eventTime).getTime() - new Date(lastEventTime).getTime()) / 1000;

            if (!isPaused) {
              duration += delta;
            } else {
              pausedDuration += delta;
            }

            if (event.type === 'PAUSE') isPaused = true;
            if (event.type === 'RESUME') isPaused = false;

            lastEventTime = eventTime;
          }

          const isRoutine = attempt.template && 'days' in (attempt.template as any);
          const title = attempt.template ? attempt.template.title : 'Study';
          // Points: prefer attempt.points, then pointsEarned, else compute from productive minutes and priority
          const productiveSeconds = Math.max(0, Math.round(duration));
          let points = 0;
          if (typeof (attempt as any).points === 'number') points = (attempt as any).points as number;
          else if (typeof (attempt as any).pointsEarned === 'number') points = (attempt as any).pointsEarned as number;
          else {
            try {
              const multipliers: Record<'low'|'medium'|'high', number> = { low: 1, medium: 2, high: 3 } as const;
              const taskMaybe: any = attempt.template;
              const mult = taskMaybe && taskMaybe.priority ? multipliers[taskMaybe.priority as 'low'|'medium'|'high'] : 1;
              points = Math.floor((productiveSeconds / 60) * mult);
            } catch {}
          }
          if (!Number.isFinite(points)) points = 0;
          
          const completeEvt = attempt.events.find(e => e.type === 'COMPLETE');
          const completedAtMs = completeEvt ? new Date(completeEvt.occurredAt).getTime() : new Date(attempt.updatedAt || attempt.createdAt).getTime();
          const completedIso = new Date(completedAtMs).toISOString();
          return {
            id: attempt.id,
            date: format(getStudyDateForTimestamp(completedIso), 'yyyy-MM-dd'),
            timestamp: completedIso,
            type: isRoutine ? 'routine' : 'task',
            title: title,
            // duration must be TOTAL (productive + paused) in seconds to keep charts consistent
            duration: Math.round(duration + pausedDuration),
            pausedDuration: Math.round(pausedDuration),
            points,
            isUndone: false,
            taskId: !isRoutine ? attempt.template.id : undefined,
            routineId: isRoutine ? attempt.template.id : undefined,
          };
        });

        // Keep only items whose completed study-day falls within the selected range (inclusive)
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');
        const inRange = completedWork.filter(w => w.date >= startStr && w.date <= endStr);
        return inRange;
      } catch {
        return [] as any[];
      }
    },
    [dateRange]
  );
  const repoCompletedWork = sessionsForRange && sessionsForRange.length > 0 ? sessionsForRange : logsDerivedSessions;

  // Daily override: when looking at "today", prefer hydrated attempts already present in global state.
  const allCompletedWork = useMemo(() => {
    if (timeRange === 'daily') {
      const today = format(getStudyDay(new Date()), 'yyyy-MM-dd');
      const selected = format(getStudyDay(selectedDate), 'yyyy-MM-dd');
      if (today === selected && Array.isArray(state.todaysCompletedActivities) && state.todaysCompletedActivities.length > 0) {
        const mapFromCompletedActivity = state.todaysCompletedActivities.map((ca) => {
          const attempt: any = ca.attempt as any;
          const template: any = ca.template as any;
          const completeEvt = ca.completeEvent;
          const timestamp = new Date(completeEvt.occurredAt).toISOString();
          const date = format(getStudyDateForTimestamp(timestamp), 'yyyy-MM-dd');
          const prodSec = Math.max(0, Math.round(((attempt.duration || 0) as number) / 1000));
          const pausedSec = Math.max(0, Math.round(((attempt.pausedDuration || 0) as number) / 1000));
          const isRoutine = !('timerType' in template);
          let points = 0;
          if (typeof attempt.points === 'number') points = attempt.points;
          else if (typeof attempt.pointsEarned === 'number') points = attempt.pointsEarned;
          else {
            try {
              const mult: Record<'low'|'medium'|'high', number> = { low: 1, medium: 2, high: 3 } as const;
              const pr = template?.priority ?? 'low';
              points = Math.floor((prodSec / 60) * (mult[pr as 'low'|'medium'|'high'] || 1));
            } catch {}
          }
          return {
            id: attempt.id,
            date,
            timestamp,
            type: isRoutine ? 'routine' : 'task',
            title: template?.title ?? 'Study',
            duration: prodSec + pausedSec,
            pausedDuration: pausedSec,
            points,
            isUndone: false,
            taskId: !isRoutine ? template?.id : undefined,
            routineId: isRoutine ? template?.id : undefined,
          } as CompletedWork;
        });
        return mapFromCompletedActivity;
      }
    }
    return repoCompletedWork || [];
  }, [timeRange, selectedDate, state.todaysCompletedActivities, repoCompletedWork]);
  const profile = useLiveQuery(() => profileRepository.getById('user-profile'), []);
  const allBadges = useLiveQuery(() => badgeRepository.getAll(), []);
  const earnedBadges = useLiveQuery(() => profileRepository.getById('user-profile').then(p => p?.earnedBadges), []);

  const filteredTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    return tasks.filter(t => t.status !== 'archived');
  }, [tasks]);

  const filteredCompletedTasks = useMemo(
    () => filteredTasks?.filter(t => t.status === 'completed') || [],
    [filteredTasks]
  );

  const filteredWork = useMemo(() => {
    if (!allCompletedWork || !Array.isArray(allCompletedWork)) return [];
    return allCompletedWork.filter(w => !w.isUndone && !isNaN(new Date(w.timestamp).getTime()));
  }, [allCompletedWork]);

  const timeRangeStats = useMemo(() => {
    if (!filteredWork || !filteredTasks || !filteredCompletedTasks) {
      return {
        totalHours: '0.0',
        totalPoints: 0,
        completedCount: 0,
        completionRate: 0,
        avgSessionDuration: '0',
        focusScore: 100,
      };
    }
    const totalSeconds = filteredWork.reduce(
      (sum, work) => sum + work.duration,
      0
    );
    const totalPausedSeconds = filteredWork.reduce(
        (sum, work) => sum + (work.pausedDuration || 0),
        0
    );
    const totalProductiveSeconds = totalSeconds - totalPausedSeconds;

    const totalHours = (totalProductiveSeconds / 3600).toFixed(1);
    const totalPoints = filteredWork.reduce((sum, work) => sum + (Number.isFinite(work.points) ? work.points : 0), 0);

    const completionRate =
      filteredTasks.length > 0
        ? (filteredCompletedTasks.length / filteredTasks.length) * 100
        : 0;

    const avgSessionDuration =
      filteredWork.length > 0
        ? (totalSeconds / 60 / filteredWork.length).toFixed(0)
        : '0';

    const focusScore = totalSeconds > 0 ? (totalProductiveSeconds / totalSeconds) * 100 : 100;

    return {
      totalHours: !isNaN(Number(totalHours)) ? totalHours : '0.0',
      totalPoints: Number.isFinite(totalPoints) ? totalPoints : 0,
      completedCount: filteredWork.length,
      completionRate: Number.isFinite(completionRate) ? completionRate : 0,
      avgSessionDuration: isNaN(Number(avgSessionDuration)) ? '0' : avgSessionDuration,
      focusScore: Number.isFinite(focusScore) ? focusScore : 100,
    };
  }, [filteredWork, filteredTasks, filteredCompletedTasks]);

  const studyStreak = useMemo(() => {
    if (!allCompletedWork || allCompletedWork.length === 0) return 0;
    const completedDates = new Set(allCompletedWork.filter((w: CompletedWork) => !w.isUndone).map((w: CompletedWork) => w.date));
    if (completedDates.size === 0) return 0;
  
    let streak = 0;
    let currentStudyDay = getStudyDay(new Date());
  
    const todayStr = format(currentStudyDay, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(currentStudyDay, 1), 'yyyy-MM-dd');
  
    if (!completedDates.has(todayStr) && !completedDates.has(yesterdayStr)) {
      return 0;
    }
  
    if (!completedDates.has(todayStr)) {
      currentStudyDay = subDays(currentStudyDay, 1);
    }
  
    while (completedDates.has(format(currentStudyDay, 'yyyy-MM-dd'))) {
      streak++;
      currentStudyDay = subDays(currentStudyDay, 1);
    }
    return streak;
  }, [allCompletedWork]);

  const badgeStats = useMemo(() => {
    const earnedCount = earnedBadges ? Object.keys(earnedBadges).length : 0;
    const totalCount = allBadges ? allBadges.length : 0;
    return {earnedCount, totalCount};
  }, [earnedBadges, allBadges]);

  const categorizedBadges = useMemo(() => {
    const categories: Record<BadgeCategory, Badge[]> = {
      daily: [],
      weekly: [],
      monthly: [],
      overall: [],
    };
    if (!allBadges) return categories;
    for (const badge of allBadges) {
      if (!badge.isEnabled) continue;
      const category = (badge.isCustom ? 'overall' : badge.category) as BadgeCategory;
      categories[category].push(badge);
    }
    return categories;
  }, [allBadges]);

    const dailyPieChartData = useMemo(() => {
    console.log('dailyPieChartData memo: selectedDate:', selectedDate);
    console.log('dailyPieChartData memo: filteredWork length:', filteredWork?.length || 0);
    if (!filteredWork) return [];
    const selectedStudyDay = getStudyDay(selectedDate);
    const workForDay = filteredWork.filter(w => isSameDay(getStudyDateForTimestamp(w.timestamp), selectedStudyDay));
    console.log('dailyPieChartData memo: workForDay length:', workForDay.length);

    const workByTask = workForDay.reduce(
      (acc, work) => {
        const name = `${work.type === 'task' ? 'Task' : 'Routine'}: ${work.title}`;
        if (!acc[name]) {
          acc[name] = {
            totalDuration: 0,
            pausedDuration: 0,
            pauseCount: 0,
          };
        }
        acc[name].totalDuration += work.duration;
        acc[name].pausedDuration += work.pausedDuration || 0;
        acc[name].pauseCount += (work as any).pauseCount || 0;
        return acc;
      },
      {} as Record<
        string,
        {
          totalDuration: number;
          pausedDuration: number;
          pauseCount: number;
        }
      >
    );

    const data = selectDailyPieData(filteredWork as any, selectedDate, 'task');
    console.log('dailyPieChartData memo: final data:', data);
    return data as any;
  }, [filteredWork, selectedDate]);
  
  const dailyActivityTimelineData: Activity[] = useMemo(() => {
    if (!filteredWork) return [];
    const logsForSelectedDay = filteredWork.filter(log =>
        isSameDay(getStudyDateForTimestamp(log.timestamp), selectedDate)
    );
  
    return logsForSelectedDay.map(log => {
      const date = new Date(log.timestamp);
      const startHour = date.getHours() + date.getMinutes() / 60;
      
      let adjustedStartHour = startHour;
      if (startHour < 4) {
          adjustedStartHour += 24;
      }
      
      const endHour = adjustedStartHour + log.duration / 3600;
  
      return {
        name: log.title,
        time: [adjustedStartHour, endHour] as [number, number],
        type: log.type,
        duration: log.duration,
        pausedDuration: log.pausedDuration,
        color: generateColorFromString(`${log.type}-${log.title}`),
        pauseCount: (log as any).pauseCount,
      };
    });
  }, [filteredWork, selectedDate]);
  
  const dailyComparisonStats = useMemo(() => {
    if (!allCompletedWork) return undefined;
    const getSessionTimes = (work: CompletedWork[]) => {
      if (work.length === 0) return null;
      const start = Math.min(...work.map(w => parseISO(w.timestamp).getTime()));
      const end = Math.max(...work.map(w => parseISO(w.timestamp).getTime() + w.duration * 1000));
      return { start, end };
    };

    const workByStudyDay = (allCompletedWork as CompletedWork[]).reduce((acc: Record<string, { duration: number; points: number; work: CompletedWork[] }>, work: CompletedWork) => {
      const day = work.date;
      if (!acc[day]) {
        acc[day] = { duration: 0, points: 0, work: [] };
      }
      acc[day].duration += work.duration;
      acc[day].points += work.points;
      acc[day].work.push(work);
      return acc;
    }, {} as Record<string, { duration: number; points: number; work: CompletedWork[] }>);

    const getAggregatedStats = (days: string[]) => {
      const stats = { duration: 0, points: 0, start: 0, end: 0, count: 0 };
      const sessionTimes: { start: number; end: number }[] = [];

      for (const day of days) {
        const dayData = workByStudyDay[day];
        if (dayData) {
          stats.duration += dayData.duration;
          stats.points += dayData.points;
          const session = getSessionTimes(dayData.work);
          if(session) sessionTimes.push(session);
          stats.count++;
        }
      }
      
      if (sessionTimes.length > 0) {
        stats.start = sessionTimes.reduce((sum, s) => sum + s.start, 0) / sessionTimes.length;
        stats.end = sessionTimes.reduce((sum, s) => sum + s.end, 0) / sessionTimes.length;
      }

      return stats;
    };

    const currentStudyDay = getStudyDay(selectedDate);
    const todayStr = format(currentStudyDay, 'yyyy-MM-dd');
    const todayData = workByStudyDay[todayStr] || { duration: 0, points: 0, work: [] };
    const todaySession = getSessionTimes(todayData.work);
    const todayStats = { ...todayData, points: Math.round(todayData.points), start: todaySession?.start || 0, end: todaySession?.end || 0 };

    const yesterdayStr = format(subDays(currentStudyDay, 1), 'yyyy-MM-dd');
    const yesterdayData = workByStudyDay[yesterdayStr] || { duration: 0, points: 0, work: [] };
    const yesterdaySession = getSessionTimes(yesterdayData.work);
    const yesterdayStats = { ...yesterdayData, points: Math.round(yesterdayData.points), start: yesterdaySession?.start || 0, end: yesterdaySession?.end || 0 };

    const allDaysWithWork = Object.keys(workByStudyDay);
    const overallStats = getAggregatedStats(allDaysWithWork);

    const last3Days = Array.from({ length: 3 }, (_, i) => format(subDays(currentStudyDay, i + 1), 'yyyy-MM-dd'));
    const last3DaysStats = getAggregatedStats(last3Days);

    const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(currentStudyDay, i), 'yyyy-MM-dd'));
    const weeklyStats = getAggregatedStats(last7Days);
    
    const last30Days = Array.from({ length: 30 }, (_, i) => format(subDays(currentStudyDay, i), 'yyyy-MM-dd'));
    const monthlyStats = getAggregatedStats(last30Days);

    const calcAverage = (stats: { duration: number; points: number; start: number; end: number; count: number; }, days: number) => ({
        duration: stats.count > 0 ? stats.duration / days : 0,
        points: stats.count > 0 ? Math.round(stats.points / days) : 0,
        start: stats.start,
        end: stats.end,
    });

    const dailyAverage = {
        duration: overallStats.count > 0 ? overallStats.duration / overallStats.count : 0,
        points: overallStats.count > 0 ? Math.round(overallStats.points / overallStats.count) : 0,
        start: overallStats.start,
        end: overallStats.end,
    }

    const data = {
      today: todayStats,
      yesterday: yesterdayStats,
      dailyAverage: dailyAverage,
      last3DaysAverage: calcAverage(last3DaysStats, 3),
      weeklyAverage: calcAverage(weeklyStats, 7),
      monthlyAverage: calcAverage(monthlyStats, 30),
    };
    return data;
  }, [allCompletedWork, selectedDate]);

  const barChartData = useMemo(() => {
    if (!filteredWork) return [];
    const now = new Date();
    const dailyGoal = (profile?.dailyStudyGoal ?? 8);

    if (timeRange === 'daily') {
        return dailyPieChartData.map(item => ({
            name: item.name.length > 20 ? `${item.name.substring(0, 18)}...` : item.name,
            hours: parseFloat((item.productiveDuration / 3600).toFixed(2)),
            goal: dailyGoal / (dailyPieChartData.length || 1),
        }));
    }

    if (timeRange === 'overall') {
      const monthlyData = filteredWork.reduce(
        (acc, work) => {
          const monthKey = format(parseISO(work.date), 'yyyy-MM');
          acc[monthKey] = (acc[monthKey] || 0) + work.duration;
          return acc;
        },
        {} as Record<string, number>
      );

      return Object.keys(monthlyData)
        .sort()
        .map(monthKey => ({
          name: format(parseISO(`${monthKey}-01`), 'MMM yy'),
          hours: parseFloat((monthlyData[monthKey] / 3600).toFixed(2)),
          goal: dailyGoal * 30,
        }));
    }

    const dataPoints = timeRange === 'weekly' ? 7 : 30;
    const data: {name: string; hours: number; goal: number}[] = [];
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dayName =
        timeRange === 'weekly' ? format(date, 'eee') : format(date, 'd');

      const durationOnDay = filteredWork
        .filter(work => isSameDay(getStudyDateForTimestamp(work.timestamp), date))
        .reduce((sum, work) => sum + work.duration, 0);

      data.push({
        name: dayName,
        hours: parseFloat((durationOnDay / 3600).toFixed(2)),
        goal: dailyGoal,
      });
    }
    return data;
  }, [filteredWork, profile?.dailyStudyGoal, timeRange, dailyPieChartData]);

  const chartDetails = useMemo(() => {
    if (timeRange === 'daily') {
      return {
        title: "Today's Study Breakdown",
        description: 'Hours spent on each completed session today.',
      };
    }
    if (timeRange === 'weekly') {
      return {
        title: 'Study Activity',
        description: 'Hours studied in the last 7 days.',
      };
    }
    if (timeRange === 'monthly') {
      return {
        title: 'Study Activity',
        description: 'Hours studied in the last 30 days.',
      };
    }
    return {
      title: 'Overall Study Activity',
      description: 'Total hours studied per month.',
    };
  }, [timeRange]);

  const performanceCoachStats = useMemo(() => {
    if (!filteredWork) return undefined;
    const getSessionTimes = (work: CompletedWork[]) => {
      if (work.length === 0) return null;
      const start = Math.min(
        ...work.map(w => parseISO(w.timestamp).getTime())
      );
      const end = Math.max(
        ...work.map(
          w => parseISO(w.timestamp).getTime() + w.duration * 1000
        )
      );
      return {start, end};
    };

    const workForSelectedDate = filteredWork.filter(w =>
      isSameDay(getStudyDateForTimestamp(w.timestamp), selectedDate)
    );
    const selectedDateSession = getSessionTimes(workForSelectedDate);

    const weekEnd = selectedDate;
    const weeklyWork = filteredWork.filter(w => {
      const studyDate = getStudyDateForTimestamp(w.timestamp);
      return studyDate >= subDays(weekEnd, 7) && studyDate <= weekEnd;
    });

    const getAverageTimes = (work: CompletedWork[]) => {
      const workByDay: Record<string, CompletedWork[]> = work.reduce(
        (acc, w) => {
          const day = format(getStudyDateForTimestamp(w.timestamp), 'yyyy-MM-dd');
          (acc[day] = acc[day] || []).push(w);
          return acc;
        },
        {} as Record<string, CompletedWork[]>
      );

      const sessions = Object.values(workByDay)
        .map(getSessionTimes)
        .filter((item): item is { start: number; end: number; } => item !== null);

      if (sessions.length === 0) return {avgStart: null, avgEnd: null};
      
      const totalStartOffset = sessions.reduce((sum, s) => sum + (getTimeSinceStudyDayStart(s.start) || 0), 0);
      const totalEndOffset = sessions.reduce((sum, s) => sum + (getTimeSinceStudyDayStart(s.end) || 0), 0);

      const avgStartOffset = totalStartOffset / sessions.length;
      const avgEndOffset = totalEndOffset / sessions.length;

      const selectedStudyDayStart = set(startOfDay(selectedDate), { hours: 4 });

      return {
        avgStart: selectedStudyDayStart.getTime() + avgStartOffset,
        avgEnd: selectedStudyDayStart.getTime() + avgEndOffset,
      };
    };

    const data = {
      selectedDateSession,
      week: getAverageTimes(weeklyWork),
    };
    return data;
  }, [filteredWork, selectedDate]);

  const routineStats = useMemo(() => {
    const routineWork = filteredWork.filter(w => w.type === 'routine');
    const stats: Record<string, RoutineStat> = {};

    for (const work of routineWork) {
      if (!stats[work.title]) {
        stats[work.title] = { name: work.title, totalSeconds: 0, sessionCount: 0, points: 0 };
      }
      stats[work.title].totalSeconds += work.duration;
      stats[work.title].sessionCount += 1;
      stats[work.title].points += work.points;
    }
    
    return Object.values(stats);
  }, [filteredWork]);

  const peakProductivityData = useMemo(() => {
    const workByHour = filteredWork.reduce((acc, work) => {
      try {
        const hour = format(parseISO(work.timestamp), 'ha'); // e.g., '10AM', '3PM'
        acc[hour] = (acc[hour] || 0) + work.duration;
      } catch (e) {
        // Silently ignore entries with invalid timestamps
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(workByHour).map(([hour, totalSeconds]) => ({
      hour,
      totalSeconds: totalSeconds as number,
    }));
  }, [filteredWork]);

  const calculateProductivityForDay = useCallback((date: Date) => {
    if (!filteredWork) return { real: 0, active: 0 };
    const workForDay = filteredWork.filter(w => isSameDay(getStudyDateForTimestamp(w.timestamp), date));
    const productiveSeconds = workForDay.reduce((sum, work) => sum + (work.duration - (work.pausedDuration || 0)), 0);

    // Real Productivity
    const startOfStudyDay = set(startOfDay(date), { hours: 4 });
    const nowForDay = isSameDay(date, new Date()) ? new Date() : set(addDays(startOfDay(date), 1), { hours: 3, minutes: 59, seconds: 59 });
    const totalSecondsInDay = Math.max(1, (nowForDay.getTime() - startOfStudyDay.getTime()) / 1000);
    const realProductivity = (productiveSeconds / totalSecondsInDay) * 100;

    // Active Productivity
    const dailyGoalSeconds = ((profile?.dailyStudyGoal ?? 8)) * 3600;
    const activeProductivity = (productiveSeconds / dailyGoalSeconds) * 100;

    return { real: realProductivity, active: activeProductivity };
  }, [filteredWork, profile]);


  const getProductivityTrend = useCallback((days: number) => {
    const trendData = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const { real, active } = calculateProductivityForDay(date);
        trendData.push({
            day: format(date, 'eee'),
            real: real,
            active: active
        });
    }
    return trendData;
  }, [calculateProductivityForDay]);

  const productivityTrend = useMemo(() => getProductivityTrend(7), [getProductivityTrend]);

  const dailyProductivity = useMemo(() => {
    return calculateProductivityForDay(selectedDate);
  }, [selectedDate, calculateProductivityForDay]);

  return {
    timeRangeStats,
    studyStreak,
    badgeStats,
    categorizedBadges,
    barChartData,
    chartDetails,
    dailyPieChartData,
    dailyComparisonStats,
    dailyActivityTimelineData,
    performanceCoachStats,
    routineStats,
    peakProductivityData,
    realProductivityData: productivityTrend.map(p => ({ day: p.day, productivity: p.real })),
    activeProductivityData: productivityTrend.map(p => ({ day: p.day, productivity: p.active })),
    dailyRealProductivity: dailyProductivity.real,
    dailyActiveProductivity: dailyProductivity.active,
    subjectPerformanceTrends: selectSubjectTrends(filteredWork as any),
    newlyUnlockedBadges: (() => {
      try {
        const attempts = logsDerivedSessions ? logsDerivedSessions.map(session => ({
          ...session,
          events: [],
          template: {
            id: session.taskId || session.routineId || '',
            title: session.title,
            //'days' in template
            ...(session.type === 'routine' ? { days: [] } : {})
          }
        })) as HydratedActivityAttempt[] : [];
        return selectNewlyEarnedBadges((allBadges as any) || [], {
          tasks: (tasks as any) || [],
          attempts: attempts,
          allCompletedWork: (allCompletedWork as any) || [],
        });
      } catch {
        return [];
      }
    })(),
    achievementProgress: (() => {
      const totalStudyMinutes = (timeRangeStats.totalHours ? parseFloat(timeRangeStats.totalHours) * 60 : 0);
      const totalPoints = timeRangeStats.totalPoints || 0;
      const tasksCompleted = (filteredTasks?.filter(t => t.status === 'completed').length) || 0;
      const routinesCompleted = (filteredWork?.filter(w => w.type === 'routine').length) || 0;
      const dayStreak = studyStreak || 0;
      return selectAchievementProgress({ totalStudyMinutes, totalPoints, tasksCompleted, routinesCompleted, dayStreak }, (allBadges as any) || []);
    })(),
  };
}
