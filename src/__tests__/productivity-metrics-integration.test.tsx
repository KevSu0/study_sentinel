import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/page';
import StatsPage from '@/app/stats/page';
import PlansPage from '@/app/plans/page';
import { AllProviders as TestWrapper } from './test-wrapper';

// ----- MOCK CORE DEPENDENCIES -----
jest.useRealTimers();
jest.setTimeout(15000);

// ----- MOCK EXTERNAL HOOKS -----
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: (fn: () => any) => fn(),
}));
jest.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => false,
}));
jest.mock('@/hooks/use-dashboard-layout', () => ({
  useDashboardLayout: () => ({
    layout: [],
    setLayout: jest.fn(),
    isLoaded: true,
  }),
}));

// ----- MOCK DATA REPOSITORIES -----
jest.mock('@/lib/repositories/task.repository', () => {
  const todayISO = new Date().toISOString().slice(0, 10);
  const msDay = 24 * 60 * 60 * 1000;
  const overdueTask = {
    id: 't-overdue',
    title: 'Old Task',
    date: new Date(Date.now() - msDay).toISOString().slice(0, 10),
    scheduledAt: new Date(Date.now() - msDay + 10 * 60 * 60 * 1000).toISOString(),
    durationMin: 30,
    points: 5,
    priority: 'low',
    done: false,
  };
  const upcomingTask = {
    id: 't1',
    title: 'Test Task',
    date: todayISO,
    scheduledAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    durationMin: 60,
    points: 10,
    priority: 'medium',
    done: false,
  };
  const allTasks = [overdueTask, upcomingTask];

  return {
    taskRepository: {
      getAll: jest.fn().mockResolvedValue(allTasks),
      getTasksForDay: jest.fn().mockImplementation(async (date: Date) => {
        const dateStr = date.toISOString().slice(0, 10);
        return allTasks.filter(t => t.date === dateStr);
      }),
      getOverdueTasks: jest.fn().mockResolvedValue([overdueTask]),
    },
  };
});

jest.mock('@/lib/repositories/session.repository', () => ({
  sessionRepository: {
    getAll: jest.fn().mockResolvedValue([{
      id: 's1',
      taskId: 't1',
      pointsEarned: 100,
    }]),
    getCompletedWorkForDay: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/lib/repositories/profile.repository', () => ({
  profileRepository: {
    getProfile: jest.fn().mockResolvedValue({
      id: 'user-profile',
      name: 'Test User',
      totalPoints: 100,
    }),
  },
}));

// ----- SILENCE CONSOLE LOGS -----
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  (console.log as jest.Mock).mockRestore();
  (console.error as jest.Mock).mockRestore();
});

describe('Productivity Metrics Integration Tests', () => {
  describe('Dashboard Integration Tests', () => {
    it('should render dashboard with all productivity widgets and display correct metrics', async () => {
      render(<TestWrapper><DashboardPage /></TestWrapper>);
      expect(await screen.findByText('Welcome back, Test User!')).toBeInTheDocument();
      expect(await screen.findByText("Today's Tasks")).toBeInTheDocument();
      expect(await screen.findByText('Test Task')).toBeInTheDocument();
    });
  });

  describe('Stats Page Integration Tests', () => {
    it('should render stats page with all analytics components and data', async () => {
      render(<TestWrapper><StatsPage /></TestWrapper>);
      expect(await screen.findByText('Your Progress & Stats')).toBeInTheDocument();
      expect(await screen.findByText('Total Points')).toBeInTheDocument();
      expect(await screen.findByText('100')).toBeInTheDocument();
    });
  });

  describe('Plans Page Integration Tests', () => {
    it('should render plans page with task/routine management', async () => {
      render(<TestWrapper><PlansPage /></TestWrapper>);
      expect(await screen.findByText('Upcoming')).toBeInTheDocument();
      expect(await screen.findByText('Test Task')).toBeInTheDocument();
      expect(await screen.findByText('Overdue')).toBeInTheDocument();
    });
  });
});