import { format, parseISO, subDays, isSameDay, set, startOfDay } from 'date-fns';
import type { CompletedWork, StudyTask, UserProfile, Badge, LogEvent } from '@/lib/types';
import { getStudyDateForTimestamp, getStudyDay, getTimeSinceStudyDayStart } from '@/lib/utils';
import { checkBadge } from '@/lib/badges';

export type PieGrouping = 'task' | 'subject';

export function selectTimeRangeStats(
  work: CompletedWork[] | undefined,
  tasks: StudyTask[] | undefined
) {
  const filteredTasks = (tasks ?? []).filter(t => t.status !== 'archived');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  const filteredWork = (work ?? []).filter(w => !w.isUndone && !isNaN(new Date(w.timestamp).getTime()));

  const totalSeconds = filteredWork.reduce((s, w) => s + (w.duration || 0), 0);
  const totalPaused = filteredWork.reduce((s, w) => s + (w.pausedDuration || 0), 0);
  const totalProductive = totalSeconds - totalPaused;

  return {
    totalHours: (totalProductive / 3600).toFixed(1),
    totalPoints: filteredWork.reduce((s, w) => s + (w.points || 0), 0),
    completedCount: filteredWork.length,
    completionRate: filteredTasks.length > 0 ? (completedTasks.length / filteredTasks.length) * 100 : 0,
    avgSessionDuration: filteredWork.length > 0 ? (totalSeconds / 60 / filteredWork.length).toFixed(0) : '0',
    focusScore: totalSeconds > 0 ? (totalProductive / totalSeconds) * 100 : 100,
  };
}

export function selectDailyPieData(
  work: CompletedWork[] | undefined,
  selectedDate: Date,
  grouping: PieGrouping = 'task'
) {
  const filteredWork = (work ?? []).filter(w => !w.isUndone);
  const day = getStudyDay(selectedDate);
  const workForDay = filteredWork.filter(w => isSameDay(getStudyDateForTimestamp(w.timestamp), day));

  const byKey: Record<string, { total: number; paused: number; pauses: number }>= {};
  for (const w of workForDay) {
    const key = grouping === 'subject'
      ? (w.subject || w.subjectId || 'Unassigned')
      : `${w.type === 'task' ? 'Task' : 'Routine'}: ${w.title}`;
    if (!byKey[key]) byKey[key] = { total: 0, paused: 0, pauses: 0 };
    byKey[key].total += w.duration || 0;
    byKey[key].paused += w.pausedDuration || 0;
    // pauseCount may not exist; treat as 0
  }

  return Object.entries(byKey).map(([name, v]) => {
    const productive = v.total - v.paused;
    const focusPercentage = v.total > 0 ? (productive / v.total) * 100 : 100;
    return {
      name,
      productiveDuration: productive,
      pausedDuration: v.paused,
      pauseCount: v.pauses,
      focusPercentage,
    };
  });
}

export function selectTimeline(work: CompletedWork[] | undefined, selectedDate: Date) {
  const filteredWork = (work ?? []).filter(w => !w.isUndone);
  const logsForDay = filteredWork.filter(w => isSameDay(getStudyDateForTimestamp(w.timestamp), selectedDate));
  return logsForDay.map(w => {
    const date = new Date(w.timestamp);
    const startHour = date.getHours() + date.getMinutes() / 60;
    let adjustedStartHour = startHour;
    if (startHour < 4) adjustedStartHour += 24;
    const endHour = adjustedStartHour + (w.duration || 0) / 3600;
    return {
      name: w.title,
      time: [adjustedStartHour, endHour] as [number, number],
      type: w.type,
      duration: w.duration,
      pausedDuration: w.pausedDuration,
      color: `${w.type}-${w.title}`,
      pauseCount: 0,
    };
  });
}

