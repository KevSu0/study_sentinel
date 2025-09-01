import { StudyTask, UserProfile, CompletedWork } from '../lib/types';

export interface Stats {
  today: DailyStat;
  yesterday: DailyStat;
  thisWeek: DailyStat;
  lastWeek: DailyStat;
  thisMonth: DailyStat;
  lastMonth: DailyStat;
  allTime: DailyStat;
  dailyStats: { date: string; duration: number; tasksCompleted: number; focusScore: number }[];
  completedWork: CompletedWork[];
}

export interface DailyStat {
  duration: number;
  tasksCompleted: number;
  focusScore: number;
  efficiency: number;
  sessions: number;
  averageSession: number;
}

export const MOCK_USER_PROFILE: UserProfile = {
  name: 'Test User',
  email: 'test@example.com',
  dailyStudyGoal: 2,
};

export const MOCK_STUDY_TASK: StudyTask = {
  id: 'task-1',
  shortId: 't1',
  title: 'Test Task',
  time: '10:00',
  date: '2024-01-01',
  duration: 60,
  points: 10,
  status: 'in_progress',
  priority: 'medium',
  timerType: 'countdown',
};

export const MOCK_COMPLETED_WORK: CompletedWork[] = [
  {
    date: '2024-01-01',
    duration: 1500,
    type: 'task',
    title: 'Test Task',
    points: 10,
    priority: 'medium',
    timestamp: new Date('2024-01-01T10:25:00.000Z').toISOString(),
  },
];

export const MOCK_STATS_DATA: Stats = {
  today: {
    duration: 3600,
    tasksCompleted: 2,
    focusScore: 85,
    efficiency: 90,
    sessions: 4,
    averageSession: 900,
  },
  yesterday: {
    duration: 3200,
    tasksCompleted: 1,
    focusScore: 80,
    efficiency: 88,
    sessions: 3,
    averageSession: 1067,
  },
  thisWeek: {
    duration: 18000,
    tasksCompleted: 10,
    focusScore: 88,
    efficiency: 92,
    sessions: 20,
    averageSession: 900,
  },
  lastWeek: {
    duration: 17000,
    tasksCompleted: 9,
    focusScore: 86,
    efficiency: 91,
    sessions: 18,
    averageSession: 944,
  },
  thisMonth: {
    duration: 72000,
    tasksCompleted: 40,
    focusScore: 89,
    efficiency: 93,
    sessions: 80,
    averageSession: 900,
  },
  lastMonth: {
    duration: 70000,
    tasksCompleted: 38,
    focusScore: 87,
    efficiency: 92,
    sessions: 75,
    averageSession: 933,
  },
  allTime: {
    duration: 864000,
    tasksCompleted: 480,
    focusScore: 90,
    efficiency: 94,
    sessions: 960,
    averageSession: 900,
  },
  dailyStats: [
    { date: '2024-01-01', duration: 3600, tasksCompleted: 2, focusScore: 85 },
    { date: '2023-12-31', duration: 3200, tasksCompleted: 1, focusScore: 80 },
  ],
  completedWork: MOCK_COMPLETED_WORK,
};

// Trivial test to satisfy Jest when scanning __tests__ helpers.
test('mock-data module loads', () => {
  expect(MOCK_USER_PROFILE.name).toBe('Test User');
});
