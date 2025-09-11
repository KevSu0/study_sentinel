import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { DragEndEvent } from '@dnd-kit/core';

// --- Mocks ---
let capturedOnDragEnd: (event: DragEndEvent) => void = () => {};
jest.mock('@dnd-kit/core', () => ({
    ...jest.requireActual('@dnd-kit/core'),
    DndContext: (props: {children: React.ReactNode, onDragEnd: (event: DragEndEvent) => void}) => {
        capturedOnDragEnd = props.onDragEnd;
        return <div>{props.children}</div>
    }
}));
jest.mock('@/hooks/use-global-state');
jest.mock('@/hooks/use-dashboard-layout');
jest.mock('@/components/dashboard/widgets/todays-plan-widget', () => ({
  __esModule: true,
  TodaysPlanWidget: () => <div>Today's Plan</div>,
}));
jest.mock('@/components/dashboard/widgets/todays-routines-widget', () => ({
  __esModule: true,
  TodaysRoutinesWidget: () => <div>Today's Routines</div>,
}));
jest.mock('@/components/dashboard/widgets/daily-briefing-widget', () => ({
  __esModule: true,
  DailyBriefingWidget: jest.fn(() => <div data-testid="daily-briefing-widget">Daily Briefing</div>),
}));
jest.mock('@/components/dashboard/widgets/stats-overview-widget', () => ({
  __esModule: true,
  StatsOverviewWidget: jest.fn(() => <div>Stats Overview</div>),
}));
jest.mock('@/components/dashboard/widgets/unlocked-badges-widget', () => ({
  __esModule: true,
  UnlockedBadgesWidget: jest.fn(() => <div>Unlocked Badges</div>),
}));
jest.mock('@/components/dashboard/widgets/completed-today-widget', () => ({
  __esModule: true,
  CompletedTodayWidget: jest.fn(() => <div>Completed Today</div>),
}));
jest.mock('@/components/dashboard/widgets/achievement-countdown-widget', () => ({
  __esModule: true,
  AchievementCountdownWidget: jest.fn(() => <div>Achievement Countdown</div>),
}));
jest.mock('@/components/dashboard/customize-dialog', () => ({
  __esModule: true,
  CustomizeDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="customize-dialog">Customize Dialog</div> : null,
}));

const mockUseGlobalState = useGlobalState as jest.Mock;
const mockUseDashboardLayout = useDashboardLayout as jest.Mock;

const mockSetLayout = jest.fn();

const defaultGlobalState = {
  isLoaded: true,
  tasks: [{ id: 'task1', title: 'Test Task' }],
  routines: [{ id: 'routine1', title: 'Test Routine' }],
  todaysActivity: [],
  previousDayLogs: [],
  profile: {},
  todaysBadges: [],
};

const defaultLayoutState = {
  isLoaded: true,
  layout: [
    { id: 'todays_plan', isVisible: true },
    { id: 'todays_routines', isVisible: true },
    { id: 'stats_overview', isVisible: false },
  ],
  setLayout: mockSetLayout,
};

const renderComponent = (globalState = {}, layoutState = {}) => {
  const state = { ...defaultGlobalState, ...globalState };
  const layout = { ...defaultLayoutState, ...layoutState };

  mockUseGlobalState.mockReturnValue({ state });
  mockUseDashboardLayout.mockReturnValue(layout);

  return render(<DashboardPage />);
};

