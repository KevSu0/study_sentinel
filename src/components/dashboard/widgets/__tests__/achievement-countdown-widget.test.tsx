import React from 'react';
import {render, screen, act} from '@testing-library/react';
import {AchievementCountdownWidget} from '../achievement-countdown-widget';
import {useGlobalState} from '@/hooks/use-global-state';
import {getRandomMotivationalMessage} from '@/lib/motivation';

// Mock the hooks and modules
jest.mock('@/hooks/use-global-state');
jest.mock('@/lib/motivation');

const mockUseGlobalState = useGlobalState as jest.Mock;
const mockGetRandomMotivationalMessage = getRandomMotivationalMessage as jest.Mock;

describe('AchievementCountdownWidget', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetRandomMotivationalMessage.mockReturnValue('You can do it!');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should render null if showCountdown is false', () => {
    mockUseGlobalState.mockReturnValue({
      state: {
        profile: {
          showCountdown: false,
          achievementDate: new Date().toISOString(),
        },
      },
    });
    const {container} = render(<AchievementCountdownWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('should render null if achievementDate is not set', () => {
    mockUseGlobalState.mockReturnValue({
      state: {
        profile: {
          showCountdown: true,
          achievementDate: null,
        },
      },
    });
    const {container} = render(<AchievementCountdownWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('should render null if achievementDate is in the past', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    mockUseGlobalState.mockReturnValue({
      state: {
        profile: {
          showCountdown: true,
          achievementDate: pastDate.toISOString(),
        },
      },
    });

    const {container} = render(<AchievementCountdownWidget />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(container.firstChild).toBeNull();
  });

  it('should render the countdown widget with correct initial time', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    futureDate.setHours(futureDate.getHours() + 1); // 1 day and 1 hour from now
    mockUseGlobalState.mockReturnValue({
      state: {
        profile: {
          showCountdown: true,
          achievementDate: futureDate.toISOString(),
        },
      },
    });

    render(<AchievementCountdownWidget />);

    // Initial render will be 0s, then effect runs, so we advance timers first
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Now check for the content after the state update
    expect(screen.getByText('Your Goal is in Sight!')).toBeInTheDocument();
    expect(screen.getByText(/Keep up the momentum/)).toBeInTheDocument();
    expect(screen.getByText('"You can do it!"')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('Days')).toBeInTheDocument();
  });

  it('should update the countdown timer every second', () => {
    const futureDate = new Date();
    futureDate.setSeconds(futureDate.getSeconds() + 5); // 5 seconds from now
    mockUseGlobalState.mockReturnValue({
      state: {
        profile: {
          showCountdown: true,
          achievementDate: futureDate.toISOString(),
        },
      },
    });

    render(<AchievementCountdownWidget />);

    // Initial render
    act(() => {
      jest.advanceTimersByTime(1000); // Move forward 1s
    });
    expect(screen.getByText('04')).toBeInTheDocument(); // 4 seconds left

    // Move forward 2 more seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText('02')).toBeInTheDocument(); // 2 seconds left
  });

  it('should clear the interval on unmount', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    mockUseGlobalState.mockReturnValue({
      state: {
        profile: {
          showCountdown: true,
          achievementDate: futureDate.toISOString(),
        },
      },
    });

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const {unmount} = render(<AchievementCountdownWidget />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });
});