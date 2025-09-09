Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Robust IntersectionObserver mock for Next use-intersection in jsdom
class MockIntersectionObserver {
 observe = jest.fn();
 unobserve = jest.fn();
 disconnect = jest.fn();
 takeRecords = jest.fn().mockReturnValue([]);
}
Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: MockIntersectionObserver as any });

import React from 'react';
import { render, screen } from '../../__tests__/render';
import DashboardPage from '../page';

jest.mock('@/hooks/use-global-state', () => {
  const React = require('react');
  return {
    // Provide a no-op provider so tests using AllProviders can render
    GlobalStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    // Provide a mocked hook with stable state/actions
    useGlobalState: () => ({
      state: {
        routines: [],
        tasks: [],
        logs: [],
        profile: { name: 'Test User', dailyStudyGoal: 8 },
        allBadges: [],
        earnedBadges: new Map(),
        todaysActivity: [],
        todaysBadges: [],
        previousDayLogs: [],
        allCompletedWork: [],
        todaysCompletedWork: [],
        todaysPoints: 0,
        starCount: 0,
        showStarAnimation: false,
        soundSettings: { alarm: 'alarm_clock', tick: 'none', notificationInterval: 15 },
        activeItem: null,
        timeDisplay: '00:00',
        isPaused: true,
        isOvertime: false,
        isMuted: false,
        timerProgress: null,
        currentQuote: '',
        routineLogDialog: { isOpen: false, action: null },
        todaysLogs: [],
        user: { name: 'Test User', avatar: '', onboardingCompleted: true },
        isLoaded: true,
        quickStartOpen: false,
      },
      updateTask: jest.fn(),
      retryItem: jest.fn(),
      addTask: jest.fn(),
      archiveTask: jest.fn(),
      unarchiveTask: jest.fn(),
      pushTaskToNextDay: jest.fn(),
      startTimer: jest.fn(),
      togglePause: jest.fn(),
      completeTimer: jest.fn(),
      stopTimer: jest.fn(),
      manuallyCompleteItem: jest.fn(),
      addRoutine: jest.fn(),
      updateRoutine: jest.fn(),
      deleteRoutine: jest.fn(),
      addBadge: jest.fn(),
      updateBadge: jest.fn(),
      deleteBadge: jest.fn(),
      updateProfile: jest.fn(),
      setSoundSettings: jest.fn(),
      toggleMute: jest.fn(),
      openQuickStart: jest.fn(),
      closeQuickStart: jest.fn(),
      openRoutineLogDialog: jest.fn(),
      closeRoutineLogDialog: jest.fn(),
    }),
  };
});

jest.mock('@/hooks/use-dashboard-layout', () => ({
  useDashboardLayout: () => ({
    layout: [
      { id: 'daily_briefing', isVisible: true },
      { id: 'stats_overview', isVisible: true },
      { id: 'unlocked_badges', isVisible: true },
      { id: 'completed_today', isVisible: true },
      { id: 'todays_routines', isVisible: true },
      { id: 'todays_plan', isVisible: true },
      { id: 'achievement_countdown', isVisible: true },
    ],
    setLayout: jest.fn(),
    isLoaded: true,
  }),
}));

jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }) => <div>{children}</div>,
  useTheme: () => ({
    setTheme: jest.fn(),
    themes: ['light', 'dark'],
    theme: 'light',
  }),
}));

// Mock Radix Slot used by Button(asChild) to avoid undefined element type
jest.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children }) => <>{children}</>,
}));

jest.mock('@/hooks/use-stats', () => ({
  useStats: () => ({
    stats: {
      totalPoints: 150,
      totalSessions: 20,
      totalTimeSpent: 72000,
      averageSessionDuration: 3600,
      longestStreak: 10,
      currentStreak: 5,
      dailyAverages: {
        sessions: 2,
        points: 15,
        time: 7200,
      },
      performance: {
        last7Days: [
          { date: '2024-07-15', points: 20, time: 9000 },
          { date: '2024-07-16', points: 25, time: 10800 },
          { date: '2024-07-17', points: 15, time: 7200 },
          { date: '2024-07-18', points: 30, time: 12600 },
          { date: '2024-07-19', points: 10, time: 5400 },
          { date: '2024-07-20', points: 35, time: 14400 },
          { date: '2024-07-21', points: 15, time: 7200 },
        ],
      },
      badges: {
        earned: 5,
        unearned: 15,
        mostRecent: {
          id: 'streak-5',
          name: '5-Day Streak',
          description: 'Maintain a 5-day study streak.',
          icon: '🔥',
          achievedAt: '2024-07-21T10:00:00.000Z',
        },
      },
    },
    isLoaded: true,
    error: null,
  }),
}));


describe('DashboardPage', () => {
  it('renders the dashboard with the correct heading', async () => {
    render(<DashboardPage />);
    const h = await screen.findByRole('heading', { name: /dashboard/i });
    expect(h).toBeInTheDocument();
  });
});