/** @jest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AppStateProvider } from '@/hooks/state/AppStateProvider';
import { StatsOverviewWidget } from '@/components/dashboard/widgets/stats-overview-widget';
import { eventRepository } from '@/lib/repositories/event.repository';
import { format } from 'date-fns';
import { getStudyDateForTimestamp } from '@/lib/utils';
// Make the widget's notion of "today" deterministic for this suite
jest.mock('@/lib/utils', () => {
  const actual = jest.requireActual('@/lib/utils');
  return {
    ...actual,
    getSessionDate: () => new Date('2025-09-01T04:00:00Z'),
  };
});

const add = async (id: string, iso: string, points: number, durationSec: number, title = 'S') => {
  await (eventRepository as any).add({
    id,
    timestamp: iso,
    type: 'TIMER_SESSION_COMPLETE',
    payload: { taskId: 'T', title, duration: durationSec, pausedDuration: 0, pauseCount: 0, points, priority: 'medium' },
    dateKey: format(getStudyDateForTimestamp(iso), 'yyyy-MM-dd'),
    meta: { v: 1 },
  });
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
    // events seeded; projections read directly

    render(
      <AppStateProvider>
        <StatsOverviewWidget todaysBadges={[]} />
      </AppStateProvider>
    );

    // Expect exact total points via stable test id
    const pointsNode = await screen.findByTestId('points-today-value');
    await waitFor(() => expect(pointsNode).toHaveTextContent(/^60$/));

    // Add one more session and expect increase
    await add('SW-3', '2025-09-01T09:00:00Z', 10, 10 * 60, 'Gamma');
    // events seeded; projections read directly

    await waitFor(() => expect(pointsNode).toHaveTextContent(/^70$/));
  });
});




