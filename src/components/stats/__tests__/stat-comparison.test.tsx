import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatComparison } from '../stat-comparison';

describe('StatComparison', () => {
  const mockStats = {
    today: { duration: 3600, points: 100, start: 0, end: 0 },
    yesterday: { duration: 1800, points: 50, start: 0, end: 0 },
    dailyAverage: { duration: 3000, points: 80, start: 0, end: 0 },
    last3DaysAverage: { duration: 2500, points: 70, start: 0, end: 0 },
    weeklyAverage: { duration: 4000, points: 120, start: 0, end: 0 },
    monthlyAverage: { duration: 3200, points: 90, start: 0, end: 0 },
  };

  it('renders the comparison cards with correct data', () => {
    render(<StatComparison stats={mockStats} selectedDate={new Date()} />);

    expect(screen.getByText("Today's Performance Snapshot")).toBeInTheDocument();

    // Check duration comparisons
    expect(screen.getByText('1h 0m')).toBeInTheDocument();
    const durationCards = screen.getAllByText(/Yesterday|Daily Avg|Weekly Avg|Monthly Avg/);
    expect(durationCards).toHaveLength(8); // 4 for duration, 4 for points

    // Check points comparisons
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows positive indicators when today is better', () => {
    render(<StatComparison stats={mockStats} selectedDate={new Date()} />);
    // Today's duration (3600) > Yesterday's (1800) -> Good
    const yesterdayDurationCard = screen.getAllByText('Yesterday')[0].closest('div');
    expect(yesterdayDurationCard).toHaveTextContent('+30m');
    expect(yesterdayDurationCard?.querySelector('.text-green-500')).toBeInTheDocument();
  });

  it('shows negative indicators when today is worse', () => {
    render(<StatComparison stats={mockStats} selectedDate={new Date()} />);
    // Today's duration (3600) < Weekly Average (4000) -> Bad
    const weeklyDurationCard = screen.getAllByText('Weekly Avg')[0].closest('div');
    const weeklyDurationText = weeklyDurationCard?.textContent ?? '';
    expect(weeklyDurationText).toContain('7m');
    expect(weeklyDurationCard?.querySelector('.text-red-500')).toBeInTheDocument();
  });

  it('shows "No Data" when comparison data is zero', () => {
    const statsWithZero = {
      ...mockStats,
      yesterday: { duration: 0, points: 0, start: 0, end: 0 },
    };
    render(<StatComparison stats={statsWithZero} selectedDate={new Date()} />);
    const yesterdayDurationCard = screen.getAllByText('Yesterday')[0].closest('div');
    expect(yesterdayDurationCard).toHaveTextContent('No Data');
  });

  it('shows "No change" when today and comparison are equal', () => {
    const statsWithEqual = {
      ...mockStats,
      yesterday: { ...mockStats.today },
    };
    render(<StatComparison stats={statsWithEqual} selectedDate={new Date()} />);
    const yesterdayDurationCard = screen.getAllByText('Yesterday')[0].closest('div');
    expect(yesterdayDurationCard).toHaveTextContent('No change');
  });

  describe('formatDuration', () => {
    it('formats zero seconds correctly', () => {
      const stats = { ...mockStats, today: { ...mockStats.today, duration: 0 } };
      render(<StatComparison stats={stats} selectedDate={new Date()} />);
      expect(screen.getByText('0m')).toBeInTheDocument();
    });

    it('formats seconds into minutes', () => {
      const stats = { ...mockStats, today: { ...mockStats.today, duration: 540 } }; // 9 minutes
      render(<StatComparison stats={stats} selectedDate={new Date()} />);
      expect(screen.getByText('9m')).toBeInTheDocument();
    });

    it('formats seconds into hours and minutes', () => {
      const stats = { ...mockStats, today: { ...mockStats.today, duration: 9000 } }; // 2h 30m
      render(<StatComparison stats={stats} selectedDate={new Date()} />);
      expect(screen.getByText('2h 30m')).toBeInTheDocument();
    });
  });

  describe('Points Comparison', () => {
    it('shows positive indicators for points when today is better', () => {
      render(<StatComparison stats={mockStats} selectedDate={new Date()} />);
      // Today's points (100) > Yesterday's (50) -> Good
      const yesterdayPointsCard = screen.getAllByText('Yesterday')[1].closest('div');
      expect(yesterdayPointsCard).toHaveTextContent('+50');
      expect(yesterdayPointsCard?.querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('shows negative indicators for points when today is worse', () => {
      render(<StatComparison stats={mockStats} selectedDate={new Date()} />);
      // Today's points (100) < Weekly Average (120) -> Bad
      const weeklyPointsCard = screen.getAllByText('Weekly Avg')[1].closest('div');
      const weeklyPointsText = weeklyPointsCard?.textContent ?? '';
      expect(weeklyPointsText).toContain('20');
      expect(weeklyPointsCard?.querySelector('.text-red-500')).toBeInTheDocument();
    });
  });
});