export function selectDailyComparison(allWork: CompletedWork[] | undefined, selectedDate: Date) {
  const work = (allWork ?? []).filter(w => !w.isUndone);

  const getSessionTimes = (w: CompletedWork[]) => {
    if (w.length === 0) return null as null | { start: number; end: number };
    const start = Math.min(...w.map(x => parseISO(x.timestamp).getTime()));
    const end = Math.max(...w.map(x => parseISO(x.timestamp).getTime() + (x.duration || 0) * 1000));
    return { start, end };
  };

  const byDay = work.reduce((acc: Record<string, { duration: number; points: number; work: CompletedWork[] }>, w) => {
    const day = w.date;
    (acc[day] = acc[day] || { duration: 0, points: 0, work: [] });
    acc[day].duration += w.duration || 0;
    acc[day].points += w.points || 0;
    acc[day].work.push(w);
    return acc;
  }, {});

  const currentStudyDay = getStudyDay(selectedDate);
  const todayStr = format(currentStudyDay, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(currentStudyDay, 1), 'yyyy-MM-dd');

  const todayData = byDay[todayStr] || { duration: 0, points: 0, work: [] as CompletedWork[] };
  const yestData = byDay[yesterdayStr] || { duration: 0, points: 0, work: [] as CompletedWork[] };
  const todaySession = getSessionTimes(todayData.work);
  const yesterdaySession = getSessionTimes(yestData.work);

  const allDays = Object.keys(byDay);
  const getAggregatedStats = (days: string[]) => {
    const stats = { duration: 0, points: 0, start: 0, end: 0, count: 0 };
    const sessionTimes: { start: number; end: number }[] = [];
    for (const d of days) {
      const dd = byDay[d];
      if (!dd) continue;
      stats.duration += dd.duration;
      stats.points += dd.points;
      const st = getSessionTimes(dd.work);
      if (st) sessionTimes.push(st);
      stats.count++;
    }
    if (sessionTimes.length > 0) {
      stats.start = sessionTimes.reduce((s, t) => s + t.start, 0) / sessionTimes.length;
      stats.end = sessionTimes.reduce((s, t) => s + t.end, 0) / sessionTimes.length;
    }
    return stats;
  };

  const last3 = Array.from({ length: 3 }, (_, i) => format(subDays(currentStudyDay, i + 1), 'yyyy-MM-dd'));
  const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(currentStudyDay, i), 'yyyy-MM-dd'));
  const last30 = Array.from({ length: 30 }, (_, i) => format(subDays(currentStudyDay, i), 'yyyy-MM-dd'));

  const overallStats = getAggregatedStats(allDays);
  const dailyAverage = {
    duration: overallStats.count > 0 ? overallStats.duration / overallStats.count : 0,
    points: overallStats.count > 0 ? Math.round(overallStats.points / overallStats.count) : 0,
    start: overallStats.start,
    end: overallStats.end,
  };

  return {
    today: { ...todayData, points: Math.round(todayData.points), start: todaySession?.start || 0, end: todaySession?.end || 0 },
    yesterday: { ...yestData, points: Math.round(yestData.points), start: yesterdaySession?.start || 0, end: yesterdaySession?.end || 0 },
    dailyAverage,
    last3DaysAverage: (() => {
      const s = getAggregatedStats(last3);
      return { duration: s.count > 0 ? s.duration / 3 : 0, points: s.count > 0 ? Math.round(s.points / 3) : 0, start: s.start, end: s.end };
    })(),
    weeklyAverage: (() => {
      const s = getAggregatedStats(last7);
      return { duration: s.count > 0 ? s.duration / 7 : 0, points: s.count > 0 ? Math.round(s.points / 7) : 0, start: s.start, end: s.end };
    })(),
    monthlyAverage: (() => {
      const s = getAggregatedStats(last30);
      return { duration: s.count > 0 ? s.duration / 30 : 0, points: s.count > 0 ? Math.round(s.points / 30) : 0, start: s.start, end: s.end };
    })(),
  };
}

export function selectRoutineStats(work: CompletedWork[] | undefined) {
  const routineWork = (work ?? []).filter(w => !w.isUndone && w.type === 'routine');
  const stats: Record<string, { name: string; totalSeconds: number; sessionCount: number; points: number }> = {};
  for (const w of routineWork) {
    if (!stats[w.title]) stats[w.title] = { name: w.title, totalSeconds: 0, sessionCount: 0, points: 0 };
    stats[w.title].totalSeconds += w.duration || 0;
    stats[w.title].sessionCount += 1;
    stats[w.title].points += w.points || 0;
  }
  return Object.values(stats);
}

export function selectPeakProductivity(work: CompletedWork[] | undefined) {
  const byHour = (work ?? []).reduce((acc, w) => {
    try {
      const hourLabel = format(parseISO(w.timestamp), 'ha');
      acc[hourLabel] = (acc[hourLabel] || 0) + (w.duration || 0);
    } catch {}
    return acc;
  }, {} as Record<string, number>);
  return Object.entries(byHour).map(([hour, totalSeconds]) => ({ hour, totalSeconds: totalSeconds as number }));
}

