import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyBriefingPage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import * as actions from '@/lib/actions';
import * as utils from '@/lib/utils';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';
import { type UserProfile } from '@/lib/types';

// Define the shape of the global state for the mock, as ReturnType<typeof useGlobalState>
// is causing type inference issues in this test file.
type MockGlobalState = {
  isLoaded: boolean;
  previousDayLogs: any[];
  profile: UserProfile;
  tasks: any[];
  routines: any[];
};

// Mock dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('@/lib/actions');
jest.mock('@/lib/utils');
jest.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Lightbulb: () => <div data-testid="icon-lightbulb" />,
}));

const mockUseGlobalState = useGlobalState as jest.Mock;
const mockGetDailySummary = actions.getDailySummary as jest.Mock;
const mockGetSessionDate = utils.getSessionDate as jest.Mock;

const mockProfile: UserProfile = { name: 'Test User', dream: 'To be a tester' };
const mockLogs = [{ id: '1', type: 'TASK_COMPLETE', payload: {}, timestamp: new Date().toISOString() }];
const mockTasks = [{ id: 't1', title: 'Test Task' }];
const mockRoutines = [{ id: 'r1', title: 'Test Routine' }];
const MOCK_SESSION_DATE = '2024-07-28';

describe('DailyBriefingPage', () => {
  const setup = (state: Partial<MockGlobalState>) => {
    mockUseGlobalState.mockReturnValue({
      state: {
        isLoaded: true,
        previousDayLogs: mockLogs,
        profile: mockProfile,
        tasks: mockTasks,
        routines: mockRoutines,
        ...state,
      },
    });
    mockGetSessionDate.mockReturnValue(new Date(MOCK_SESSION_DATE));
    return render(<DailyBriefingPage />, { wrapper: MemoryRouterProvider });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockGetDailySummary.mockResolvedValue({
      evaluation: 'Good job!',
      motivationalParagraph: 'Keep it up!',
    });
  });

  it('should render the loading skeleton when global state is not loaded', () => {
    setup({ isLoaded: false });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should call getDailySummary with full context and render the result', async () => {
    setup({});
    await waitFor(() => {
      expect(mockGetDailySummary).toHaveBeenCalledWith({
        profile: mockProfile,
        logs: mockLogs,
        tasks: mockTasks,
        routines: mockRoutines,
      });
    });
    expect(screen.getByText("Here's Your Briefing for Today")).toBeInTheDocument();
    expect(screen.getByText('Good job!')).toBeInTheDocument();
    expect(screen.getByText('Keep it up!')).toBeInTheDocument();
  });

  it('should call getDailySummary with default profile values if profile is incomplete', async () => {
    // Use `as any as UserProfile` to bypass the strict type check for this specific test case,
    // allowing us to verify the component's runtime fallback behavior.
    const incompleteProfile = { dream: undefined } as any as UserProfile;
    setup({ profile: incompleteProfile });

    await waitFor(() => {
      expect(mockGetDailySummary).toHaveBeenCalledWith(expect.objectContaining({
        profile: {
          name: 'User',
          dream: 'achieving their goals',
        },
      }));
    });
  });

  it('should render the empty state when there are no previous day logs', async () => {
    setup({ previousDayLogs: [] });
    await waitFor(() => {
      expect(screen.getByText('No Activity Logged Yesterday')).toBeInTheDocument();
    });
    expect(mockGetDailySummary).not.toHaveBeenCalled();
  });

  it('should render the empty state if getDailySummary returns an error object', async () => {
    mockGetDailySummary.mockResolvedValue({ error: 'AI failed' });
    setup({});
    await waitFor(() => {
      // The component currently falls back to the "No Activity" view on error.
      // This test documents that behavior.
      expect(screen.getByText('No Activity Logged Yesterday')).toBeInTheDocument();
    });
  });

  describe('Caching Logic', () => {
    const summary = {
      evaluation: 'Cached evaluation',
      motivationalParagraph: 'Cached motivation',
    };

    it('should use cached data if it is from the current session date', async () => {
      localStorage.setItem('dailySummaryLastShown', MOCK_SESSION_DATE);
      localStorage.setItem('dailySummaryContent', JSON.stringify(summary));
      setup({});
      await waitFor(() => {
        expect(screen.getByText(summary.evaluation)).toBeInTheDocument();
      });
      expect(mockGetDailySummary).not.toHaveBeenCalled();
    });

    it('should fetch new data if cached data is stale', async () => {
      localStorage.setItem('dailySummaryLastShown', '2024-07-27'); // Yesterday
      localStorage.setItem('dailySummaryContent', JSON.stringify(summary));
      setup({});
      await waitFor(() => {
        expect(mockGetDailySummary).toHaveBeenCalled();
        expect(screen.getByText('Good job!')).toBeInTheDocument();
      });
    });

    it('should fetch new data if cached data is malformed JSON', async () => {
        localStorage.setItem('dailySummaryLastShown', MOCK_SESSION_DATE);
        localStorage.setItem('dailySummaryContent', 'not-json');
        setup({});
        await waitFor(() => {
          expect(mockGetDailySummary).toHaveBeenCalled();
          expect(screen.getByText('Good job!')).toBeInTheDocument();
        });
      });
  });
});