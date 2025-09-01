/** @jest-environment jsdom */
import 'fake-indexeddb/auto';
import React from 'react';
import { render } from '@testing-library/react';
import ProductivityPieChart from '@/components/dashboard/productivity-pie-chart';

describe('ProductivityPieChart snapshot (structure only)', () => {
  it('matches structure snapshot for typical data', () => {
    const data = [
      { name: 'Task: Focus', productiveDuration: 25 * 60, pausedDuration: 5 * 60, pauseCount: 1, focusPercentage: 83 },
      { name: 'Routine: Reading', productiveDuration: 15 * 60, pausedDuration: 0, pauseCount: 0, focusPercentage: 100 },
    ];
    const { asFragment } = render(<ProductivityPieChart data={data} focusScore={90} />);
    expect(asFragment()).toMatchSnapshot();
  });
});

