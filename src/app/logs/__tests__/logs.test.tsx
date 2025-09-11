import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import LogPage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';
import { LogEvent } from '@/lib/types';

jest.mock('@/hooks/use-global-state');

const mockUseGlobalState = useGlobalState as jest.Mock;

const mockLogs: LogEvent[] = [
  { id: '1', type: 'TASK_ADD', payload: { title: 'Second Task' }, timestamp: '2024-07-27T10:00:00.000Z' },
  { id: '2', type: 'TASK_COMPLETE', payload: { taskId: 't1' }, timestamp: '2024-07-27T12:30:00.000Z' },
  { id: '3', type: 'TIMER_START', payload: { itemId: 't2' }, timestamp: '2024-07-27T09:00:00.000Z' },
];

describe('LogPage', () => {
  const setup = (state: any) => {
    mockUseGlobalState.mockReturnValue({
      state: {
        isLoaded: true,
        logs: [],
        ...state,
      },
    });
    return render(<LogPage />, { wrapper: MemoryRouterProvider });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render logs in reverse chronological order with correct details', () => {
    setup({ logs: mockLogs });
    const logItems = screen.getAllByTestId('log-item');
    
    // Check order (most recent first)
    expect(logItems[0]).toHaveTextContent('TASK COMPLETE');
    expect(logItems[1]).toHaveTextContent('TASK ADD');
    expect(logItems[2]).toHaveTextContent('TIMER START');

    // Check details of the first log item
    const firstLog = logItems[0];
    expect(firstLog).toHaveTextContent('✅'); // Icon for TASK_COMPLETE
    expect(firstLog).toHaveTextContent(new Date('2024-07-27T12:30:00.000Z').toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
    expect(firstLog).toHaveTextContent('"taskId": "t1"');
  });

  it('should show the empty state when no logs are available', () => {
    setup({ logs: [] });
    expect(screen.getByText('No Activity Yet Today')).toBeInTheDocument();
    expect(screen.getByText('As you work on your tasks, your actions will be logged here.')).toBeInTheDocument();
  });

  it('should show the loading state when data is not loaded', () => {
    setup({ isLoaded: false });
    // Expecting 3 skeleton loaders
    expect(screen.getAllByRole('status').length).toBe(3);
  });

  it('should display the correct icon and title for each log type', () => {
    const allLogTypes: LogEvent[] = [
      { id: '1', type: 'TASK_ADD', payload: {}, timestamp: '2024-07-27T10:00:00Z' },
      { id: '2', type: 'TASK_COMPLETE', payload: {}, timestamp: '2024-07-27T11:00:00Z' },
      { id: '3', type: 'TIMER_START', payload: {}, timestamp: '2024-07-27T12:00:00Z' },
      { id: '4', type: 'TIMER_PAUSE', payload: {}, timestamp: '2024-07-27T13:00:00Z' },
      { id: '5', type: 'TIMER_STOP', payload: {}, timestamp: '2024-07-27T14:00:00Z' },
      { id: '6', type: 'TIMER_COMPLETE', payload: {}, timestamp: '2024-07-27T15:00:00Z' },
      { id: '7', type: 'UNKNOWN_EVENT' as any, payload: {}, timestamp: '2024-07-27T16:00:00Z' },
    ];
    setup({ logs: allLogTypes });

    const logItems = screen.getAllByTestId('log-item');
    
    const expectations = [
      { type: 'UNKNOWN EVENT', icon: '🔹' },
      { type: 'TIMER COMPLETE', icon: '🎉' },
      { type: 'TIMER STOP', icon: '⏹️' },
      { type: 'TIMER PAUSE', icon: '⏸️' },
      { type: 'TIMER START', icon: '▶️' },
      { type: 'TASK COMPLETE', icon: '✅' },
      { type: 'TASK ADD', icon: '📝' },
    ];

    expect(logItems.length).toBe(expectations.length);

    logItems.forEach((item, index) => {
      const expectation = expectations[index];
      const { getByText } = within(item);
      expect(getByText(expectation.type)).toBeInTheDocument();
      expect(getByText(expectation.icon)).toBeInTheDocument();
    });
  });
});