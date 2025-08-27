import { checkBadge } from '../badges';
import { Badge, StudyTask, LogEvent } from '@/lib/types';
import { format, subDays, subWeeks, subMonths } from 'date-fns';

// --- Mock Data & Helpers ---
const MOCK_DATE = '2024-07-27T10:00:00.000Z';
const today = new Date(MOCK_DATE);
const todayStr = format(today, 'yyyy-MM-dd');
const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

const createLog = (
  type: LogEvent['type'],
  payload: any,
  daysAgo = 0
): LogEvent => ({
  id: `log-${Math.random()}`,
  timestamp: subDays(today, daysAgo).toISOString(),
  type,
  payload,
});

const createTask = (
  status: 'completed' | 'todo' | 'archived',
  daysAgo = 0,
  options: { duration?: number; points?: number } = {}
): StudyTask => ({
  id: `task-${Math.random()}`,
  shortId: 'T-123',
  title: 'Test Task',
  status,
  date: format(subDays(today, daysAgo), 'yyyy-MM-dd'),
  time: '10:00',
  priority: 'medium',
  points: options.points ?? 10,
  timerType: 'infinity',
  duration: options.duration,
});

const baseBadge: Badge = {
  id: 'b1',
  name: 'Test Badge',
  description: '',
  category: 'daily',
  icon: 'star',
  isCustom: false,
  isEnabled: true,
  requiredCount: 0,
  conditions: [],
};

