/** @jest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AppStateProvider } from '@/hooks/state/AppStateProvider';
import { StatsOverviewWidget } from '@/components/dashboard/widgets/stats-overview-widget';
import { backfillSessions } from '@/lib/data/backfill-sessions';

const add = async (id: string, iso: string, points: number, durationSec: number, title = 'S') => {
  // await (logRepository as any).add({
  //   id,
  //   timestamp: iso,
  //   type: 'TIMER_SESSION_COMPLETE',
  //   payload: { taskId: 'T', title, duration: durationSec, pausedDuration: 0, pauseCount: 0, points, priority: 'medium' },
  // });
};

describe('StatsOverviewWidget (exactness)', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-09-01T10:00:00Z'));
  });
  afterAll(() => jest.useRealTimers());

  it('renders exact points and session count, and updates on new data', async () => {
    // Seed two sessions today: 20 + 40 points
    await add('SW-1', '2025-09-01T06:00:00Z', 20, 20 * 60, 'Alpha');
    await add('SW-2', '2025-09-01T07:00:00Z', 40, 40 * 60, 'Beta');
    await backfillSessions();

    render(
      <AppStateProvider>
        <StatsOverviewWidget todaysBadges={[]} />
      </AppStateProvider>
    );

    // Points card
    const pointsLabel = await screen.findByText('Points Earned Today');
    const pointsCard = pointsLabel.closest('.card, .Card, div');
    expect(pointsCard).toBeTruthy();

    // Expect exact total points rendered somewhere in big numbers
    expect((await screen.findAllByText(/^60$/)).length).toBeGreaterThanOrEqual(1);

    // Sessions card
    expect(await screen.findByText('Sessions Completed')).toBeInTheDocument();

    // Add one more session and expect increase
    await add('SW-3', '2025-09-01T09:00:00Z', 10, 10 * 60, 'Gamma');
    await backfillSessions();

      await waitFor(async () => {
        expect((await screen.findAllByText(/^70$/)).length).toBeGreaterThanOrEqual(1);
      });
  });
});
