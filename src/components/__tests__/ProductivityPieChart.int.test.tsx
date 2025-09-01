/** @jest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ProductivityPieChart from '@/components/dashboard/productivity-pie-chart';

describe('ProductivityPieChart (states)', () => {
  it('shows empty state when no data', () => {
    render(<ProductivityPieChart data={[]} focusScore={100} />);
    expect(screen.getByText('No time logged yet.')).toBeInTheDocument();
  });

  it('renders summary when data is present', () => {
    const data = [
      { name: 'Task: Focus', productiveDuration: 25 * 60, pausedDuration: 5 * 60, pauseCount: 1, focusPercentage: 83 },
      { name: 'Routine: Reading', productiveDuration: 15 * 60, pausedDuration: 0, pauseCount: 0, focusPercentage: 100 },
    ];
    render(<ProductivityPieChart data={data} focusScore={90} />);
    expect(screen.getByText('Productive Time')).toBeInTheDocument();
    expect(screen.getByText(/90%/)).toBeInTheDocument();
  });
});