describe('checkBadge', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(today);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should return false if badge is disabled', () => {
    const badge: Badge = { ...baseBadge, isEnabled: false, conditions: [{ type: 'TASKS_COMPLETED', target: 1, timeframe: 'TOTAL' }] };
    const result = checkBadge(badge, { tasks: [createTask('completed')], logs: [] });
    expect(result).toBe(false);
  });

  it('should return true for a badge with no conditions', () => {
    const badge: Badge = { ...baseBadge, conditions: [] };
    const result = checkBadge(badge, { tasks: [], logs: [] });
    expect(result).toBe(true);
  });

  it('should correctly calculate work from mixed log types and manual completions', () => {
    // This test implicitly checks the getAllCompletedWork helper function
    const badge: Badge = { ...baseBadge, conditions: [{ type: 'TOTAL_STUDY_TIME', target: 100, timeframe: 'TOTAL' }] };
    const timedTask = createTask('completed', 0);
    const manualTask = createTask('completed', 0, { duration: 10 }); // 10 mins manual
    const logs = [
      createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 10, taskId: timedTask.id }, 0), // 60 mins
      createLog('ROUTINE_SESSION_COMPLETE', { duration: 1800, points: 5 }, 0), // 30 mins
    ];
    // Total time = 60 (timed task) + 30 (routine) + 10 (manual task) = 100
    const result = checkBadge(badge, { tasks: [timedTask, manualTask], logs });
    expect(result).toBe(true);
  });

  it('should handle tasks with undefined or zero duration and logs with undefined points', () => {
    // This test implicitly checks getAllCompletedWork for robustness
    const badge: Badge = { ...baseBadge, conditions: [{ type: 'TOTAL_STUDY_TIME', target: 60, timeframe: 'TOTAL' }] };
    const manualTaskUndefined = createTask('completed', 0, { duration: undefined }); // duration becomes 0
    const manualTaskZero = createTask('completed', 0, { duration: 0 }); // duration is 0
    const logs = [
      createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: undefined }, 0), // 60 mins
    ];
    const result = checkBadge(badge, { tasks: [manualTaskUndefined, manualTaskZero], logs });
    expect(result).toBe(true);
  });

  describe('Condition: TASKS_COMPLETED', () => {
    it('[TOTAL] should be true if total completed tasks meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TASKS_COMPLETED', target: 2, timeframe: 'TOTAL' }] };
      const tasks = [createTask('completed', 1), createTask('completed', 5)];
      const result = checkBadge(badge, { tasks, logs: [] });
      expect(result).toBe(true);
    });

    it('[DAY] should be true if daily completed tasks meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TASKS_COMPLETED', target: 2, timeframe: 'DAY' }] };
      const tasks = [createTask('completed', 0), createTask('completed', 0), createTask('completed', 1)];
      const result = checkBadge(badge, { tasks, logs: [] });
      expect(result).toBe(true);
    });

    it('[WEEK] should be true if weekly completed tasks meet target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TASKS_COMPLETED', target: 3, timeframe: 'WEEK' }] };
        const tasks = [
            createTask('completed', 0), // This week
            createTask('completed', 2), // This week
            createTask('completed', 3), // This week
            createTask('completed', 8), // Last week
        ];
        const result = checkBadge(badge, { tasks, logs: [] });
        expect(result).toBe(true);
    });

    it('[MONTH] should be true if monthly completed tasks meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TASKS_COMPLETED', target: 2, timeframe: 'MONTH' }] };
      const tasks = [
          createTask('completed', 5),   // This month
          createTask('completed', 15),  // This month
          createTask('completed', 40),  // Last month
      ];
      const result = checkBadge(badge, { tasks, logs: [] });
      expect(result).toBe(true);
    });

    it('[DAY] should be false if no work was done in the period', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TASKS_COMPLETED', target: 1, timeframe: 'DAY' }] };
        const tasks: StudyTask[] = []; // No tasks, so no work done
        const result = checkBadge(badge, { tasks, logs: [] });
        expect(result).toBe(false);
    });
  });

  describe('Condition: ROUTINES_COMPLETED', () => {
    it('[TOTAL] should be true if total completed routines meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'ROUTINES_COMPLETED', target: 2, timeframe: 'TOTAL' }] };
      const logs = [
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 600, points: 5 }, 1),
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 600, points: 5 }, 5),
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(true);
    });

    it('[DAY] should be true if daily completed routines meet target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'ROUTINES_COMPLETED', target: 2, timeframe: 'DAY' }] };
        const logs = [
          createLog('ROUTINE_SESSION_COMPLETE', { duration: 600, points: 5 }, 0),
          createLog('ROUTINE_SESSION_COMPLETE', { duration: 600, points: 5 }, 0),
          createLog('ROUTINE_SESSION_COMPLETE', { duration: 600, points: 5 }, 1),
        ];
        const result = checkBadge(badge, { tasks: [], logs });
        expect(result).toBe(true);
    });

    it('[WEEK] should be true if weekly completed routines meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'ROUTINES_COMPLETED', target: 2, timeframe: 'WEEK' }] };
      const logs = [
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 600, points: 5 }, 1), // This week
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 600, points: 5 }, 3), // This week
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 600, points: 5 }, 8), // Last week
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(true);
    });

    it('[MONTH] should be true if monthly completed routines meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'ROUTINES_COMPLETED', target: 2, timeframe: 'MONTH' }] };
      const logs = [
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 600, points: 5 }, 5),  // This month
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 600, points: 5 }, 15), // This month
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 600, points: 5 }, 40), // Last month
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(true);
    });
  });

  describe('Condition: TOTAL_STUDY_TIME', () => {
    it('[DAY] should be true if total study time in a day meets target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TOTAL_STUDY_TIME', target: 60, timeframe: 'DAY' }] }; // 60 minutes
      const logs = [
        createLog('TIMER_SESSION_COMPLETE', { duration: 1800, points: 10 }, 0), // 30 mins
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 2400, points: 15 }, 0), // 40 mins
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(true);
    });

    it('[WEEK] should be true if total study time in a week meets target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TOTAL_STUDY_TIME', target: 120, timeframe: 'WEEK' }] }; // 120 minutes
        const logs = [
          createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 10 }, 1), // 60 mins
          createLog('ROUTINE_SESSION_COMPLETE', { duration: 4800, points: 15 }, 3), // 80 mins
        ];
        const result = checkBadge(badge, { tasks: [], logs });
        expect(result).toBe(true);
      });

      it('[MONTH] should be true if total study time in a month meets target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TOTAL_STUDY_TIME', target: 100, timeframe: 'MONTH' }] }; // 100 minutes
        const logs = [
          createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 10 }, 5), // 60 mins this month
          createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 10 }, 15), // 60 mins this month
          createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 10 }, 40), // 60 mins last month
        ];
        const result = checkBadge(badge, { tasks: [], logs });
        expect(result).toBe(true);
      });
  });

  describe('Condition: POINTS_EARNED', () => {
    it('[TOTAL] should be true if total points earned meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'POINTS_EARNED', target: 100, timeframe: 'TOTAL' }] };
      const logs = [
        createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 50 }, 10),
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 3600, points: 50 }, 20),
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(true);
    });

    it('[DAY] should be true if daily points earned meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'POINTS_EARNED', target: 75, timeframe: 'DAY' }] };
      const logs = [
        createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 50 }, 0), // Today
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 3600, points: 25 }, 0), // Today
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 3600, points: 100 }, 1), // Yesterday
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(true);
    });

    it('[WEEK] should be true if weekly points earned meet target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'POINTS_EARNED', target: 75, timeframe: 'WEEK' }] };
        const logs = [
          createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 50 }, 2), // This week
          createLog('ROUTINE_SESSION_COMPLETE', { duration: 3600, points: 25 }, 4), // This week
          createLog('ROUTINE_SESSION_COMPLETE', { duration: 3600, points: 100 }, 8), // Last week
        ];
        const result = checkBadge(badge, { tasks: [], logs });
        expect(result).toBe(true);
      });

    it('[MONTH] should be true if monthly points earned meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'POINTS_EARNED', target: 150, timeframe: 'MONTH' }] };
      const logs = [
        createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 100 }, 5),  // This month
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 3600, points: 50 }, 15), // This month
        createLog('ROUTINE_SESSION_COMPLETE', { duration: 3600, points: 100 }, 40),// Last month
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(true);
    });
  });

  describe('Condition: DAY_STREAK', () => {
    it('should be true if day streak meets target ending today', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 3, timeframe: 'TOTAL' }] };
      const logs = [
        createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 0),
        createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 1),
        createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 2),
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(true);
    });

    it('should be true if day streak meets target ending yesterday', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 3, timeframe: 'TOTAL' }] };
        const logs = [
          createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 1),
          createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 2),
          createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 3),
        ];
        const result = checkBadge(badge, { tasks: [], logs });
        expect(result).toBe(true);
      });

    it('should be false if streak is broken', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 3, timeframe: 'TOTAL' }] };
      const logs = [
        createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 0),
        createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 2), // Gap day
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(false);
    });

    it('should correctly calculate a streak that was broken and restarted', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 2, timeframe: 'TOTAL' }] };
        const logs = [
          // Old, broken streak
          createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 5),
          createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 6),
          // New, current streak
          createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 0),
          createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 1),
        ];
        const result = checkBadge(badge, { tasks: [], logs });
        expect(result).toBe(true);
      });

    it('should be false if there are no logs', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 1, timeframe: 'TOTAL' }] };
        const result = checkBadge(badge, { tasks: [], logs: [] });
        expect(result).toBe(false);
    });

    it('should be false if study days are fewer than target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 3, timeframe: 'TOTAL' }] };
      const logs = [ createLog('TIMER_SESSION_COMPLETE', { duration: 600, points: 5 }, 0) ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(false);
    });
  });

  describe('Condition: SINGLE_SESSION_TIME', () => {
    it('should be true if any single session meets target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'SINGLE_SESSION_TIME', target: 90, timeframe: 'TOTAL' }] };
      const logs = [
        createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 10 }, 5), // 60 mins
        createLog('TIMER_SESSION_COMPLETE', { duration: 5400, points: 20 }, 2), // 90 mins
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(true);
    });
  });

  describe('Condition: ALL_TASKS_COMPLETED_ON_DAY', () => {
    it('should be true if all tasks for a given day are completed', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'ALL_TASKS_COMPLETED_ON_DAY', target: 1, timeframe: 'DAY' }] };
      const tasks = [
        { ...createTask('completed', 1), date: yesterdayStr },
        { ...createTask('completed', 1), date: yesterdayStr },
        { ...createTask('todo', 0), date: todayStr }, // Incomplete task on another day
      ];
      const result = checkBadge(badge, { tasks, logs: [] });
      expect(result).toBe(true);
    });

    it('should be false if any task on a day is not completed', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'ALL_TASKS_COMPLETED_ON_DAY', target: 1, timeframe: 'DAY' }] };
        const tasks = [
          { ...createTask('completed', 1), date: yesterdayStr },
          { ...createTask('todo', 1), date: yesterdayStr },
        ];
        const result = checkBadge(badge, { tasks, logs: [] });
        expect(result).toBe(false);
      });

    it('should ignore archived tasks', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'ALL_TASKS_COMPLETED_ON_DAY', target: 1, timeframe: 'DAY' }] };
        const tasks = [
          { ...createTask('completed', 1), date: yesterdayStr },
          { ...createTask('archived', 1), date: yesterdayStr },
        ];
        const result = checkBadge(badge, { tasks, logs: [] });
        expect(result).toBe(true);
    });

    it('should be false if a day contains only archived tasks', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'ALL_TASKS_COMPLETED_ON_DAY', target: 1, timeframe: 'DAY' }] };
        const tasks = [
          { ...createTask('archived', 1), date: yesterdayStr },
          { ...createTask('archived', 1), date: yesterdayStr },
        ];
        const result = checkBadge(badge, { tasks, logs: [] });
        expect(result).toBe(false);
    });

    it('should be false if there are no tasks at all', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'ALL_TASKS_COMPLETED_ON_DAY', target: 1, timeframe: 'DAY' }] };
      const result = checkBadge(badge, { tasks: [], logs: [] });
      expect(result).toBe(false);
    });
  });

  describe('Condition: TIME_ON_SUBJECT', () => {
    it('[TOTAL] should be true if total time on a subject meets target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TIME_ON_SUBJECT', target: 90, timeframe: 'TOTAL', subjectId: 'subj-1' }] };
        const logs = [
            createLog('TIMER_SESSION_COMPLETE', { duration: 3600, taskId: 'subj-1' }, 1), // 60 min
            createLog('TIMER_SESSION_COMPLETE', { duration: 1800, taskId: 'subj-1' }, 5), // 30 min
            createLog('TIMER_SESSION_COMPLETE', { duration: 3600, taskId: 'subj-2' }, 2), // 60 min on other subject
        ];
        const result = checkBadge(badge, { tasks: [], logs });
        expect(result).toBe(true);
    });

    it('[DAY] should be true if daily time on a subject meets target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TIME_ON_SUBJECT', target: 90, timeframe: 'DAY', subjectId: 'subj-1' }] };
        const logs = [
            createLog('TIMER_SESSION_COMPLETE', { duration: 3600, taskId: 'subj-1' }, 0), // 60 min today
            createLog('TIMER_SESSION_COMPLETE', { duration: 1800, taskId: 'subj-1' }, 0), // 30 min today
            createLog('TIMER_SESSION_COMPLETE', { duration: 3600, taskId: 'subj-1' }, 1), // 60 min yesterday
        ];
        const result = checkBadge(badge, { tasks: [], logs });
        expect(result).toBe(true);
    });

    it('[DAY] should be false if daily time on a subject does not meet target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TIME_ON_SUBJECT', target: 90, timeframe: 'DAY', subjectId: 'subj-1' }] };
        const logs = [
            createLog('TIMER_SESSION_COMPLETE', { duration: 3600, taskId: 'subj-1' }, 0), // 60 min today
            createLog('TIMER_SESSION_COMPLETE', { duration: 3600, taskId: 'subj-1' }, 1), // 60 min yesterday
        ];
        const result = checkBadge(badge, { tasks: [], logs });
        expect(result).toBe(false);
    });

    it('[WEEK] should be true if weekly time on a subject meets target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TIME_ON_SUBJECT', target: 90, timeframe: 'WEEK', subjectId: 'subj-1' }] };
      const logs = [
          createLog('TIMER_SESSION_COMPLETE', { duration: 3600, taskId: 'subj-1' }, 1), // 60 min this week
          createLog('TIMER_SESSION_COMPLETE', { duration: 1800, taskId: 'subj-1' }, 3), // 30 min this week
          createLog('TIMER_SESSION_COMPLETE', { duration: 3600, taskId: 'subj-1' }, 8), // 60 min last week
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(true);
    });

    it('[MONTH] should be true if monthly time on a subject meets target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TIME_ON_SUBJECT', target: 90, timeframe: 'MONTH', subjectId: 'subj-1' }] };
      const logs = [
          createLog('TIMER_SESSION_COMPLETE', { duration: 3600, taskId: 'subj-1' }, 5),  // 60 min this month
          createLog('TIMER_SESSION_COMPLETE', { duration: 1800, taskId: 'subj-1' }, 15), // 30 min this month
          createLog('TIMER_SESSION_COMPLETE', { duration: 3600, taskId: 'subj-1' }, 40), // 60 min last month
      ];
      const result = checkBadge(badge, { tasks: [], logs });
      expect(result).toBe(true);
    });
  });

  describe('Complex Conditions', () => {
    it('should return true only if all conditions are met', () => {
      const badge: Badge = {
        ...baseBadge,
        conditions: [
          { type: 'TASKS_COMPLETED', target: 1, timeframe: 'TOTAL' },
          { type: 'TOTAL_STUDY_TIME', target: 60, timeframe: 'DAY' },
        ],
      };
      const tasks = [createTask('completed', 0)];
      const logs = [createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 10 }, 0)]; // 60 mins
      const result = checkBadge(badge, { tasks, logs });
      expect(result).toBe(true);
    });

    it('should return false if any condition is not met', () => {
        const badge: Badge = {
          ...baseBadge,
          conditions: [
            { type: 'TASKS_COMPLETED', target: 2, timeframe: 'TOTAL' }, // This will fail
            { type: 'TOTAL_STUDY_TIME', target: 60, timeframe: 'DAY' },
          ],
        };
        const tasks = [createTask('completed', 0)];
        const logs = [createLog('TIMER_SESSION_COMPLETE', { duration: 3600, points: 10 }, 0)];
        const result = checkBadge(badge, { tasks, logs });
        expect(result).toBe(false);
      });
  });
});