export function selectProductivitySeries(
  work: CompletedWork[] | undefined,
  profile: UserProfile | undefined,
  days: number = 7
) {
  const dGoalHours = profile?.dailyStudyGoal ?? 8;
  const today = new Date();
  const series: Array<{ day: string; real: number; active: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    const studyDay = getStudyDay(date);
    const forDay = (work ?? []).filter(w => isSameDay(getStudyDateForTimestamp(w.timestamp), studyDay));
    const productiveSeconds = forDay.reduce((sum, w) => sum + ((w.duration || 0) - (w.pausedDuration || 0)), 0);
    const startOfStudyDay = set(startOfDay(date), { hours: 4 });
    const nowForDay = isSameDay(date, new Date()) ? new Date() : set(startOfDay(date), { hours: 27, minutes: 59, seconds: 59 }); // 3:59 next day
    const totalSecondsInDay = Math.max(1, (nowForDay.getTime() - startOfStudyDay.getTime()) / 1000);
    const real = (productiveSeconds / totalSecondsInDay) * 100;
    const active = (productiveSeconds / (dGoalHours * 3600)) * 100;
    series.push({ day: format(date, 'eee'), real, active });
  }
  return series;
}

export function selectSubjectTrends(work: CompletedWork[] | undefined) {
  const bySubject: Record<string, { totalSeconds: number; points: number }> = {};
  for (const w of work ?? []) {
    const key = w.subject || w.subjectId || 'Unassigned';
    if (!bySubject[key]) bySubject[key] = { totalSeconds: 0, points: 0 };
    bySubject[key].totalSeconds += w.duration || 0;
    bySubject[key].points += w.points || 0;
  }
  return Object.entries(bySubject).map(([subject, v]) => ({ subject, totalSeconds: v.totalSeconds, points: v.points }));
}

export function selectBadgeEligibility(
  badges: Badge[],
  data: { tasks: StudyTask[]; logs: LogEvent[] }
) {
  const newly: Badge[] = [];
  for (const b of badges) {
    try {
      if (checkBadge(b, { tasks: data.tasks, logs: data.logs })) newly.push(b);
    } catch {}
  }
  return newly;
}

export function selectAiBriefingData(
  dailyComparisonStats: {
    today: { duration: number; points: number };
    yesterday: { duration: number; points: number };
    dailyAverage: { duration: number; points: number };
  },
  badgeStats: { earnedCount: number; totalCount: number }
) {
  const deltaVsAvg = dailyComparisonStats.today.points - dailyComparisonStats.dailyAverage.points;
  const trend = deltaVsAvg >= 0 ? 'up' : 'down';
  return {
    summary: {
      todayMinutes: Math.round(dailyComparisonStats.today.duration / 60),
      todayPoints: dailyComparisonStats.today.points,
      vsDailyAvgPoints: deltaVsAvg,
      trend,
    },
    badges: badgeStats,
  };
}

export type AchievementMetrics = {
  totalStudyMinutes?: number;
  totalPoints?: number;
  tasksCompleted?: number;
  routinesCompleted?: number;
  dayStreak?: number;
};

export function selectAchievementProgress(metrics: AchievementMetrics, badges: Badge[]) {
  let best: { badge: Badge; progress: number } | null = null;

  const ratio = (current: number | undefined, target: number) => {
    if (!current || current <= 0) return 0;
    return Math.min(1, current / target);
  };

  for (const b of badges) {
    let p = 1;
    for (const cond of b.conditions) {
      if (cond.type === 'TOTAL_STUDY_TIME') {
        p = Math.min(p, ratio(metrics.totalStudyMinutes, cond.target));
      } else if (cond.type === 'POINTS_EARNED') {
        p = Math.min(p, ratio(metrics.totalPoints, cond.target));
      } else if (cond.type === 'TASKS_COMPLETED') {
        p = Math.min(p, ratio(metrics.tasksCompleted, cond.target));
      } else if (cond.type === 'ROUTINES_COMPLETED') {
        p = Math.min(p, ratio(metrics.routinesCompleted, cond.target));
      } else if (cond.type === 'DAY_STREAK') {
        p = Math.min(p, ratio(metrics.dayStreak, cond.target));
      } else {
        // Unsupported conditions treated as already satisfied for progress purposes
        p = Math.min(p, 1);
      }
    }
    if (!best || p < best.progress) {
      best = { badge: b, progress: p };
    }
  }
  return best ? { nextBadge: best.badge, progress: best.progress } : { nextBadge: null, progress: 0 };
}
