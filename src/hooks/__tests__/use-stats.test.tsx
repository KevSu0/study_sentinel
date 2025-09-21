import { renderHook } from '@testing-library/react';
import { useStats } from '../use-stats';
import { StudyTask, CompletedWork, Badge, UserProfile } from '@/lib/types';
import { format, subDays, parseISO, set } from 'date-fns';

// --- Mock Data ---
const MOCK_DATE = '2024-07-27T10:00:00.000Z';
const today = new Date(MOCK_DATE);
const todayStr = format(today, 'yyyy-MM-dd');
const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
const twoDaysAgoStr = format(subDays(today, 2), 'yyyy-MM-dd');
const lastMonthStr = format(subDays(today, 30), 'yyyy-MM-dd');

const mockTasks: StudyTask[] = [
  // Today's tasks
  { id: 't1', shortId: 'T-1', title: 'Completed Task Today', status: 'completed', date: todayStr, time: '10:00', priority: 'high', points: 10, timerType: 'infinity' },
  { id: 't2', shortId: 'T-2', title: 'Todo Task Today', status: 'todo', date: todayStr, time: '11:00', priority: 'medium', points: 5, timerType: 'infinity' },
  // Yesterday's task
  { id: 't3', shortId: 'T-3', title: 'Completed Task Yesterday', status: 'completed', date: yesterdayStr, time: '14:00', priority: 'low', points: 2, timerType: 'infinity' },
  // Archived task (should be ignored)
  { id: 't4', shortId: 'T-4', title: 'Archived Task', status: 'archived', date: todayStr, time: '15:00', priority: 'low', points: 1, timerType: 'infinity' },
  // Last month's task
  { id: 't5', shortId: 'T-5', title: 'Completed Task Last Month', status: 'completed', date: lastMonthStr, time: '10:00', priority: 'high', points: 15, timerType: 'infinity' },
];

const mockAllCompletedWork: CompletedWork[] = [
  // Today's work
  { date: todayStr, duration: 3600, type: 'task', title: 'Completed Task Today', points: 10, timestamp: new Date(new Date(MOCK_DATE).setUTCHours(10, 0, 0, 0)).toISOString(), priority: 'high', totalDuration: 3600, productiveDuration: 3240, pauseDuration: 360, pauseCount: 2, focusPercentage: 90, metricsVersion: '1.1.0' },
  { date: todayStr, duration: 1800, type: 'routine', title: 'Morning Routine', points: 5, timestamp: new Date(new Date(MOCK_DATE).setUTCHours(9, 0, 0, 0)).toISOString(), priority: 'medium', totalDuration: 1800, productiveDuration: 1620, pauseDuration: 180, pauseCount: 1, focusPercentage: 90, metricsVersion: '1.1.0' },
  // Yesterday's work
  { date: yesterdayStr, duration: 7200, type: 'task', title: 'Completed Task Yesterday', points: 2, timestamp: new Date(subDays(new Date(MOCK_DATE), 1).setUTCHours(14, 0, 0, 0)).toISOString(), priority: 'low', totalDuration: 7200, productiveDuration: 6480, pauseDuration: 720, pauseCount: 3, focusPercentage: 90, metricsVersion: '1.1.0' },
  // Two days ago
  { date: twoDaysAgoStr, duration: 3600, type: 'task', title: 'Old Task', points: 5, timestamp: new Date(subDays(new Date(MOCK_DATE), 2).setUTCHours(12, 0, 0, 0)).toISOString(), priority: 'medium', totalDuration: 3600, productiveDuration: 3240, pauseDuration: 360, pauseCount: 2, focusPercentage: 90, metricsVersion: '1.1.0' },
  // Last month's work
  { date: lastMonthStr, duration: 5400, type: 'task', title: 'Completed Task Last Month', points: 15, timestamp: new Date(subDays(new Date(MOCK_DATE), 30).setUTCHours(10, 0, 0, 0)).toISOString(), priority: 'high', totalDuration: 5400, productiveDuration: 4860, pauseDuration: 540, pauseCount: 3, focusPercentage: 90, metricsVersion: '1.1.0' },
];

