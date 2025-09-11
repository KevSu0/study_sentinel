import React from 'react';
import {render, screen, act} from '@testing-library/react';
import {AchievementCountdownWidget} from '@/components/dashboard/widgets/achievement-countdown-widget';
import {useGlobalState} from '@/hooks/use-global-state';

// Mock hooks and dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  },
}));
jest.mock('@/lib/motivation', () => ({
  motivationalQuotes: [{text: 'mock quote', author: 'mock author'}],
  getRandomMotivationalMessage: () => 'Test motivational message',
}));

const mockInitialState = {
  profile: {
    showCountdown: true,
    achievementDate: new Date().toISOString(),
  },
  motivationalQuotes: [{text: 'mock quote', author: 'mock author'}],
  isOffline: false,
  isLoaded: true,
  tasks: [],
  logs: [],
  routines: [],
  allBadges: [],
  earnedBadges: new Map(),
  soundSettings: { alarm: 'none', tick: 'none', notificationInterval: 15 },
  activeItem: null,
  timeDisplay: '00:00',
  isPaused: true,
  isOvertime: false,
  isMuted: false,
  timerProgress: null,
  currentQuote: 'mock quote',
  routineLogDialog: {isOpen: false, action: null},
  todaysLogs: [],
  previousDayLogs: [],
  allCompletedWork: [],
  todaysCompletedWork: [],
  todaysPoints: 0,
  todaysBadges: [],
  starCount: 0,
  showStarAnimation: false,
};

describe('AchievementCountdownWidget', () => {
  const mockUseGlobalState = useGlobalState as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockUseGlobalState.mockReturnValue({
      state: mockInitialState,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Online User Flows', () => {
    it('renders null if showCountdown is false', () => {
      mockUseGlobalState.mockReturnValue({
        state: {
          ...mockInitialState,
          profile: {showCountdown: false, achievementDate: new Date().toISOString()},
        },
      });
      const {container} = render(<AchievementCountdownWidget />);
      expect(container.firstChild).toBeNull();
    });

    it('renders null if achievementDate is not set', () => {
      mockUseGlobalState.mockReturnValue({
        state: {
          ...mockInitialState,
          profile: {showCountdown: true, achievementDate: null},
        },
      });
      const {container} = render(<AchievementCountdownWidget />);
      expect(container.firstChild).toBeNull();
    });

    it('renders the countdown when active', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      mockUseGlobalState.mockReturnValue({
        state: {
          ...mockInitialState,
          profile: {
            showCountdown: true,
            achievementDate: futureDate.toISOString(),
          },
        },
      });
      render(<AchievementCountdownWidget />);
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText('Your Goal is in Sight!')).toBeInTheDocument();
      const dayElement = screen.getByTestId('countdown-value-Days');
      expect(dayElement).toBeInTheDocument();
      expect(dayElement.textContent).toMatch(/01|02/);
      expect(await screen.findByText(/Test motivational message/)).toBeInTheDocument();
    });
  });

  describe('Offline User Flows', () => {
    beforeEach(() => {
      mockUseGlobalState.mockReturnValue({
        state: {...mockInitialState, isOffline: true},
      });
    });

    it('renders null if showCountdown is false when offline', () => {
      mockUseGlobalState.mockReturnValue({
        state: {
          ...mockInitialState,
          isOffline: true,
          profile: {showCountdown: false, achievementDate: new Date().toISOString()},
        },
      });
      const {container} = render(<AchievementCountdownWidget />);
      expect(container.firstChild).toBeNull();
    });

    it('renders the countdown when active and offline', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      mockUseGlobalState.mockReturnValue({
        state: {
          ...mockInitialState,
          isOffline: true,
          profile: {
            showCountdown: true,
            achievementDate: futureDate.toISOString(),
          },
        },
      });
      render(<AchievementCountdownWidget />);
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText('Your Goal is in Sight!')).toBeInTheDocument();
      expect(await screen.findByText(/Test motivational message/)).toBeInTheDocument();
    });

    it('updates the countdown over time when offline', async () => {
      const futureDate = new Date();
      futureDate.setSeconds(futureDate.getSeconds() + 3);
      mockUseGlobalState.mockReturnValue({
        state: {
          ...mockInitialState,
          isOffline: true,
          profile: {
            ...mockInitialState.profile,
            showCountdown: true,
            achievementDate: futureDate.toISOString(),
          },
        },
      });
      render(<AchievementCountdownWidget />);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000);
      });
      expect(screen.getByTestId('countdown-value-Secs')).toHaveTextContent('02');
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000);
      });
      expect(screen.getByTestId('countdown-value-Secs')).toHaveTextContent('01');
    });
  });
});