describe('DashboardPage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetLayout.mockClear();
  });

  it('renders skeletons when data is not loaded', async () => {
    await act(async () => {
      renderComponent(
        { isLoaded: false, tasks: [], routines: [], todaysActivity: [] },
        { isLoaded: false }
      );
    });
    const main = screen.getByRole('main');
    const skeletonContainer = main.children[0];
    expect(skeletonContainer).toHaveClass('space-y-4');
    // Check for the presence of at least one skeleton item
    expect(skeletonContainer.children[0]).toHaveClass('animate-pulse');
  });

  it('renders the empty state when there is no content', async () => {
    await act(async () => {
      renderComponent({ tasks: [], routines: [], todaysActivity: [] });
    });
    expect(screen.getByText('A Fresh Start!')).toBeInTheDocument();
    expect(screen.getByText("No tasks or routines scheduled for today. Let's plan your day!")).toBeInTheDocument();
  });

  it('renders the main widgets when content exists', async () => {
    await act(async () => {
      renderComponent();
    });
    expect(await screen.findByText("Today's Plan")).toBeInTheDocument();
    expect(await screen.findByText("Today's Routines")).toBeInTheDocument();
    expect(screen.queryByText('Stats Overview')).not.toBeInTheDocument();
  });

  it('passes correct props to DailyBriefingWidget', async () => {
    const mockProfile = { name: 'Test User' };
    const mockTasks = [{ id: 'task1', title: 'A Task' }];
    const mockRoutines = [{ id: 'routine1', title: 'A Routine' }];
    const mockLogs = [{ id: 'log1', text: 'A Log' }];
    
    const { DailyBriefingWidget } = await import('@/components/dashboard/widgets/daily-briefing-widget');

    await act(async () => {
      renderComponent(
        { profile: mockProfile, tasks: mockTasks, routines: mockRoutines, previousDayLogs: mockLogs },
        { layout: [{ id: 'daily_briefing', isVisible: true }] }
      );
    });

    expect(DailyBriefingWidget).toHaveBeenCalledWith(
      {
        profile: mockProfile,
        tasks: mockTasks,
        routines: mockRoutines,
        previousDayLogs: mockLogs,
      },
      {}
    );
  });

  it('opens the customize dialog on button click', async () => {
    await act(async () => {
        renderComponent();
    });
    const customizeButton = screen.getByRole('button', { name: /customize/i });
    await userEvent.click(customizeButton);
    expect(screen.getByTestId('customize-dialog')).toBeInTheDocument();
  });

  it('handles drag and drop to reorder widgets', async () => {
    await act(async () => {
      renderComponent();
    });
    
    const dragEvent: DragEndEvent = {
      active: { id: 'todays_plan', data: { current: {} }, rect: { current: { initial: null, translated: null } } },
      over: { id: 'todays_routines', data: { current: {} }, rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, disabled: false },
      collisions: [],
      delta: { x: 0, y: 0 },
      activatorEvent: new MouseEvent('dragend') as any,
    };

    await act(async () => {
      capturedOnDragEnd(dragEvent);
    });

    expect(mockSetLayout).toHaveBeenCalledTimes(1);
    const updaterFunction = mockSetLayout.mock.calls[0][0];
    const newLayout = updaterFunction(defaultLayoutState.layout);
    
    expect(newLayout[0].id).toBe('todays_routines');
    expect(newLayout[1].id).toBe('todays_plan');
  });

  it('does not reorder if dragged item is dropped in the same place', async () => {
    await act(async () => {
      renderComponent();
    });
    
    const dragEvent: DragEndEvent = {
      active: { id: 'todays_plan', data: { current: {} }, rect: { current: { initial: null, translated: null } } },
      over: { id: 'todays_plan', data: { current: {} }, rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, disabled: false },
      collisions: [],
      delta: { x: 0, y: 0 },
      activatorEvent: new MouseEvent('dragend') as any,
    };

    await act(async () => {
      capturedOnDragEnd(dragEvent);
    });
    expect(mockSetLayout).not.toHaveBeenCalled();
  });

  it('does not reorder if there is no drop target', async () => {
    await act(async () => {
      renderComponent();
    });
    
    const dragEvent: DragEndEvent = {
      active: { id: 'todays_plan', data: { current: {} }, rect: { current: { initial: null, translated: null } } },
      over: null,
      collisions: [],
      delta: { x: 0, y: 0 },
      activatorEvent: new MouseEvent('dragend') as any,
    };

    await act(async () => {
      capturedOnDragEnd(dragEvent);
    });
    expect(mockSetLayout).not.toHaveBeenCalled();
  });

  it('passes correct props to StatsOverviewWidget', async () => {
    const mockBadges = [{ id: 'badge1', name: 'Test Badge' }];
    const mockActivity = [{ id: 'act1', text: 'Test Activity' }];
    const { StatsOverviewWidget } = await import('@/components/dashboard/widgets/stats-overview-widget');

    await act(async () => {
      renderComponent(
        { todaysBadges: mockBadges, todaysActivity: mockActivity },
        { layout: [{ id: 'stats_overview', isVisible: true }] }
      );
    });

    expect(StatsOverviewWidget).toHaveBeenCalledWith(
      {
        todaysBadges: mockBadges,
        todaysActivity: mockActivity,
      },
      {}
    );
  });

  it('passes correct props to UnlockedBadgesWidget', async () => {
    const mockBadges = [{ id: 'badge1', name: 'Test Badge' }];
    const { UnlockedBadgesWidget } = await import('@/components/dashboard/widgets/unlocked-badges-widget');

    await act(async () => {
      renderComponent(
        { todaysBadges: mockBadges },
        { layout: [{ id: 'unlocked_badges', isVisible: true }] }
      );
    });

    expect(UnlockedBadgesWidget).toHaveBeenCalledWith(
      {
        todaysBadges: mockBadges,
      },
      {}
    );
  });

  it('passes correct props to CompletedTodayWidget', async () => {
    const mockActivity = [{ id: 'act1', text: 'Test Activity' }];
    const { CompletedTodayWidget } = await import('@/components/dashboard/widgets/completed-today-widget');

    await act(async () => {
      renderComponent(
        { todaysActivity: mockActivity },
        { layout: [{ id: 'completed_today', isVisible: true }] }
      );
    });

    expect(CompletedTodayWidget).toHaveBeenCalledWith(
      {
        todaysActivity: mockActivity,
      },
      {}
    );
  });

  it('does not render a widget if it is not in the widgetMap', async () => {
    await act(async () => {
      renderComponent(
        {},
        { layout: [{ id: 'non_existent_widget', isVisible: true }] }
      );
    });
    expect(screen.queryByText(/non_existent_widget/)).not.toBeInTheDocument();
  });

  it('passes correct props to AchievementCountdownWidget', async () => {
    const { AchievementCountdownWidget } = await import('@/components/dashboard/widgets/achievement-countdown-widget');

    await act(async () => {
      renderComponent(
        {},
        { layout: [{ id: 'achievement_countdown', isVisible: true }] }
      );
    });

    expect(AchievementCountdownWidget).toHaveBeenCalledWith(
      {},
      {}
    );
  });
});