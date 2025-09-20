import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import {DailyBriefingWidget} from '@/components/dashboard/widgets/daily-briefing-widget';
import {getDailySummary} from '@/lib/actions';
import {format} from 'date-fns';
import {useGlobalState} from '@/hooks/use-global-state';

// Mock server action and hooks
jest.mock('@/lib/actions', () => ({
  getDailySummary: jest.fn(),
}));
jest.mock('@/hooks/use-global-state');

// Mock child component used by MotivationalQuote
jest.mock('@/lib/motivation', () => ({
  getRandomMotivationalMessage: () => 'Mocked motivational message',
  motivationalQuotes: ['Mocked motivational message'],
}));

const DAILY_SUMMARY_ERROR = 'Failed to fetch daily summary:';
const originalConsoleError = console.error;
let consoleErrorSpy: jest.SpyInstance<void, Parameters<typeof console.error>>;
let capturedErrors: string[] = [];

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((message?: unknown, ...args: unknown[]) => {
    const text = typeof message === 'string' ? message : String(message);
    if (text.includes(DAILY_SUMMARY_ERROR)) {
      capturedErrors.push(text);
      return;
    }
    originalConsoleError.call(console, message, ...args);
  });
});

afterAll(() => {
  consoleErrorSpy?.mockRestore();
});

afterEach(() => {
  capturedErrors = [];
});

describe('DailyBriefingWidget', () => {
  const mockGetDailySummary = getDailySummary as jest.Mock;
  const mockUseGlobalState = useGlobalState as jest.Mock;
  const mockProfile = {name: 'Test User', dream: 'To be a test expert'};
  const mockTasks = [{id: 't1', title: 'Test Task'}];
  const mockRoutines = [{id: 'r1', title: 'Test Routine'}];
  const mockLogs = [{id: 'l1', type: 'TASK_COMPLETE'}];

  let localStorageMock: {[key: string]: string};

  beforeEach(() => {
    localStorageMock = {};
    Storage.prototype.getItem = jest.fn(key => localStorageMock[key] || null);
    Storage.prototype.setItem = jest.fn((key, value) => {
      localStorageMock[key] = value;
    });
    mockUseGlobalState.mockReturnValue({
      state: {isOffline: false},
    });
    jest.clearAllMocks();
  });

  describe('Online User Flows', () => {
    it('fetches and displays the daily summary', async () => {
      const summary = {
        evaluation: 'Great job!',
        motivationalParagraph: 'Keep it up!',
      };
      mockGetDailySummary.mockResolvedValue(summary);

      render(
        <DailyBriefingWidget
          previousDayLogs={mockLogs as any}
          profile={mockProfile as any}
          tasks={mockTasks as any}
          routines={mockRoutines as any}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Yesterday's Evaluation")).toBeInTheDocument();
      });

      expect(screen.getByText('Great job!')).toBeInTheDocument();
      expect(screen.getByText("Today's Motivation")).toBeInTheDocument();
      expect(screen.getByText('Keep it up!')).toBeInTheDocument();
    });

    it('renders motivational quote if there are no previous day logs', async () => {
      render(
        <DailyBriefingWidget
          previousDayLogs={[]}
          profile={mockProfile as any}
          tasks={mockTasks as any}
          routines={mockRoutines as any}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Mocked motivational message')).toBeInTheDocument();
      });
      expect(mockGetDailySummary).not.toHaveBeenCalled();
    });
  });

  describe('Offline User Flows', () => {
    beforeEach(() => {
      mockUseGlobalState.mockReturnValue({
        state: {isOffline: true},
      });
    });

    it('renders motivational quote when offline and unable to fetch summary', async () => {
      mockGetDailySummary.mockRejectedValue(new Error('Network error'));

      render(
        <DailyBriefingWidget
          previousDayLogs={mockLogs as any}
          profile={mockProfile as any}
          tasks={mockTasks as any}
          routines={mockRoutines as any}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Mocked motivational message')).toBeInTheDocument();
      });

      expect(capturedErrors).toEqual(expect.arrayContaining([expect.stringContaining(DAILY_SUMMARY_ERROR)]));

      // It should still try to fetch once
      expect(mockGetDailySummary).toHaveBeenCalledTimes(1);
    });

    it('does not fetch summary if it was already shown today, even when offline', async () => {
      const sessionDateStr = format(new Date(), 'yyyy-MM-dd');
      localStorageMock['dailySummaryLastShown'] = sessionDateStr;

      render(
        <DailyBriefingWidget
          previousDayLogs={mockLogs as any}
          profile={mockProfile as any}
          tasks={mockTasks as any}
          routines={mockRoutines as any}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Mocked motivational message')).toBeInTheDocument();
      });

      expect(mockGetDailySummary).not.toHaveBeenCalled();
    });
  });
});