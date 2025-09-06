import {
  selectTimeRangeStats,
  selectDailyPieData,
  selectTimeline,
  selectDailyComparison,
  selectRoutineStats,
  selectPeakProductivity,
  selectProductivitySeries,
  selectSubjectTrends,
  selectNewlyEarnedBadges,
  selectAiBriefingData,
  selectAchievementProgress,
} from '@/lib/stats/selectors';
import type { CompletedWork, StudyTask, Badge, UserProfile } from '@/lib/types';

const makeWork = (overrides: Partial<CompletedWork> = {}): CompletedWork => ({
  date: '2025-01-01',
  duration: 3600,
  pausedDuration: 600,
  type: 'task',
  title: 'Study Math',
  points: 10,
  timestamp: '2025-01-01T10:00:00.000Z',
  subjectId: 'Math',
  ...overrides,
});

describe('selectors (Phase 1)', () => {
  test('selectTimeRangeStats computes totals and rates', () => {
    const work: CompletedWork[] = [
      makeWork({ duration: 3600, pausedDuration: 600, points: 10 }),
      makeWork({ duration: 1800, pausedDuration: 0, points: 5, title: 'Read History', subjectId: 'History' }),
    ];
    const tasks: StudyTask[] = [
      { id: 't1', shortId: 'T-1', title: 'Task 1', date: '2025-01-01', time: '09:00', points: 5, status: 'completed', priority: 'medium', timerType: 'countdown' },
      { id: 't2', shortId: 'T-2', title: 'Task 2', date: '2025-01-01', time: '10:00', points: 5, status: 'todo', priority: 'low', timerType: 'infinity' },
    ] as any;

    const stats = selectTimeRangeStats(work, tasks);
    expect(stats.totalHours).toBe(((3600+1800-600)/3600).toFixed(1));
    expect(stats.totalPoints).toBe(15);
    expect(stats.completedCount).toBe(2);
    expect(stats.completionRate).toBeCloseTo((1/2)*100);
    expect(stats.avgSessionDuration).toBe(((3600+1800)/60/2).toFixed(0));
    expect(stats.focusScore).toBeCloseTo(((3600+1800-600)/(3600+1800))*100);
  });

  test('selectTimeRangeStats with empty inputs returns safe defaults', () => {
    const stats = selectTimeRangeStats(undefined, undefined);
    expect(stats.totalHours).toBe('0.0');
    expect(stats.totalPoints).toBe(0);
    expect(stats.completedCount).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.avgSessionDuration).toBe('0');
    expect(stats.focusScore).toBe(100);
  });

  test('selectDailyPieData groups by task and subject', () => {
    const w1 = makeWork({ title: 'A', subjectId: 'Math', timestamp: '2025-01-01T05:00:00.000Z' });
    const w2 = makeWork({ title: 'B', subjectId: 'Physics', timestamp: '2025-01-01T08:00:00.000Z' });
    const selected = new Date('2025-01-01T12:00:00.000Z');
    const byTask = selectDailyPieData([w1, w2], selected, 'task');
    expect(byTask.find(d => d.name.includes('A'))).toBeTruthy();
    const bySubject = selectDailyPieData([w1, w2], selected, 'subject');
    expect(bySubject.map(d => d.name)).toEqual(expect.arrayContaining(['Math', 'Physics']));
  });

  test('selectDailyPieData handles Unassigned subject grouping', () => {
    const w = makeWork({ subjectId: undefined, timestamp: '2025-01-01T08:00:00.000Z' });
    const selected = new Date('2025-01-01T12:00:00.000Z');
    const bySubject = selectDailyPieData([w], selected, 'subject');
    expect(bySubject[0].name).toBe('Unassigned');
  });

  test('selectTimeline produces expected hour buckets (timezone-agnostic)', () => {
    const w = makeWork({ timestamp: '2025-01-01T01:30:00.000Z', duration: 1800 });
    // Study day for possible pre-4AM timestamps is previous calendar day
    const tl = selectTimeline([w], new Date('2024-12-31T12:00:00.000Z'));
    const [start, end] = tl[0].time;
    const d = new Date(w.timestamp);
    const localHour = d.getHours() + d.getMinutes() / 60;
    const expected = localHour < 4 ? localHour + 24 : localHour;
    expect(start).toBeCloseTo(expected);
    expect(end).toBeCloseTo(start + 0.5);
  });

  test('selectDailyComparison computes today/yesterday and averages', () => {
    const base = '2025-01-10';
    const work: CompletedWork[] = [
      makeWork({ date: base, timestamp: `${base}T10:00:00.000Z`, duration: 3600, points: 10 }),
      makeWork({ date: '2025-01-09', timestamp: '2025-01-09T10:00:00.000Z', duration: 1800, points: 5 }),
      makeWork({ date: '2025-01-08', timestamp: '2025-01-08T10:00:00.000Z', duration: 1200, points: 2 }),
    ];
    const comp = selectDailyComparison(work, new Date(`${base}T12:00:00.000Z`));
    expect(comp.today.duration).toBe(3600);
    expect(comp.yesterday.duration).toBe(1800);
    expect(comp.dailyAverage.duration).toBeGreaterThan(0);
  });

  test('selectDailyComparison with no work returns zeros', () => {
    const comp = selectDailyComparison([], new Date('2025-01-01T12:00:00.000Z')) as any;
    expect(comp.today.duration).toBe(0);
    expect(comp.yesterday.duration).toBe(0);
    expect(comp.dailyAverage.duration).toBe(0);
  });

  test('selectRoutineStats aggregates only routines', () => {
    const work: CompletedWork[] = [
      makeWork({ type: 'routine', title: 'Morning', duration: 1200, points: 3 }),
      makeWork({ type: 'task', title: 'Task', duration: 600, points: 2 }),
      makeWork({ type: 'routine', title: 'Morning', duration: 1800, points: 4 }),
    ];
    const stats = selectRoutineStats(work);
    expect(stats).toHaveLength(1);
    expect(stats[0].totalSeconds).toBe(3000);
    expect(stats[0].sessionCount).toBe(2);
  });

  test('selectPeakProductivity buckets by hour label', () => {
    const work: CompletedWork[] = [
      makeWork({ timestamp: '2025-01-01T10:00:00.000Z', duration: 600 }),
      makeWork({ timestamp: '2025-01-01T10:30:00.000Z', duration: 300 }),
    ];
    const rows = selectPeakProductivity(work);
    const total = rows.reduce((s, r) => s + r.totalSeconds, 0);
    expect(total).toBe(900);
  });

  test('selectProductivitySeries computes real/active against goal', () => {
    const today = new Date('2025-01-05T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(today);
    const work: CompletedWork[] = [
      makeWork({ timestamp: '2025-01-05T08:00:00.000Z', duration: 3600, pausedDuration: 0 }),
      makeWork({ timestamp: '2025-01-04T08:00:00.000Z', duration: 1800, pausedDuration: 0 }),
    ];
    const profile: UserProfile = { name: 'Student', dailyStudyGoal: 2 };
    const series = selectProductivitySeries(work, profile, 2);
    expect(series).toHaveLength(2);
    // Active productivity vs goal (2h=7200s)
    expect(series[1].active).toBeCloseTo((3600/7200)*100);
    jest.useRealTimers();
  });

  test('selectSubjectTrends aggregates totals by subject', () => {
    const work: CompletedWork[] = [
      makeWork({ subjectId: 'Math', duration: 600, points: 2 }),
      makeWork({ subjectId: 'Math', duration: 300, points: 1 }),
      makeWork({ subjectId: 'History', duration: 900, points: 3 }),
    ];
    const trends = selectSubjectTrends(work);
    const math = trends.find(t => t.subject === 'Math')!;
    expect(math.totalSeconds).toBe(900);
    expect(math.points).toBe(3);
  });

  test('selectNewlyEarnedBadges delegates to badge checker', () => {
    const badges: Badge[] = [
      { id: 'b1', name: 'One Task', description: '', category: 'overall', icon: 'Star', isCustom: false, isEnabled: true, requiredCount: 0, conditions: [ { type: 'TASKS_COMPLETED', target: 1, timeframe: 'TOTAL' } ] },
    ];
    const tasks: any[] = [ { id: 't1', date: '2025-01-01', status: 'completed' } ];
    const attempts: any[] = [];
    const allCompletedWork: any[] = [];
    const result = selectNewlyEarnedBadges(badges, { tasks: tasks as any, attempts, allCompletedWork });
    expect(result.map(b => b.id)).toContain('b1');
  });

  test('selectAiBriefingData summarizes deltas and badges', () => {
    const data = selectAiBriefingData(
      {
        today: { duration: 3600, points: 12 },
        yesterday: { duration: 0, points: 0 },
        dailyAverage: { duration: 1800, points: 6 },
      },
      { earnedCount: 2, totalCount: 10 }
    );
    expect(data.summary.todayMinutes).toBe(60);
    expect(['up','down']).toContain(data.summary.trend);
    expect(data.badges.earnedCount).toBe(2);
  });

  test('selectAchievementProgress finds nearest badge and progress', () => {
    const badges: Badge[] = [
      { id: 'b-study', name: '120min', description: '', category: 'daily', icon: 'Zap', isCustom: false, isEnabled: true, requiredCount: 0, conditions: [ { type: 'TOTAL_STUDY_TIME', target: 120, timeframe: 'DAY' } ] },
      { id: 'b-points', name: '100pts', description: '', category: 'overall', icon: 'Trophy', isCustom: false, isEnabled: true, requiredCount: 0, conditions: [ { type: 'POINTS_EARNED', target: 100, timeframe: 'TOTAL' } ] },
    ];
    const m = { totalStudyMinutes: 60, totalPoints: 20 };
    const res = selectAchievementProgress(m, badges);
    expect(res.nextBadge).toBeTruthy();
    expect(res.progress).toBeGreaterThan(0);
    expect(res.progress).toBeLessThanOrEqual(1);
  });

  test('selectAchievementProgress supports default/unsupported condition types', () => {
    const badges: Badge[] = [
      { id: 'b-all', name: 'All Tasks Day', description: '', category: 'daily', icon: 'Trophy', isCustom: false, isEnabled: true, requiredCount: 0, conditions: [ { type: 'ALL_TASKS_COMPLETED_ON_DAY' as any, target: 1, timeframe: 'DAY' } ] },
    ];
    const res = selectAchievementProgress({}, badges);
    expect(res.nextBadge?.id).toBe('b-all');
    expect(res.progress).toBe(1);
  });
});
