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

import React from 'react';
import { render, screen } from '../../__tests__/render';
import DashboardPage from '../page';

jest.mock('@/hooks/use-global-state', () => ({
  useGlobalState: () => ({
    state: {
      routines: [],
      tasks: [],
      logs: [],
      badges: [],
      todaysActivity: [],
      todaysBadges: [],
      previousDayLogs: [],
      user: {
        name: 'Test User',
        avatar: '',
        onboardingCompleted: true,
      },
      isLoaded: true,
    },
    dispatch: jest.fn(),
  }),
}));

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

jest.mock('@/hooks/use-stats', () => ({
  useStats: () => ({
    realProductivityData: [],
    activeProductivityData: [],
  }),
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({
    setTheme: jest.fn(),
    themes: ['light', 'dark'],
    theme: 'light',
  }),
}));

describe('DashboardPage', () => {
  it('renders the dashboard with the correct heading', async () => {
    render(<DashboardPage />);
    const h = await screen.findByRole('heading', { name: /dashboard/i });
    expect(h).toBeInTheDocument();
  });
});