import React from 'react';
import {render, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {DailyActivityTimeline} from '../daily-activity-timeline';
import {TooltipProvider} from '@/components/ui/tooltip';
import {useTheme} from 'next-themes';

jest.mock('next-themes');

const mockUseTheme = useTheme as jest.Mock;

describe('DailyActivityTimeline', () => {
  const mockData: {
    name: string;
    time: [number, number];
    type: 'task' | 'routine';
    duration: number;
  }[] = [
    {name: 'Task 1', time: [10, 11], type: 'task', duration: 3600},
    {name: 'Routine 1', time: [14, 15.5], type: 'routine', duration: 5400},
    {name: 'Task 2', time: [16, 17], type: 'task', duration: 3600},
  ];

  beforeEach(() => {
    mockUseTheme.mockReturnValue({theme: 'light'});
  });

  it('renders the timeline with activities', () => {
    render(<DailyActivityTimeline data={mockData} />);
    expect(screen.getByText('Daily Activity Timeline')).toBeInTheDocument();
    const activities = screen.getAllByTestId('timeline-activity');
    expect(activities).toHaveLength(mockData.length);
  });

  it('shows activity details on hover and hides on unhover', async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider delayDuration={0}>
        <DailyActivityTimeline data={mockData} />
      </TooltipProvider>,
    );
    const activities = screen.getAllByTestId('timeline-activity');

    // --- Test First Activity ---
    const firstActivity = activities[0];
    await user.hover(firstActivity);

    // Check that the tooltip is open
    const tooltip1 = await screen.findByRole('tooltip');
    await waitFor(() => {
      expect(tooltip1).toHaveAttribute('data-state', 'open');
    });
    expect(within(tooltip1).getByText('Task 1')).toBeInTheDocument();
    expect(within(tooltip1).getByText('Duration: 1h')).toBeInTheDocument();

    // Unhover from the first activity
    await user.unhover(firstActivity);

    // Wait for the tooltip to be closed
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveAttribute('data-state', 'closed');
    });

    // --- Test Second Activity ---
    const secondActivity = activities[1];
    await user.hover(secondActivity);

    // Check that the new tooltip content is visible
    const tooltip2 = await screen.findByRole('tooltip');
    await waitFor(() => {
      expect(tooltip2).toHaveAttribute('data-state', 'open');
    });
    expect(within(tooltip2).getByText('Routine 1')).toBeInTheDocument();
    expect(within(tooltip2).getByText('Duration: 1h 30m')).toBeInTheDocument();

    // Unhover from the second activity
    await user.unhover(secondActivity);

    // Wait for the tooltip to be closed
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveAttribute('data-state', 'closed');
    });

    // --- Test Third Activity ---
    const thirdActivity = activities[2];
    await user.hover(thirdActivity);

    // Check that the new tooltip content is visible
    const tooltip3 = await screen.findByRole('tooltip');
    await waitFor(() => {
      expect(tooltip3).toHaveAttribute('data-state', 'open');
    });
    expect(within(tooltip3).getByText('Task 2')).toBeInTheDocument();
    expect(within(tooltip3).getByText('Duration: 1h')).toBeInTheDocument();

    // Unhover from the third activity
    await user.unhover(thirdActivity);

    // Wait for the tooltip to be closed
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveAttribute('data-state', 'closed');
    });
  });

  it('renders time labels', () => {
    render(<DailyActivityTimeline data={mockData} />);
    expect(screen.getByText('6 AM')).toBeInTheDocument();
    expect(screen.getByText('9 AM')).toBeInTheDocument();
    expect(screen.getByText('12 PM')).toBeInTheDocument();
    expect(screen.getByText('3 PM')).toBeInTheDocument();
  });

  describe('Time-based rendering', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renders the current time indicator', () => {
      // Set the time to 10:30 AM
      jest.setSystemTime(new Date(2023, 1, 1, 10, 30));
      render(<DailyActivityTimeline data={[]} />);
      const indicator = screen.getByTitle(/Current Time/);
      expect(indicator).toBeInTheDocument();
      // 10:30 is 6.5 hours into the 20-hour view (4am to midnight is 20 hours).
      // (6.5 / 20) * 100 = 32.5%
      // The timeline runs from 4:00 to 4:00 the next day, which is 24 hours.
      // 10:30 is 6.5 hours past 4:00.
      // (6.5 / 24) * 100 = 27.08% -> This logic is wrong.
      // Let's re-read the component code.
      // The component calculates `(hours + minutes / 60 - 4) / 20 * 100`.
      // (10 + 30 / 60 - 4) / 20 * 100 = (10.5 - 4) / 20 * 100 = 6.5 / 20 * 100 = 32.5%
      expect(indicator.style.left).toBe('32.5%');
    });

    it('does not render the current time indicator if outside the 4am-4am range', () => {
      // Set the time to 3:30 AM
      jest.setSystemTime(new Date(2023, 1, 1, 3, 30));
      render(<DailyActivityTimeline data={[]} />);
      expect(screen.queryByTitle(/Current Time/)).not.toBeInTheDocument();
    });
  });

  describe('Offline User Flows', () => {
    it('renders correctly with no activity data', () => {
      render(<DailyActivityTimeline data={[]} />);
      expect(screen.getByText('Daily Activity Timeline')).toBeInTheDocument();
      expect(screen.queryByTestId('timeline-activity')).not.toBeInTheDocument();
    });
  });
});