
import {useMemo} from 'react';
import {format, subDays, startOfDay, parseISO, isSameDay, set} from 'date-fns';
import { getStudyDateForTimestamp, getTimeSinceStudyDayStart, getStudyDay } from '@/lib/utils';
import type {
  StudyTask,
  CompletedWork,
  Badge,
  BadgeCategory,
  UserProfile,
} from '@/lib/types';
import { RoutineStat } from '@/components/stats/routine-stats-list';

interface UseStatsProps {
  tasks: StudyTask[];
  allCompletedWork: CompletedWork[];
  allBadges: Badge[];
  earnedBadges: Map<string, string>;
  timeRange: string;
  selectedDate: Date;
  profile: UserProfile;
}

export function useStats({
  tasks,
  allCompletedWork,
  allBadges,
  earnedBadges,
  timeRange,
  selectedDate,
  profile,
}: UseStatsProps) {

  const filteredTasks = useMemo(() => {
    const nonArchivedTasks = tasks.filter(t => t.status !== 'archived');
    const now = startOfDay(new Date());

    if (timeRange === 'daily') {
      return nonArchivedTasks.filter(t =>
        isSameDay(parseISO(t.date), selectedDate)
      );
    }
    if (timeRange === 'overall') return nonArchivedTasks;

    const daysToSubtract = timeRange === 'weekly' ? 7 : 30;
    const pastDate = subDays(now, daysToSubtract);

    return nonArchivedTasks.filter(t => parseISO(t.date) >= pastDate);
  }, [tasks, timeRange, selectedDate]);

  const filteredCompletedTasks = useMemo(
    () => filteredTasks.filter(t => t.status === 'completed'),
    [filteredTasks]
  );

  const filteredWork = useMemo(() => {
    const now = startOfDay(new Date());
    if (timeRange === 'daily') {
      return allCompletedWork.filter(w =>
        isSameDay(getStudyDateForTimestamp(w.timestamp), selectedDate)
      );
    }
    if (timeRange === 'overall') return allCompletedWork;

    const daysToSubtract = timeRange === 'weekly' ? 7 : 30;
    const pastDate = subDays(now, daysToSubtract);

    return allCompletedWork.filter(w => getStudyDateForTimestamp(w.timestamp) >= pastDate);
  }, [allCompletedWork, timeRange, selectedDate]);

  const timeRangeStats = useMemo(() => {
    const totalSeconds = filteredWork.reduce(
      (sum, work) => sum + work.duration,
      0
    );
    const totalHours = (totalSeconds / 3600).toFixed(1);
    const totalPoints = filteredWork.reduce(
      (sum, work) => sum + work.points,
      0
    );

    const completionRate =
      filteredTasks.length > 0
        ? (filteredCompletedTasks.length / filteredTasks.length) * 100
        : 0;

    const avgSessionDuration =
      filteredWork.length > 0
        ? (totalSeconds / 60 / filteredWork.length).toFixed(0)
        : '0';

    return {
      totalHours,
      totalPoints,
      completedCount: filteredWork.length,
      completionRate,
      avgSessionDuration,
    };
  }, [filteredWork, filteredTasks, filteredCompletedTasks]);

  const studyStreak = useMemo(() => {
    const completedDates = new Set(allCompletedWork.map(w => w.date));
    if (completedDates.size === 0) return 0;
  
    let streak = 0;
    let currentStudyDay = getStudyDay(new Date());
  
    // Check if the user studied today or yesterday to determine the start of the streak
    const todayStr = format(currentStudyDay, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(currentStudyDay, 1), 'yyyy-MM-dd');
  
    if (!completedDates.has(todayStr) && !completedDates.has(yesterdayStr)) {
      return 0; // No streak if no study in the last 48 hours (considering study days)
    }
  
    // If the user hasn't studied on the current study day, start checking from the previous day
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
    const earnedCount = earnedBadges.size;
    const totalCount = allBadges.length;
    return {earnedCount, totalCount};
  }, [earnedBadges, allBadges]);

  const categorizedBadges = useMemo(() => {
    const categories: Record<BadgeCategory, Badge[]> = {
      daily: [],
      weekly: [],
      monthly: [],
      overall: [],
    };
    for (const badge of allBadges) {
      if (!badge.isEnabled) continue;
      const category = badge.isCustom ? 'overall' : badge.category;
      categories[category].push(badge);
    }
    return categories;
  }, [allBadges]);

  const timeRangePieChartData = useMemo(() => {
    const workByTask = filteredWork.reduce((acc, work) => {
        const name = `${work.type === 'task' ? 'Task' : 'Routine'}: ${work.title}`;
        acc[name] = (acc[name] || 0) + work.duration;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(workByTask).map(([name, value]) => ({ name, value }));
  }, [filteredWork]);
  
  const dailyPieChartData = useMemo(() => {
    const workForDay = allCompletedWork.filter(w =>
      isSameDay(getStudyDateForTimestamp(w.timestamp), selectedDate)
    );

    const workByTask = workForDay.reduce((acc, work) => {
      const name = `${work.type === 'task' ? 'Task' : 'Routine'}: ${
        work.title
      }`;
        acc[name] = (acc[name] || 0) + work.duration;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(workByTask).map(([name, value]) => ({ name, value }));
  }, [allCompletedWork, selectedDate]);

  const dailyActivityTimelineData = useMemo(() => {
    const workForDay = allCompletedWork.filter(w =>
      isSameDay(getStudyDateForTimestamp(w.timestamp), selectedDate)
    );
    
    return workForDay.map(work => {
      const startTime = parseISO(work.timestamp);
      let startHour = startTime.getHours() + startTime.getMinutes() / 60;
      
      if (startHour < 4) {
        startHour += 24;
      }
      
      const durationHours = work.duration / 3600;
      const endHour = startHour + durationHours;
      
      return {
        name: work.title,
        time: [startHour, endHour] as [number, number],
        type: work.type,
        duration: work.duration,
      };
    });
  }, [allCompletedWork, selectedDate]);
  
  const dailyComparisonStats = useMemo(() => {
    const getSessionTimes = (work: CompletedWork[]) => {
      if (work.length === 0) return null;
      const start = Math.min(...work.map(w => parseISO(w.timestamp).getTime()));
      const end = Math.max(...work.map(w => parseISO(w.timestamp).getTime() + w.duration * 1000));
      return { start, end };
    };

    const workByStudyDay = allCompletedWork.reduce((acc, work) => {
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

    return {
      today: todayStats,
      yesterday: yesterdayStats,
      dailyAverage: dailyAverage,
      last3DaysAverage: calcAverage(last3DaysStats, 3),
      weeklyAverage: calcAverage(weeklyStats, 7),
      monthlyAverage: calcAverage(monthlyStats, 30),
    };
  }, [allCompletedWork, selectedDate]);

  const barChartData = useMemo(() => {
    const now = new Date();
    const dailyGoal = profile.dailyStudyGoal || 8;

    if (timeRange === 'daily') {
      return filteredWork.map(work => ({
        name:
          work.title.length > 20
            ? `${work.title.substring(0, 18)}...`
            : work.title,
        hours: parseFloat((work.duration / 3600).toFixed(2)),
        goal: dailyGoal / filteredWork.length,
      }));
    }

    if (timeRange === 'overall') {
      const monthlyData = allCompletedWork.reduce(
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
          goal: dailyGoal * 30, // Approximate monthly goal
        }));
    }

    const dataPoints = timeRange === 'weekly' ? 7 : 30;
    const data: {name: string; hours: number; goal: number}[] = [];
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dayName =
        timeRange === 'weekly' ? format(date, 'eee') : format(date, 'd');

      const durationOnDay = allCompletedWork
        .filter(work => isSameDay(getStudyDateForTimestamp(work.timestamp), date))
        .reduce((sum, work) => sum + work.duration, 0);

      data.push({
        name: dayName,
        hours: parseFloat((durationOnDay / 3600).toFixed(2)),
        goal: dailyGoal,
      });
    }
    return data;
  }, [allCompletedWork, filteredWork, timeRange, profile.dailyStudyGoal]);

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

    const workForSelectedDate = allCompletedWork.filter(w =>
      isSameDay(getStudyDateForTimestamp(w.timestamp), selectedDate)
    );
    const selectedDateSession = getSessionTimes(workForSelectedDate);

    const weekEnd = selectedDate;
    const weeklyWork = allCompletedWork.filter(w => {
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
        .filter(Boolean) as { start: number; end: number }[];
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

    return {
      selectedDateSession,
      week: getAverageTimes(weeklyWork),
    };
  }, [allCompletedWork, selectedDate]);

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


  return {
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
    routineStats,
  };
}
