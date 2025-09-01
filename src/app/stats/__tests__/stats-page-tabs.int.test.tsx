/** @jest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatsPage from '@/app/stats/page';
import { AppStateProvider } from '@/hooks/state/AppStateProvider';
import { logRepository } from '@/lib/repositories';
import { backfillSessions } from '@/lib/data/backfill-sessions';

const add = async (id: string, iso: string, points = 10, durationSec = 600) => {
  await (logRepository as any).add({
    id,
    timestamp: iso,
    type: 'TIMER_SESSION_COMPLETE',
    payload: { taskId: 'T', title: id, duration: durationSec, pausedDuration: 0, points, priority: 'medium' },
  });
};

describe('Stats page tabs', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-09-01T10:00:00Z'));
  });
  afterAll(() => jest.useRealTimers());

  it('renders tabs and navigates between them', async () => {
    await add('TAB-1', '2025-09-01T06:00:00Z');
    await add('TAB-2', '2025-08-29T06:00:00Z');
    await backfillSessions();

    render(
      <AppStateProvider>
        <StatsPage />
      </AppStateProvider>
    );

    // Tabs visible (robust, a11y-first)
    const todayTab = await screen.findByRole('tab', { name: /^today$/i });
    const weeklyTab = screen.getByRole('tab', { name: /last 7 days/i });
    const monthlyTab = screen.getByRole('tab', { name: /last 30 days/i });
    const overallTab = screen.getByRole('tab', { name: /overall/i });

    await waitFor(() => {
      const selected =
        todayTab.getAttribute('aria-selected') === 'true' ||
        todayTab.getAttribute('data-state') === 'active';
      expect(selected).toBe(true);
    });

    const user = userEvent.setup();
    await user.click(weeklyTab);

    await waitFor(() => {
      expect(screen.getByText('Your Progress & Stats')).toBeInTheDocument();
    });
  });
});
