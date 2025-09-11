import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudyActivityChart from '../weekly-chart';

// Mock the recharts library
jest.mock('recharts', () => {
  const OriginalRecharts = jest.requireActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: ({ children, data }: { children: React.ReactNode, data: any[] }) => (
      <div data-testid="bar-chart" data-props={JSON.stringify(data)}>{children}</div>
    ),
    // Mock other components used in the chart to avoid rendering issues
    Bar: () => <div>Bar</div>,
    XAxis: () => <div>XAxis</div>,
    YAxis: () => <div>YAxis</div>,
    CartesianGrid: () => <div>CartesianGrid</div>,
    Tooltip: () => <div>Tooltip</div>,
    Legend: () => <div>Legend</div>,
  };
});

describe('StudyActivityChart', () => {
  const mockData = [
    { name: 'Mon', hours: 2, goal: 1.5 },
    { name: 'Tue', hours: 3, goal: 1.5 },
    { name: 'Wed', hours: 1, goal: 1.5 },
  ];

  it('renders the chart with the correct title and description', () => {
    render(<StudyActivityChart data={mockData} title="Weekly Study" description="Last 7 days" timeRange="weekly" />);
    expect(screen.getByText('Weekly Study')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
  });

  it('passes the correct data to the BarChart component', () => {
    render(<StudyActivityChart data={mockData} title="Weekly Study" description="Last 7 days" timeRange="weekly" />);
    const barChart = screen.getByTestId('bar-chart');
    const passedData = JSON.parse(barChart.getAttribute('data-props') || '{}');
    expect(passedData).toEqual(mockData);
  });

  it('renders an empty state when no data is provided', () => {
    render(<StudyActivityChart data={[]} title="Weekly Study" description="Last 7 days" timeRange="weekly" />);
    expect(screen.getByText('Complete some tasks to see your activity.')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });
});