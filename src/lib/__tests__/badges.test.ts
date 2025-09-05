import { checkBadge } from '../badges';
import { ActivityAttempt, ActivityAttemptStatus, Badge, StudyTask } from '@/lib/types';
import { format, subDays } from 'date-fns';

// --- Mock Data & Helpers ---
const MOCK_DATE = '2024-07-27T10:00:00.000Z';
const today = new Date(MOCK_DATE);
const todayStr = format(today, 'yyyy-MM-dd');
const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

const createAttempt = (
  status: ActivityAttemptStatus,
  daysAgo = 0,
  durationMinutes = 10,
  options: { itemId?: string; points?: number } = {}
): ActivityAttempt => {
  const startTime = subDays(today, daysAgo).getTime();
  const endTime = startTime + durationMinutes * 60 * 1000;
  return {
    id: `attempt-${Math.random()}`,
    templateId: options.itemId ?? `task-${Math.random()}`,
    ordinal: 1,
    status,
    isActive: false,
    activeKey: null,
    createdAt: startTime,
    updatedAt: endTime,
    // Note: For badge checking, we don't need full event sourcing,
    // just the final state and duration. We can mock the payload
    // of a 'COMPLETE' event to simulate this.
    // A real HydratedActivityAttempt would have a full event array.
    events: [
      { type: 'START', occurredAt: startTime },
      {
        type: 'COMPLETE',
        occurredAt: endTime,
        payload: {
          duration: durationMinutes * 60,
          points: options.points ?? durationMinutes, // Simple point system for testing
        },
      },
    ],
  } as any; // Using 'as any' because we are mocking a HydratedAttempt
};

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
    const result = checkBadge(badge, { tasks: [createTask('completed')], attempts: [], allCompletedWork: [] });
    expect(result).toBe(false);
  });

  it('should return true for a badge with no conditions', () => {
    const badge: Badge = { ...baseBadge, conditions: [] };
    const result = checkBadge(badge, { tasks: [], attempts: [], allCompletedWork: [] });
    expect(result).toBe(true);
  });

  it('should correctly calculate work from attempts', () => {
    // This test implicitly checks the getAllCompletedWork helper function
    const badge: Badge = { ...baseBadge, conditions: [{ type: 'TOTAL_STUDY_TIME', target: 90, timeframe: 'TOTAL' }] };
    const attempts = [
      createAttempt('COMPLETED', 0, 60), // 60 mins
      createAttempt('COMPLETED', 1, 30), // 30 mins
    ];
    // Total time = 60 + 30 = 90
    const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
    expect(result).toBe(true);
  });

  describe('Condition: TASKS_COMPLETED', () => {
    it('[TOTAL] should be true if total completed tasks meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TASKS_COMPLETED', target: 2, timeframe: 'TOTAL' }] };
      const tasks = [createTask('completed', 1), createTask('completed', 5)];
      const result = checkBadge(badge, { tasks, attempts: [], allCompletedWork: [] });
      expect(result).toBe(true);
    });

    it('[DAY] should be true if daily completed tasks meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TASKS_COMPLETED', target: 2, timeframe: 'DAY' }] };
      const tasks = [createTask('completed', 0), createTask('completed', 0), createTask('completed', 1)];
      const result = checkBadge(badge, { tasks, attempts: [], allCompletedWork: [] });
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
        const result = checkBadge(badge, { tasks, attempts: [], allCompletedWork: [] });
        expect(result).toBe(true);
    });

    it('[MONTH] should be true if monthly completed tasks meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TASKS_COMPLETED', target: 2, timeframe: 'MONTH' }] };
      const tasks = [
          createTask('completed', 5),   // This month
          createTask('completed', 15),  // This month
          createTask('completed', 40),  // Last month
      ];
      const result = checkBadge(badge, { tasks, attempts: [], allCompletedWork: [] });
      expect(result).toBe(true);
    });

    it('[DAY] should be false if no work was done in the period', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TASKS_COMPLETED', target: 1, timeframe: 'DAY' }] };
        const tasks: StudyTask[] = []; // No tasks, so no work done
        const result = checkBadge(badge, { tasks, attempts: [], allCompletedWork: [] });
        expect(result).toBe(false);
    });
  });


  describe('Condition: TOTAL_STUDY_TIME', () => {
    it('[DAY] should be true if total study time in a day meets target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TOTAL_STUDY_TIME', target: 60, timeframe: 'DAY' }] }; // 60 minutes
      const attempts = [
        createAttempt('COMPLETED', 0, 30), // 30 mins
        createAttempt('COMPLETED', 0, 40), // 40 mins
      ];
      const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
      expect(result).toBe(true);
    });

    it('[WEEK] should be true if total study time in a week meets target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TOTAL_STUDY_TIME', target: 120, timeframe: 'WEEK' }] }; // 120 minutes
        const attempts = [
          createAttempt('COMPLETED', 1, 60), // 60 mins
          createAttempt('COMPLETED', 3, 80), // 80 mins
        ];
        const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
        expect(result).toBe(true);
      });

      it('[MONTH] should be true if total study time in a month meets target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TOTAL_STUDY_TIME', target: 100, timeframe: 'MONTH' }] }; // 100 minutes
        const attempts = [
          createAttempt('COMPLETED', 5, 60), // 60 mins this month
          createAttempt('COMPLETED', 15, 60), // 60 mins this month
          createAttempt('COMPLETED', 40, 60), // 60 mins last month
        ];
        const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
        expect(result).toBe(true);
      });
  });

  describe('Condition: POINTS_EARNED', () => {
    it('[TOTAL] should be true if total points earned meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'POINTS_EARNED', target: 100, timeframe: 'TOTAL' }] };
      const attempts = [
        createAttempt('COMPLETED', 10, 60, { points: 50 }),
        createAttempt('COMPLETED', 20, 60, { points: 50 }),
      ];
      const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
      expect(result).toBe(true);
    });

    it('[DAY] should be true if daily points earned meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'POINTS_EARNED', target: 75, timeframe: 'DAY' }] };
      const attempts = [
        createAttempt('COMPLETED', 0, 60, { points: 50 }), // Today
        createAttempt('COMPLETED', 0, 60, { points: 25 }), // Today
        createAttempt('COMPLETED', 1, 60, { points: 100 }), // Yesterday
      ];
      const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
      expect(result).toBe(true);
    });

    it('[WEEK] should be true if weekly points earned meet target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'POINTS_EARNED', target: 75, timeframe: 'WEEK' }] };
        const attempts = [
          createAttempt('COMPLETED', 2, 60, { points: 50 }), // This week
          createAttempt('COMPLETED', 4, 60, { points: 25 }), // This week
          createAttempt('COMPLETED', 8, 60, { points: 100 }), // Last week
        ];
        const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
        expect(result).toBe(true);
      });

    it('[MONTH] should be true if monthly points earned meet target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'POINTS_EARNED', target: 150, timeframe: 'MONTH' }] };
      const attempts = [
        createAttempt('COMPLETED', 5, 60, { points: 100 }),  // This month
        createAttempt('COMPLETED', 15, 60, { points: 50 }), // This month
        createAttempt('COMPLETED', 40, 60, { points: 100 }),// Last month
      ];
      const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
      expect(result).toBe(true);
    });
  });

  describe('Condition: DAY_STREAK', () => {
    it('should be true if day streak meets target ending today', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 3, timeframe: 'TOTAL' }] };
      const attempts = [
        createAttempt('COMPLETED', 0, 10),
        createAttempt('COMPLETED', 1, 10),
        createAttempt('COMPLETED', 2, 10),
      ];
      const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
      expect(result).toBe(true);
    });

    it('should be true if day streak meets target ending yesterday', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 3, timeframe: 'TOTAL' }] };
        const attempts = [
          createAttempt('COMPLETED', 1, 10),
          createAttempt('COMPLETED', 2, 10),
          createAttempt('COMPLETED', 3, 10),
        ];
        const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
        expect(result).toBe(true);
      });

    it('should be false if streak is broken', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 3, timeframe: 'TOTAL' }] };
      const attempts = [
        createAttempt('COMPLETED', 0, 10),
        createAttempt('COMPLETED', 2, 10), // Gap day
      ];
      const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
      expect(result).toBe(false);
    });

    it('should correctly calculate a streak that was broken and restarted', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 2, timeframe: 'TOTAL' }] };
        const attempts = [
          // Old, broken streak
          createAttempt('COMPLETED', 5, 10),
          createAttempt('COMPLETED', 6, 10),
          // New, current streak
          createAttempt('COMPLETED', 0, 10),
          createAttempt('COMPLETED', 1, 10),
        ];
        const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
        expect(result).toBe(true);
      });

    it('should be false if there are no attempts', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 1, timeframe: 'TOTAL' }] };
        const result = checkBadge(badge, { tasks: [], attempts: [], allCompletedWork: [] });
        expect(result).toBe(false);
    });

    it('should be false if study days are fewer than target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'DAY_STREAK', target: 3, timeframe: 'TOTAL' }] };
      const attempts = [ createAttempt('COMPLETED', 0, 10) ];
      const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
      expect(result).toBe(false);
    });
  });

  describe('Condition: SINGLE_SESSION_TIME', () => {
    it('should be true if any single session meets target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'SINGLE_SESSION_TIME', target: 90, timeframe: 'TOTAL' }] };
      const attempts = [
        createAttempt('COMPLETED', 5, 60), // 60 mins
        createAttempt('COMPLETED', 2, 90), // 90 mins
      ];
      const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
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
      const result = checkBadge(badge, { tasks, attempts: [], allCompletedWork: [] });
      expect(result).toBe(true);
    });

    it('should be false if any task on a day is not completed', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'ALL_TASKS_COMPLETED_ON_DAY', target: 1, timeframe: 'DAY' }] };
        const tasks = [
          { ...createTask('completed', 1), date: yesterdayStr },
          { ...createTask('todo', 1), date: yesterdayStr },
        ];
        const result = checkBadge(badge, { tasks, attempts: [], allCompletedWork: [] });
        expect(result).toBe(false);
      });

    it('should ignore archived tasks', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'ALL_TASKS_COMPLETED_ON_DAY', target: 1, timeframe: 'DAY' }] };
        const tasks = [
          { ...createTask('completed', 1), date: yesterdayStr },
          { ...createTask('archived', 1), date: yesterdayStr },
        ];
        const result = checkBadge(badge, { tasks, attempts: [], allCompletedWork: [] });
        expect(result).toBe(true);
    });

    it('should be false if a day contains only archived tasks', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'ALL_TASKS_COMPLETED_ON_DAY', target: 1, timeframe: 'DAY' }] };
        const tasks = [
          { ...createTask('archived', 1), date: yesterdayStr },
          { ...createTask('archived', 1), date: yesterdayStr },
        ];
        const result = checkBadge(badge, { tasks, attempts: [], allCompletedWork: [] });
        expect(result).toBe(false);
    });

    it('should be false if there are no tasks at all', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'ALL_TASKS_COMPLETED_ON_DAY', target: 1, timeframe: 'DAY' }] };
      const result = checkBadge(badge, { tasks: [], attempts: [], allCompletedWork: [] });
      expect(result).toBe(false);
    });
  });

  describe('Condition: TIME_ON_SUBJECT', () => {
    it('[TOTAL] should be true if total time on a subject meets target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TIME_ON_SUBJECT', target: 90, timeframe: 'TOTAL', subjectId: 'subj-1' }] };
        const attempts = [
            createAttempt('COMPLETED', 1, 60, { itemId: 'subj-1' }), // 60 min
            createAttempt('COMPLETED', 5, 30, { itemId: 'subj-1' }), // 30 min
            createAttempt('COMPLETED', 2, 60, { itemId: 'subj-2' }), // 60 min on other subject
        ];
        const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
        expect(result).toBe(true);
    });

    it('[DAY] should be true if daily time on a subject meets target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TIME_ON_SUBJECT', target: 90, timeframe: 'DAY', subjectId: 'subj-1' }] };
        const attempts = [
            createAttempt('COMPLETED', 0, 60, { itemId: 'subj-1' }), // 60 min today
            createAttempt('COMPLETED', 0, 30, { itemId: 'subj-1' }), // 30 min today
            createAttempt('COMPLETED', 1, 60, { itemId: 'subj-1' }), // 60 min yesterday
        ];
        const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
        expect(result).toBe(true);
    });

    it('[DAY] should be false if daily time on a subject does not meet target', () => {
        const badge: Badge = { ...baseBadge, conditions: [{ type: 'TIME_ON_SUBJECT', target: 90, timeframe: 'DAY', subjectId: 'subj-1' }] };
        const attempts = [
            createAttempt('COMPLETED', 0, 60, { itemId: 'subj-1' }), // 60 min today
            createAttempt('COMPLETED', 1, 60, { itemId: 'subj-1' }), // 60 min yesterday
        ];
        const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
        expect(result).toBe(false);
    });

    it('[WEEK] should be true if weekly time on a subject meets target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TIME_ON_SUBJECT', target: 90, timeframe: 'WEEK', subjectId: 'subj-1' }] };
      const attempts = [
          createAttempt('COMPLETED', 1, 60, { itemId: 'subj-1' }), // 60 min this week
          createAttempt('COMPLETED', 3, 30, { itemId: 'subj-1' }), // 30 min this week
          createAttempt('COMPLETED', 8, 60, { itemId: 'subj-1' }), // 60 min last week
      ];
      const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
      expect(result).toBe(true);
    });

    it('[MONTH] should be true if monthly time on a subject meets target', () => {
      const badge: Badge = { ...baseBadge, conditions: [{ type: 'TIME_ON_SUBJECT', target: 90, timeframe: 'MONTH', subjectId: 'subj-1' }] };
      const attempts = [
          createAttempt('COMPLETED', 5, 60, { itemId: 'subj-1' }),  // 60 min this month
          createAttempt('COMPLETED', 15, 30, { itemId: 'subj-1' }), // 30 min this month
          createAttempt('COMPLETED', 40, 60, { itemId: 'subj-1' }), // 60 min last month
      ];
      const result = checkBadge(badge, { tasks: [], attempts, allCompletedWork: [] });
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
      const attempts = [createAttempt('COMPLETED', 0, 60)]; // 60 mins
      const result = checkBadge(badge, { tasks, attempts, allCompletedWork: [] });
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
        const attempts = [createAttempt('COMPLETED', 0, 60)];
        const result = checkBadge(badge, { tasks, attempts, allCompletedWork: [] });
        expect(result).toBe(false);
      });
  });
});