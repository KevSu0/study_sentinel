import React from 'react';
import {render, screen, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import {StatCardGrid} from '../stat-card-grid';
import {mockStats} from '../../../__mocks__/data/stats';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  Star: () => <svg data-testid="star-icon" />,
  Clock: () => <svg data-testid="clock-icon" />,
  CheckCircle: () => <svg data-testid="check-circle-icon" />,
  Target: () => <svg data-testid="target-icon" />,
  Activity: () => <svg data-testid="activity-icon" />,
  Award: () => <svg data-testid="award-icon" />,
  Flame: () => <svg data-testid="flame-icon" />,
}));

describe('StatCardGrid', () => {
  const defaultProps = {
    timeRange: 'weekly',
    timeRangeStats: mockStats.timeRangeStats,
    badgeStats: mockStats.badgeStats,
    studyStreak: mockStats.studyStreak,
    isLoaded: true,
  };

  it('renders the correct stats for the given time range', () => {
    render(<StatCardGrid {...defaultProps} />);

    const pointsCard = screen.getByText('Points (Weekly)').closest('div.rounded-lg') as HTMLElement;
    expect(within(pointsCard).getByText('100')).toBeInTheDocument();
    expect(within(pointsCard).getByText('pts')).toBeInTheDocument();

    const timeCard = screen.getByText('Time (Weekly)').closest('div.rounded-lg') as HTMLElement;
    expect(within(timeCard).getByText('10')).toBeInTheDocument();
    expect(within(timeCard).getByText('hours')).toBeInTheDocument();
    
    const sessionsCard = screen.getByText('Sessions (Weekly)').closest('div.rounded-lg') as HTMLElement;
    expect(within(sessionsCard).getByText('5')).toBeInTheDocument();

    const rateCard = screen.getByText('Task Rate (Weekly)').closest('div.rounded-lg') as HTMLElement;
    expect(within(rateCard).getByText('50')).toBeInTheDocument();
    expect(within(rateCard).getByText('%')).toBeInTheDocument();

    const avgSessionCard = screen.getByText('Avg. Session (Weekly)').closest('div.rounded-lg') as HTMLElement;
    expect(within(avgSessionCard).getByText('30')).toBeInTheDocument();
    expect(within(avgSessionCard).getByText('min')).toBeInTheDocument();

    const badgesCard = screen.getByText('Badges Earned').closest('div.rounded-lg') as HTMLElement;
    expect(within(badgesCard).getByText('3')).toBeInTheDocument();

    const streakCard = screen.getByText('Current Streak').closest('div.rounded-lg') as HTMLElement;
    expect(within(streakCard).getByText('7')).toBeInTheDocument();
    expect(within(streakCard).getByText('days')).toBeInTheDocument();
  });

  it('correctly formats "overall" timeRange', () => {
    render(<StatCardGrid {...defaultProps} timeRange="overall" />);
    expect(screen.getByText('Points (Overall)')).toBeInTheDocument();
  });

  describe('Offline User Flows', () => {
    it('renders skeleton loaders when isLoaded is false', () => {
      render(<StatCardGrid {...defaultProps} isLoaded={false} />);

      // Skeletons from shadcn/ui have a role of "status"
      const skeletons = screen.getAllByRole('status');
      expect(skeletons).toHaveLength(7);

      // Verify that the actual stat values are not rendered
      expect(
        screen.queryByText(defaultProps.timeRangeStats.totalPoints.toString())
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(defaultProps.timeRangeStats.totalHours.toString())
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(defaultProps.studyStreak.toString())
      ).not.toBeInTheDocument();
    });
  });
});