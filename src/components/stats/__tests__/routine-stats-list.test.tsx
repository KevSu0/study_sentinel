import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RoutineStatsList, RoutineStat } from '../routine-stats-list';

describe('RoutineStatsList', () => {
  const mockData: RoutineStat[] = [
    { name: 'Morning Routine', totalSeconds: 7200, sessionCount: 2, points: 20 },
    { name: 'Evening Routine', totalSeconds: 3600, sessionCount: 1, points: 10 },
    { name: 'Workout', totalSeconds: 10800, sessionCount: 3, points: 30 },
    { name: 'Reading', totalSeconds: 1800, sessionCount: 1, points: 5 },
  ];

  it('renders the top 3 routines by default', () => {
    render(<RoutineStatsList data={mockData} />);
    expect(screen.getByText('Workout')).toBeInTheDocument(); // 3h
    expect(screen.getByText('Morning Routine')).toBeInTheDocument(); // 2h
    expect(screen.getByText('Evening Routine')).toBeInTheDocument(); // 1h
    expect(screen.queryByText('Reading')).not.toBeInTheDocument();
  });

  it('shows all routines when "Show More" is clicked', () => {
    render(<RoutineStatsList data={mockData} />);
    const showMoreButton = screen.getByText('Show More');
    fireEvent.click(showMoreButton);
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Show Less')).toBeInTheDocument();
  });

  it('hides extra routines when "Show Less" is clicked', () => {
    render(<RoutineStatsList data={mockData} />);
    fireEvent.click(screen.getByText('Show More'));
    fireEvent.click(screen.getByText('Show Less'));
    expect(screen.queryByText('Reading')).not.toBeInTheDocument();
  });

  it('renders an empty state when no data is provided', () => {
    render(<RoutineStatsList data={[]} />);
    expect(screen.getByText('No routine data to display.')).toBeInTheDocument();
  });

  it('does not show the "Show More" button if there are 3 or fewer routines', () => {
    const lessData = mockData.slice(0, 3);
    render(<RoutineStatsList data={lessData} />);
    expect(screen.queryByText('Show More')).not.toBeInTheDocument();
  });
});