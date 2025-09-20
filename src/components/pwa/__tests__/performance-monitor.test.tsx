import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PerformanceMonitor } from '../performance-monitor';
import type { PerformanceSnapshot } from '@/lib/performance-metrics';

const mockRefresh = jest.fn();
let mockSnapshot: PerformanceSnapshot = {
  fps: 60,
  longTasksPerSecond: 0.5,
  heapUsedPercentage: 50,
  collectedAt: Date.now(),
};

jest.mock('@/lib/performance-metrics', () => ({
  usePerformanceMetrics: () => ({ snapshot: mockSnapshot, refresh: mockRefresh }),
}));

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    mockSnapshot = {
      fps: 60,
      longTasksPerSecond: 0.5,
      heapUsedPercentage: 50,
      collectedAt: new Date('2024-01-01T10:00:00Z').getTime(),
    };
  });

  const getStatusBadge = (metricLabel: string) =>
    within(screen.getByLabelText(`${metricLabel} metric`)).getByText(/Status:/i);

  it('renders the default snapshot with good statuses', () => {
    render(<PerformanceMonitor />);

    expect(getStatusBadge('Frame rate')).toHaveTextContent('Good');
    expect(getStatusBadge('Long tasks')).toHaveTextContent('Good');
    expect(getStatusBadge('Heap usage')).toHaveTextContent('Good');
    expect(screen.getByText(/60 fps/i)).toBeInTheDocument();
    expect(screen.getByText(/0.5 long tasks\/s/i)).toBeInTheDocument();
    expect(screen.getByText(/50% used/i)).toBeInTheDocument();
  });

  it.each([
    { value: 55, level: 'Good' },
    { value: 54, level: 'Warning' },
    { value: 40, level: 'Warning' },
    { value: 39, level: 'Critical' },
  ])('classifies $value fps as $level', ({ value, level }) => {
    mockSnapshot = {
      fps: value,
      longTasksPerSecond: 0.5,
      heapUsedPercentage: 50,
      collectedAt: Date.now(),
    };

    render(<PerformanceMonitor />);

    expect(getStatusBadge('Frame rate')).toHaveTextContent(level);
  });

  it.each([
    { value: 1.0, level: 'Good' },
    { value: 1.1, level: 'Warning' },
    { value: 4.0, level: 'Warning' },
    { value: 4.1, level: 'Critical' },
  ])('classifies $value long tasks/sec as $level', ({ value, level }) => {
    mockSnapshot = {
      fps: 60,
      longTasksPerSecond: value,
      heapUsedPercentage: 50,
      collectedAt: Date.now(),
    };

    render(<PerformanceMonitor />);

    expect(getStatusBadge('Long tasks')).toHaveTextContent(level);
  });

  it.each([
    { value: 60, level: 'Good' },
    { value: 61, level: 'Warning' },
    { value: 75, level: 'Warning' },
    { value: 76, level: 'Critical' },
  ])('classifies $value% heap usage as $level', ({ value, level }) => {
    mockSnapshot = {
      fps: 60,
      longTasksPerSecond: 0.5,
      heapUsedPercentage: value,
      collectedAt: Date.now(),
    };

    render(<PerformanceMonitor />);

    expect(getStatusBadge('Heap usage')).toHaveTextContent(level);
  });

  it('marks metrics as unknown when no readings are available', () => {
    mockSnapshot = {
      fps: null,
      longTasksPerSecond: null,
      heapUsedPercentage: null,
      collectedAt: Date.now(),
    };

    render(<PerformanceMonitor />);

    expect(getStatusBadge('Frame rate')).toHaveTextContent('Unknown');
    expect(getStatusBadge('Long tasks')).toHaveTextContent('Unknown');
    expect(getStatusBadge('Heap usage')).toHaveTextContent('Unknown');
    expect(screen.getAllByText(/unknown/i)).not.toHaveLength(0);
  });

  it('invokes refresh when the user requests updated metrics', async () => {
    const user = userEvent.setup();

    render(<PerformanceMonitor />);

    await user.click(screen.getByRole('button', { name: /refresh performance metrics/i }));

    expect(mockRefresh).toHaveBeenCalled();
  });
});
