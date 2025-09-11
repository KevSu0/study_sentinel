import React from 'react';
import {render, screen, fireEvent, renderHook, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '@/app/page';
import {useGlobalState} from '@/hooks/use-global-state';
import {useDashboardLayout} from '@/hooks/use-dashboard-layout';
import {DndContext} from '@dnd-kit/core';

// Mock hooks
jest.mock('@/hooks/use-global-state');
jest.mock('@/hooks/use-dashboard-layout');

// Mock dynamic components
jest.mock('@/components/dashboard/add-item-dialog', () => ({
  AddItemDialog: () => <div data-testid="add-item-dialog" />,
}));
jest.mock('@/components/dashboard/customize-dialog', () => ({
  CustomizeDialog: ({isOpen}: {isOpen: boolean}) =>
    isOpen ? <div data-testid="customize-dialog" /> : null,
}));

// Mock widget components
jest.mock(
  '@/components/dashboard/widgets/daily-briefing-widget',
  () => ({
    DailyBriefingWidget: () => <div data-testid="daily-briefing-widget" />,
  })
);
jest.mock(
  '@/components/dashboard/widgets/stats-overview-widget',
  () => ({
    StatsOverviewWidget: () => <div data-testid="stats-overview-widget" />,
  })
);
jest.mock(
  '@/components/dashboard/widgets/unlocked-badges-widget',
  () => ({
    UnlockedBadgesWidget: () => <div data-testid="unlocked-badges-widget" />,
  })
);
jest.mock(
  '@/components/dashboard/widgets/completed-today-widget',
  () => ({
    CompletedTodayWidget: () => <div data-testid="completed-today-widget" />,
  })
);
jest.mock(
  '@/components/dashboard/widgets/todays-routines-widget',
  () => ({
    TodaysRoutinesWidget: () => <div data-testid="todays-routines-widget" />,
  })
);
jest.mock('@/components/dashboard/widgets/todays-plan-widget', () => ({
  TodaysPlanWidget: () => <div data-testid="todays-plan-widget" />,
}));
jest.mock(
  '@/components/dashboard/widgets/achievement-countdown-widget',
  () => ({
    AchievementCountdownWidget: () => (
      <div data-testid="achievement-countdown-widget" />
    ),
  })
);

describe('DashboardPage', () => {
  const mockUseGlobalState = useGlobalState as jest.Mock;
  const mockUseDashboardLayout = useDashboardLayout as jest.Mock;

  const mockLayout = [
    {id: 'daily_briefing', isVisible: true},
    {id: 'stats_overview', isVisible: true},
    {id: 'todays_plan', isVisible: true},
  ];

  beforeEach(() => {
    mockUseGlobalState.mockReturnValue({
      state: {
        isLoaded: true,
        tasks: [{id: 't1', title: 'Test Task', completed: false}],
        routines: [],
        todaysActivity: [],
        previousDayLogs: [],
        profile: {name: 'Test User'},
        todaysBadges: [],
      },
    });
    mockUseDashboardLayout.mockReturnValue({
      layout: mockLayout,
      setLayout: jest.fn(),
      isLoaded: true,
    });
  });

  it('renders loading skeletons when data is not loaded', () => {
    mockUseGlobalState.mockReturnValue({
      state: {
        isLoaded: false,
        tasks: [],
        routines: [],
        todaysActivity: [],
      },
    });
    mockUseDashboardLayout.mockReturnValue({isLoaded: false, layout: []});
    render(<DashboardPage />);
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
  });

  it('renders the empty state when there is no content', () => {
    mockUseGlobalState.mockReturnValue({
      state: {
        isLoaded: true,
        tasks: [],
        routines: [],
        todaysActivity: [],
      },
    });
    render(<DashboardPage />);
    expect(screen.getByText('A Fresh Start!')).toBeInTheDocument();
    expect(
      screen.getByText(
        "No tasks or routines scheduled for today. Let's plan your day!"
      )
    ).toBeInTheDocument();
  });

  it('renders the main dashboard with widgets when content exists', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    // Wait for dynamic components to load
    expect(await screen.findByTestId('daily-briefing-widget')).toBeInTheDocument();
    expect(
      await screen.findByTestId('stats-overview-widget')
    ).toBeInTheDocument();
    expect(await screen.findByTestId('todays-plan-widget')).toBeInTheDocument();
  });

  it('opens the customize dialog when the customize button is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);
    const customizeButton = screen.getByRole('button', {name: /customize/i});
    await user.click(customizeButton);
    expect(await screen.findByTestId('customize-dialog')).toBeInTheDocument();
  });

});