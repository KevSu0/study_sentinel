import React from 'react';
import {render, screen} from '@testing-library/react';
import {StatsOverviewWidget} from '@/components/dashboard/widgets/stats-overview-widget';
import type {Badge} from '@/lib/types';
import type {ActivityFeedItem} from '@/hooks/use-global-state';

// Mock the ProductivityPieChart component
jest.mock('@/components/dashboard/productivity-pie-chart', () => ({
  __esModule: true,
  default: (props: {data: any[]}) => (
    <div data-testid="productivity-pie-chart" data-props={JSON.stringify(props.data)} />
  ),
}));

describe('StatsOverviewWidget', () => {
  const mockBadges: Badge[] = [
    {
      id: 'b1',
      name: 'Test Badge',
      description: 'A badge for testing',
      category: 'daily',
      icon: 'test-icon',
      isCustom: false,
      isEnabled: true,
      requiredCount: 1,
      conditions: [],
    },
  ];

  const mockActivity: ActivityFeedItem[] = [
    {
      timestamp: new Date().toISOString(),
      type: 'TASK_COMPLETE',
      data: {
        task: {
          id: 't1',
          shortId: 't1',
          title: 'Completed Task',
          duration: 3600, // 60 minutes in seconds
          points: 50,
          time: '10:00',
          date: '2024-07-30',
          status: 'completed',
          priority: 'high',
          timerType: 'countdown',
        },
      },
    },
    {
      timestamp: new Date().toISOString(),
      type: 'ROUTINE_COMPLETE',
      data: {
        payload: {
          title: 'Morning Routine',
          duration: 1800, // 30 minutes in seconds
          points: 20,
        },
      },
    },
  ];

  it('renders no time logged message when there is no activity', async () => {
    render(<StatsOverviewWidget todaysBadges={[]} todaysActivity={[]} />);
    expect(await screen.findByText("Today's Productivity")).toBeInTheDocument();
    expect(await screen.findByText('No time logged yet.')).toBeInTheDocument();
    
    const pointsCard = await screen.findByText('Points Earned Today');
    expect(pointsCard.closest('div.rounded-lg')).toHaveTextContent('0');
  });

  it('renders stats correctly based on props', async () => {
    render(
      <StatsOverviewWidget
        todaysBadges={mockBadges}
        todaysActivity={mockActivity}
      />
    );

    // Check stats cards
    expect(await screen.findByText('Points Earned Today')).toBeInTheDocument();
    expect(await screen.findByText('70')).toBeInTheDocument(); // 50 (task) + 20 (routine)

    expect(await screen.findByText('Badges Unlocked Today')).toBeInTheDocument();
    expect(await screen.findByText('1')).toBeInTheDocument();

    expect(await screen.findByText('Sessions Completed')).toBeInTheDocument();
    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('passes correctly processed data to ProductivityPieChart', async () => {
    render(
      <StatsOverviewWidget
        todaysBadges={mockBadges}
        todaysActivity={mockActivity}
      />
    );

    const pieChart = await screen.findByTestId('productivity-pie-chart');
    const chartData = JSON.parse(pieChart.getAttribute('data-props')!);

    expect(chartData).toHaveLength(2);
    expect(chartData[0]).toEqual({
      name: 'Task: Completed Task',
      value: 3600,
      points: 50,
    });
    expect(chartData[1]).toEqual({
      name: 'Routine: Morning Routine',
      value: 1800,
      points: 20,
    });
  });

  describe('Offline User Flows', () => {
    it('renders stats correctly when offline', async () => {
      render(
        <StatsOverviewWidget
          todaysBadges={mockBadges}
          todaysActivity={mockActivity}
        />
      );

      // Check stats cards
      expect(await screen.findByText('Points Earned Today')).toBeInTheDocument();
      expect(await screen.findByText('70')).toBeInTheDocument();

      expect(await screen.findByText('Badges Unlocked Today')).toBeInTheDocument();
      expect(await screen.findByText('1')).toBeInTheDocument();

      expect(await screen.findByText('Sessions Completed')).toBeInTheDocument();
      expect(await screen.findByText('2')).toBeInTheDocument();
    });

    it('passes data to ProductivityPieChart when offline', async () => {
      render(
        <StatsOverviewWidget
          todaysBadges={mockBadges}
          todaysActivity={mockActivity}
        />
      );

      const pieChart = await screen.findByTestId('productivity-pie-chart');
      const chartData = JSON.parse(pieChart.getAttribute('data-props')!);

      expect(chartData).toHaveLength(2);
    });
  });
});