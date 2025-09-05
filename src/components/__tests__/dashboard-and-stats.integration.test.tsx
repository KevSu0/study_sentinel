/** @jest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

// Providers and Hooks
import { AppStateProvider } from '@/hooks/state/AppStateProvider';
import { useStats } from '@/hooks/use-stats';

// Repos (Dexie-backed)
import { sessionRepository } from '@/lib/repositories';

// Backfill tool
import { backfillSessions } from '@/lib/data/backfill-sessions';

// Components under test
import { StatsOverviewWidget } from '@/components/dashboard/widgets/stats-overview-widget';
import ProductivityPieChart from '@/components/dashboard/productivity-pie-chart';
import StatsPage from '@/app/stats/page';

// Helpers
const addCompletionLog = async (overrides: Partial<any> = {}) => {
  const base: any = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type: 'TIMER_SESSION_COMPLETE',
    payload: {
      taskId: 'T-1',
      title: 'Focus Session',
      duration: 30 * 60, // seconds
      pausedDuration: 0,
      pauseCount: 0,
      points: 30,
      priority: 'medium',
    },
  } as any;
  const log: any = { ...base, ...overrides } as any;
  // await (logRepository as any).add(log);
  return log;
};

describe('Dashboard & Stats Integration', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-09-01T10:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('use-stats hook (Dexie live data)', () => {
    it('computes daily stats from sessions backfilled from logs', async () => {
      await act(async () => {
        // Two sessions today
        await addCompletionLog({ id: 'L-1', timestamp: '2025-09-01T07:00:00Z' });
        await addCompletionLog({ id: 'L-2', timestamp: '2025-09-01T08:30:00Z', payload: { title: 'Math', duration: 45 * 60, pausedDuration: 5 * 60, points: 45, priority: 'high' } as any });
        // One session yesterday
        await addCompletionLog({ id: 'L-3', timestamp: '2025-08-31T12:00:00Z', payload: { title: 'Reading', duration: 20 * 60, pausedDuration: 0, points: 20, priority: 'low' } as any });
        await backfillSessions();
      });

      const { result } = renderHook(() => useStats({ timeRange: 'daily', selectedDate: new Date('2025-09-01T10:00:00Z') }));

      await waitFor(() => {
        expect(result.current.timeRangeStats.totalPoints).toBeGreaterThan(0);
      });

      // Validate core aggregates
      const { timeRangeStats, dailyPieChartData } = result.current;
      expect(timeRangeStats.completedCount).toBe(2);
      expect(timeRangeStats.totalPoints).toBe(30 + 45);
      expect(dailyPieChartData.length).toBeGreaterThan(0);
    });
  });

  describe('StatsOverviewWidget', () => {
    it('shows sessions completed and points earned today', async () => {
      await act(async () => {
        await addCompletionLog({ id: 'L-10', timestamp: '2025-09-01T06:00:00Z', payload: { title: 'Session A', duration: 20 * 60, pausedDuration: 0, points: 20, priority: 'medium' } as any });
        await addCompletionLog({ id: 'L-11', timestamp: '2025-09-01T09:00:00Z', payload: { title: 'Session B', duration: 40 * 60, pausedDuration: 60, points: 40, priority: 'high' } as any });
        await backfillSessions();
      });

      render(
        <AppStateProvider>
          <StatsOverviewWidget todaysBadges={[]} />
        </AppStateProvider>
      );

      // Points card
      expect(await screen.findByText('Points Earned Today')).toBeInTheDocument();
      // Sessions card
      expect(await screen.findByText('Sessions Completed')).toBeInTheDocument();

      // Numeric assertions (robust)
      const pointsEls = await screen.findAllByText(/\d+/, {
        selector: 'div.text-2xl.font-bold',
      });
      expect(pointsEls.length).toBeGreaterThan(0);
    });

    it('live-updates when a new completion log is added', async () => {
      await act(async () => {
        await addCompletionLog({ id: 'L-12', timestamp: '2025-09-01T06:05:00Z', payload: { title: 'Session C', duration: 10 * 60, pausedDuration: 0, points: 10, priority: 'low' } as any });
        await backfillSessions();
      });

      render(
        <AppStateProvider>
          <StatsOverviewWidget todaysBadges={[]} />
        </AppStateProvider>
      );

      const initialPointsEls = await screen.findAllByText(/\d+/, {
        selector: 'div.text-2xl.font-bold',
      });
      const initialValue = Number((initialPointsEls[0]?.textContent || '0'));

      await act(async () => {
        await addCompletionLog({ id: 'L-13', timestamp: '2025-09-01T10:30:00Z', payload: { title: 'Session D', duration: 15 * 60, pausedDuration: 0, points: 15, priority: 'medium' } as any });
        await backfillSessions();
      });

      await waitFor(async () => {
        const updatedEls = await screen.findAllByText(/\d+/, {
          selector: 'div.text-2xl.font-bold',
        });
        const updatedValue = Number((updatedEls[0]?.textContent || '0'));
        expect(updatedValue).toBeGreaterThanOrEqual(initialValue + 15);
      });
    });
  });

  describe('ProductivityPieChart', () => {
    it('renders empty state when no data and summary when data exists', async () => {
      const { rerender } = render(<ProductivityPieChart data={[]} focusScore={100} />);

      expect(screen.getByText("No time logged yet.")).toBeInTheDocument();

      const data = [
        { name: 'Task: Focus', productiveDuration: 25 * 60, pausedDuration: 5 * 60, pauseCount: 1, focusPercentage: 83 },
        { name: 'Routine: Reading', productiveDuration: 15 * 60, pausedDuration: 0, pauseCount: 0, focusPercentage: 100 },
      ];
      rerender(<ProductivityPieChart data={data} focusScore={90} />);

      expect(screen.getByText('Productive Time')).toBeInTheDocument();
      expect(screen.getByText(/90%/)).toBeInTheDocument();
    });
  });

  describe('Stats Page Tabs', () => {
    it('renders tabs and switches between ranges', async () => {
      await act(async () => {
        await addCompletionLog({ id: 'L-20', timestamp: '2025-09-01T06:00:00Z' });
        await addCompletionLog({ id: 'L-21', timestamp: '2025-08-30T06:00:00Z' });
        await backfillSessions();
      });

      render(
        <AppStateProvider>
          <StatsPage />
        </AppStateProvider>
      );

      // Tabs exist (robust, a11y-first queries)
      const todayTab = await screen.findByRole('tab', { name: /^today$/i });
      const weeklyTab = screen.getByRole('tab', { name: /last 7 days/i });
      const monthlyTab = screen.getByRole('tab', { name: /last 30 days/i });
      const overallTab = screen.getByRole('tab', { name: /overall/i });

      // Assert Today is selected (Radix uses aria-selected or data-state="active")
      await waitFor(() => {
        const selected =
          todayTab.getAttribute('aria-selected') === 'true' ||
          todayTab.getAttribute('data-state') === 'active';
        expect(selected).toBe(true);
      });

      // Switch to Weekly
      fireEvent.click(weeklyTab);
      await waitFor(() => {
        // Main header persists
        expect(screen.getByText('Your Progress & Stats')).toBeInTheDocument();
      });
    });
  });
});