const mockAllBadges: Badge[] = [
  { id: 'b1', name: 'Daily Dedication', description: '', category: 'daily', icon: 'star', isCustom: false, isEnabled: true, requiredCount: 1, conditions: [] },
  { id: 'b2', name: 'Weekly Warrior', description: '', category: 'weekly', icon: 'shield', isCustom: false, isEnabled: true, requiredCount: 1, conditions: [] },
  { id: 'b3', name: 'Custom Badge', description: '', category: 'overall', icon: 'gem', isCustom: true, isEnabled: true, requiredCount: 1, conditions: [] },
  { id: 'b4', name: 'Disabled Badge', description: '', category: 'monthly', icon: 'moon', isCustom: false, isEnabled: false, requiredCount: 1, conditions: [] },
];

const mockEarnedBadges = new Map<string, string>([
  ['b1', todayStr],
]);

const mockProfile: UserProfile = {
  name: 'Test User',
  dailyStudyGoal: 2, // 2 hours
};

const defaultProps = {
  tasks: mockTasks,
  allCompletedWork: mockAllCompletedWork,
  allBadges: mockAllBadges,
  earnedBadges: mockEarnedBadges,
  selectedDate: today,
  profile: mockProfile,
  timeRange: 'overall',
};

describe('useStats', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(today);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Time Range Filtering', () => {
    it('should filter correctly for "daily" time range', () => {
      const { result } = renderHook(() => useStats({ ...defaultProps, timeRange: 'daily' }));
      expect(result.current.timeRangeStats.completedCount).toBe(2);
      expect(result.current.timeRangeStats.totalHours).toBe('1.5');
    });

    it('should filter correctly for "weekly" time range', () => {
      const { result } = renderHook(() => useStats({ ...defaultProps, timeRange: 'weekly' }));
      expect(result.current.timeRangeStats.completedCount).toBe(4); // Today, yesterday, 2 days ago
      expect(result.current.timeRangeStats.totalHours).toBe('4.5'); // 1.5 + 2 + 1
    });

    it('should filter correctly for "monthly" time range', () => {
      const { result } = renderHook(() => useStats({ ...defaultProps, timeRange: 'monthly' }));
      // monthly is last 30 days, so it includes today + the last 29 days.
      // The mock item from exactly 30 days ago is included because the range is inclusive.
      expect(result.current.timeRangeStats.completedCount).toBe(5);
      expect(result.current.timeRangeStats.totalHours).toBe('6.0');
    });

    it('should filter correctly for "overall" time range', () => {
      const { result } = renderHook(() => useStats({ ...defaultProps, timeRange: 'overall' }));
      expect(result.current.timeRangeStats.completedCount).toBe(5);
      expect(result.current.timeRangeStats.totalHours).toBe('6.0');
    });
  });

  describe('Core Statistics', () => {
    it('should calculate timeRangeStats correctly', () => {
      const { result } = renderHook(() => useStats({ ...defaultProps, timeRange: 'daily' }));
      const stats = result.current.timeRangeStats;
      expect(stats.totalHours).toBe('1.5');
      expect(stats.totalPoints).toBe(15);
      expect(stats.completedCount).toBe(2);
      expect(stats.completionRate).toBeCloseTo(50);
      expect(stats.avgSessionDuration).toBe('45');
    });

    it('should calculate studyStreak correctly', () => {
      const { result } = renderHook(() => useStats({ ...defaultProps }));
      expect(result.current.studyStreak).toBe(3);
    });

    it('should calculate studyStreak correctly when user has not studied today', () => {
        const workWithoutToday = mockAllCompletedWork.filter(w => w.date !== todayStr);
        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: workWithoutToday }));
        expect(result.current.studyStreak).toBe(2); // Yesterday and two days ago
    });

    it('should return a streak of 1 if user only studied today', () => {
        const workWithGap = [
            mockAllCompletedWork[0], // Today
            mockAllCompletedWork[3], // Two days ago
        ];
        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: workWithGap }));
        expect(result.current.studyStreak).toBe(1);
    });

    it('should return a streak of 1 if user only studied yesterday', () => {
        const workWithGap = [
            mockAllCompletedWork[2], // Yesterday
        ];
        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: workWithGap }));
        expect(result.current.studyStreak).toBe(1);
    });

    it('should return a streak of 0 if there was a gap in studying', () => {
        const workWithGap = [
            mockAllCompletedWork[3], // Two days ago
        ];
        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: workWithGap }));
        expect(result.current.studyStreak).toBe(0);
    });

    it('should calculate badgeStats correctly', () => {
      const { result } = renderHook(() => useStats({ ...defaultProps }));
      expect(result.current.badgeStats.earnedCount).toBe(1);
      expect(result.current.badgeStats.totalCount).toBe(4);
    });
  });

  describe('Chart Data Generation', () => {
    it('should generate categorizedBadges correctly', () => {
      const { result } = renderHook(() => useStats({ ...defaultProps }));
      const { categorizedBadges } = result.current;
      expect(categorizedBadges.daily).toHaveLength(1);
      expect(categorizedBadges.weekly).toHaveLength(1);
      expect(categorizedBadges.monthly).toHaveLength(0); // Disabled badge is ignored
      expect(categorizedBadges.overall).toHaveLength(1); // Custom badge
    });

    it('should generate dailyPieChartData correctly', () => {
      const { result } = renderHook(() => useStats({ ...defaultProps }));
      const { dailyPieChartData } = result.current;
      expect(dailyPieChartData).toHaveLength(2);
      expect(dailyPieChartData).toContainEqual({ name: 'Task: Completed Task Today', value: 3600 });
      expect(dailyPieChartData).toContainEqual({ name: 'Routine: Morning Routine', value: 1800 });
    });

    it('should generate dailyActivityTimelineData correctly', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps }));
        const { dailyActivityTimelineData } = result.current;
        expect(dailyActivityTimelineData).toHaveLength(2);
        expect(dailyActivityTimelineData[0].name).toBe('Completed Task Today');
        expect(dailyActivityTimelineData[0].time).toEqual([10, 11]);
        expect(dailyActivityTimelineData[1].name).toBe('Morning Routine');
        expect(dailyActivityTimelineData[1].time).toEqual([9, 9.5]);
    });

    it('should handle timeline data crossing midnight (study day starts at 4am)', () => {
        const lateNightDate = new Date(today);
        lateNightDate.setUTCHours(2, 0, 0, 0);
        const workAcrossMidnight: CompletedWork[] = [
            { date: yesterdayStr, duration: 3600, type: 'task', title: 'Late Night Task', points: 10, timestamp: lateNightDate.toISOString(), priority: 'high', totalDuration: 3600, productiveDuration: 3240, pauseDuration: 360, pauseCount: 2, focusPercentage: 90, metricsVersion: '1.1.0' },
        ];
        // Select yesterday, because the 2am work on 'today' belongs to yesterday's study day.
        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: workAcrossMidnight, selectedDate: subDays(today, 1) }));
        const { dailyActivityTimelineData } = result.current;
        expect(dailyActivityTimelineData).toHaveLength(1);
        expect(dailyActivityTimelineData[0].time[0]).toBe(26); // 2am becomes 26h on the previous day's timeline
        expect(dailyActivityTimelineData[0].time[1]).toBe(27);
    });

    it('should generate barChartData for "daily" view', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps, timeRange: 'daily' }));
        const { barChartData } = result.current;
        expect(barChartData).toHaveLength(2);
        expect(barChartData[0].name).toBe('Completed Task Today');
        expect(barChartData[0].hours).toBe(1.0);
        expect(barChartData[1].name).toBe('Morning Routine');
        expect(barChartData[1].hours).toBe(0.5);
    });

    it('should generate empty barChartData for "daily" view when there is no work', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: [], timeRange: 'daily' }));
        expect(result.current.barChartData).toEqual([]);
    });

    it('should truncate long titles in "daily" barChartData', () => {
        const longTitleWork = [{ ...mockAllCompletedWork[0], title: 'This is a very long task title that should be truncated' }];
        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: longTitleWork, timeRange: 'daily' }));
        expect(result.current.barChartData[0].name).toBe('This is a very lon...');
    });

    it('should generate barChartData for "weekly" view', () => {
      const { result } = renderHook(() => useStats({ ...defaultProps, timeRange: 'weekly' }));
      const { barChartData } = result.current;
      expect(barChartData).toHaveLength(7);
      expect(barChartData[6].name).toBe('Sat');
      expect(barChartData[6].hours).toBe(1.5);
      expect(barChartData[5].name).toBe('Fri');
      expect(barChartData[5].hours).toBe(2.0);
      expect(barChartData[4].name).toBe('Thu');
      expect(barChartData[4].hours).toBe(1.0);
    });

    it('should generate barChartData for "monthly" view', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps, timeRange: 'monthly' }));
        const { barChartData } = result.current;
        expect(barChartData).toHaveLength(30);
        expect(barChartData[29].name).toBe('27'); // Today's date
        expect(barChartData[29].hours).toBe(1.5);
    });

    it('should generate barChartData for "overall" view', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps, timeRange: 'overall' }));
        const { barChartData } = result.current;
        expect(barChartData).toHaveLength(2);
        expect(barChartData[0].name).toBe('Jun 24');
        expect(barChartData[0].hours).toBe(1.5);
        expect(barChartData[1].name).toBe('Jul 24');
        expect(barChartData[1].hours).toBe(4.5);
    });
  });

  describe('Comparison and Coach Stats', () => {
    it('should calculate dailyComparisonStats correctly', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps }));
        const { dailyComparisonStats } = result.current;
        expect(dailyComparisonStats.today.duration).toBe(5400);
        expect(dailyComparisonStats.today.points).toBe(15);
        expect(dailyComparisonStats.yesterday.duration).toBe(7200);
        expect(dailyComparisonStats.yesterday.points).toBe(2);
        expect(dailyComparisonStats.dailyAverage.duration).toBeCloseTo(5400);
        expect(dailyComparisonStats.dailyAverage.points).toBe(9);
    });

    it('should calculate performanceCoachStats correctly', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps }));
        const { performanceCoachStats } = result.current;
        expect(new Date(performanceCoachStats.selectedDateSession!.start).getUTCHours()).toBe(9);
        expect(new Date(performanceCoachStats.selectedDateSession!.end).getUTCHours()).toBe(11);
        const avgStartHour = new Date(performanceCoachStats.week.avgStart!).getUTCHours();
        expect(avgStartHour).toBe(11);
    });

    it('should calculate average start/end times in performanceCoachStats', () => {
        const coachWork: CompletedWork[] = [
            // Today: 10am - 11am
            { date: todayStr, duration: 3600, type: 'task', title: 'Task 1', points: 10, timestamp: new Date(new Date(MOCK_DATE).setUTCHours(10, 0, 0, 0)).toISOString(), priority: 'high', totalDuration: 3600, productiveDuration: 3240, pauseDuration: 360, pauseCount: 2, focusPercentage: 90, metricsVersion: '1.1.0' },
            // Yesterday: 11am - 12pm
            { date: yesterdayStr, duration: 3600, type: 'task', title: 'Task 2', points: 10, timestamp: new Date(subDays(new Date(MOCK_DATE), 1).setUTCHours(11, 0, 0, 0)).toISOString(), priority: 'high', totalDuration: 3600, productiveDuration: 3240, pauseDuration: 360, pauseCount: 2, focusPercentage: 90, metricsVersion: '1.1.0' },
        ];

        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: coachWork, selectedDate: today }));
        const { performanceCoachStats } = result.current;

        // selectedDateSession should be for today's work
        expect(new Date(performanceCoachStats.selectedDateSession!.start).getUTCHours()).toBe(10);
        expect(new Date(performanceCoachStats.selectedDateSession!.end).getUTCHours()).toBe(11);

        // week average start time: avg of 10:00 and 11:00 is 10:30
        const avgStartDate = new Date(performanceCoachStats.week.avgStart!);
        expect(avgStartDate.getUTCHours()).toBe(10);
        expect(avgStartDate.getUTCMinutes()).toBe(30);

        // week average end time: avg of 11:00 and 12:00 is 11:30
        const avgEndDate = new Date(performanceCoachStats.week.avgEnd!);
        expect(avgEndDate.getUTCHours()).toBe(11);
        expect(avgEndDate.getUTCMinutes()).toBe(30);
    });
  });

  describe('Routine Stats', () => {
    it('should calculate routineStats correctly', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps, timeRange: 'overall' }));
        const { routineStats } = result.current;
        expect(routineStats).toHaveLength(1);
        expect(routineStats[0].name).toBe('Morning Routine');
        expect(routineStats[0].totalSeconds).toBe(1800);
        expect(routineStats[0].sessionCount).toBe(1);
        expect(routineStats[0].points).toBe(5);
    });
  });

  describe('Edge Cases and Empty Data', () => {
    const emptyProps = {
        tasks: [],
        allCompletedWork: [],
        allBadges: [],
        earnedBadges: new Map(),
        selectedDate: today,
        profile: { name: 'Test User' },
        timeRange: 'daily',
    };

    it('should handle all empty inputs without crashing', () => {
        const { result } = renderHook(() => useStats(emptyProps));
        expect(result.current.timeRangeStats.totalHours).toBe('0.0');
        expect(result.current.timeRangeStats.totalPoints).toBe(0);
        expect(result.current.timeRangeStats.completedCount).toBe(0);
        expect(result.current.timeRangeStats.completionRate).toBe(0);
        expect(result.current.timeRangeStats.avgSessionDuration).toBe('0');
        expect(result.current.studyStreak).toBe(0);
        expect(result.current.badgeStats.earnedCount).toBe(0);
        expect(result.current.badgeStats.totalCount).toBe(0);
        expect(result.current.dailyPieChartData).toEqual([]);
        expect(result.current.barChartData).toEqual([]);
        expect(result.current.routineStats).toEqual([]);
    });

    it('should handle no completed work for streak calculation', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: [] }));
        expect(result.current.studyStreak).toBe(0);
    });

    it('should handle no tasks for completion rate', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps, tasks: [] }));
        expect(result.current.timeRangeStats.completionRate).toBe(0);
    });

    it('should handle no profile goal for bar chart', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps, profile: { name: 'NoGoal' }, timeRange: 'weekly' }));
        expect(result.current.barChartData[0].goal).toBe(8); // Falls back to 8
    });

    it('should handle no work for performance coach', () => {
        const { result } = renderHook(() => useStats(emptyProps));
        expect(result.current.performanceCoachStats.selectedDateSession).toBeNull();
        expect(result.current.performanceCoachStats.week.avgStart).toBeNull();
    });

    it('should handle invalid timestamp for performance coach', () => {
        const invalidWork = [{ ...mockAllCompletedWork[0], timestamp: 'invalid-date', metricsVersion: '1.1.0' }];
        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: invalidWork }));
        // It should not crash and fallback to null/0
        expect(result.current.performanceCoachStats.selectedDateSession).toBeNull();
        expect(result.current.performanceCoachStats.week.avgStart).toBeNull();
    });

    it('should handle daily comparison when there is no work for a given day', () => {
        const workWithGaps = [
             mockAllCompletedWork[0], // Today
             mockAllCompletedWork[3], // Two days ago
        ];
        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: workWithGaps, selectedDate: subDays(today, 1) })); // Select yesterday
        const { dailyComparisonStats } = result.current;

        expect(dailyComparisonStats.today.duration).toBe(0); // "Today" for the hook is yesterday
        expect(dailyComparisonStats.yesterday.duration).toBe(3600); // "Yesterday" is two days ago
    });

    it('should handle daily comparison with no work at all', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps, allCompletedWork: [] }));
        const { dailyComparisonStats } = result.current;
        expect(dailyComparisonStats.dailyAverage.duration).toBe(0);
        expect(dailyComparisonStats.dailyAverage.points).toBe(0);
    });

    it('should handle performance coach stats when work exists but not for the selected day', () => {
        const { result } = renderHook(() => useStats({ ...defaultProps, selectedDate: subDays(today, 10) })); // A day with no work
        const { performanceCoachStats } = result.current;
        expect(performanceCoachStats.selectedDateSession).toBeNull();
        // There is no work in the 7 days leading up to the selectedDate, so the average should be null.
        expect(performanceCoachStats.week.avgStart).toBeNull();
    });
  });
});