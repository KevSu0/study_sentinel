import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import ProductivityPieChart from '@/components/dashboard/productivity-pie-chart';

// Mock recharts library
jest.mock('recharts', () => {
  const OriginalRecharts = jest.requireActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({children}: {children: React.ReactNode}) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    PieChart: ({children}: {children: React.ReactNode}) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Pie: (props: any) => (
      <div data-testid="pie" onMouseEnter={props.onMouseEnter} onMouseLeave={props.onMouseLeave}>
        {props.children}
      </div>
    ),
    Cell: ({fill}: {fill: string}) => <div data-testid="cell" data-fill={fill} />,
    Sector: (props: any) => <div data-testid="sector" {...props} />,
  };
});

describe('ProductivityPieChart', () => {
  const mockData = [
    {name: 'Task: Write report', value: 3600}, // 1h
    {name: 'Routine: Morning prep', value: 1800}, // 30m
    {name: 'Task: Code review', value: 5400}, // 1h 30m
  ];

  it('renders no time logged message when data is empty', () => {
    render(<ProductivityPieChart data={[]} />);
    expect(screen.getByText("Today's Productivity")).toBeInTheDocument();
    expect(screen.getByText('No time logged yet.')).toBeInTheDocument();
  });

  it('renders the chart with total time when data is provided', () => {
    render(<ProductivityPieChart data={mockData} />);
    expect(screen.getByText("Today's Productivity")).toBeInTheDocument();
    // Total time: 1h + 30m + 1h 30m = 3h
    expect(screen.getByText('3h')).toBeInTheDocument();
    expect(screen.getByText('Total Time')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });


  it('renders the correct number of Cells', () => {
    render(<ProductivityPieChart data={mockData} />);
    const cells = screen.getAllByTestId('cell');
    expect(cells).toHaveLength(mockData.length);
  });

  it('handles mouse enter and leave events on the pie', () => {
    render(<ProductivityPieChart data={mockData} />);
    const pieContainer = screen.getByTestId('pie');

    // Initial state: activeIndex is null, so total time is shown
    expect(screen.getByText('3h')).toBeInTheDocument();

    // Simulate mouse enter on the Pie component
    fireEvent.mouseEnter(pieContainer);

    // After mouse enter, the active shape should be rendered.
    // We can't directly test the state change, but we can check if the total time disappears
    // as it's conditionally rendered based on activeIndex === null.
    expect(screen.queryByText('3h')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Time')).not.toBeInTheDocument();

    // Simulate mouse leave
    fireEvent.mouseLeave(pieContainer);

    // After mouse leave, the total time should be visible again
    expect(screen.getByText('3h')).toBeInTheDocument();
    expect(screen.getByText('Total Time')).toBeInTheDocument();
  });

  describe('formatTime utility', () => {
    // The formatTime function is internal, but we can test its output via the UI
    it('formats time less than a minute correctly', () => {
      render(<ProductivityPieChart data={[{name: 'Task: Quick check', value: 30}]} />);
      expect(screen.getByText('1m')).toBeInTheDocument();
    });

    it('formats time in minutes correctly', () => {
      render(<ProductivityPieChart data={[{name: 'Task: Read email', value: 300}]} />); // 5m
      expect(screen.getByText('5m')).toBeInTheDocument();
    });

    it('formats time in hours and minutes correctly', () => {
      render(
        <ProductivityPieChart data={[{name: 'Task: Long meeting', value: 9000}]} />
      ); // 2h 30m
      expect(screen.getByText('2h 30m')).toBeInTheDocument();
    });
  });
});