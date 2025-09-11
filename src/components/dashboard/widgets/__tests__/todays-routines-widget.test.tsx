import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodaysRoutinesWidget } from '@/components/dashboard/widgets/todays-routines-widget';
import type { Routine } from '@/lib/types';
import { useGlobalState } from '@/hooks/use-global-state';

// Mock dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe('TodaysRoutinesWidget', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnComplete = jest.fn();
  const mockStartTimer = jest.fn();

  const mockRoutines: Routine[] = [
    {
      id: 'r1',
      shortId: 's1',
      title: 'Morning Routine',
      days: [0, 1, 2, 3, 4, 5, 6],
      startTime: '08:00',
      endTime: '08:30',
      priority: 'high',
    },
    {
      id: 'r2',
      shortId: 's2',
      title: 'Evening Routine',
      days: [0, 1, 2, 3, 4, 5, 6],
      startTime: '21:00',
      endTime: '21:30',
      priority: 'medium',
    },
  ];

  beforeEach(() => {
    (useGlobalState as jest.Mock).mockReturnValue({
      state: { activeItem: null },
      dispatch: jest.fn(),
      startTimer: mockStartTimer,
    });
    jest.clearAllMocks();
  });

  it('renders no routines message when there are no routines', () => {
    render(
      <TodaysRoutinesWidget
        routines={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByText('No routines for today.')).toBeInTheDocument();
  });

  it('renders a list of routines', () => {
    render(
      <TodaysRoutinesWidget
        routines={mockRoutines}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByText('Morning Routine')).toBeInTheDocument();
    expect(screen.getByText('Evening Routine')).toBeInTheDocument();
  });

  it('completes a routine when the complete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TodaysRoutinesWidget
        routines={mockRoutines}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onComplete={mockOnComplete}
      />
    );

    const completeButtons = screen.getAllByRole('button', { name: /mark as complete/i });
    await user.click(completeButtons[0]);

    expect(mockOnComplete).toHaveBeenCalledWith(mockRoutines[0]);
  });

  it('starts a timer when the start button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TodaysRoutinesWidget
        routines={mockRoutines}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onComplete={mockOnComplete}
      />
    );

    const startButtons = screen.getAllByRole('button', { name: /start/i });
    await user.click(startButtons[0]);

    expect(mockStartTimer).toHaveBeenCalledWith(mockRoutines[0]);
  });

  describe('Offline User Flows', () => {
    beforeEach(() => {
      (useGlobalState as jest.Mock).mockReturnValue({
        state: { activeItem: null, isOffline: true },
        dispatch: jest.fn(),
        startTimer: mockStartTimer,
      });
    });

    it('should complete a routine when offline', async () => {
      const user = userEvent.setup();
      render(
        <TodaysRoutinesWidget
          routines={mockRoutines}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onComplete={mockOnComplete}
        />
      );

      const completeButton = screen.getAllByRole('button', { name: /mark as complete/i })[0];
      await user.click(completeButton);

      expect(mockOnComplete).toHaveBeenCalledWith(mockRoutines[0]);
    });

    it('should start a timer when offline', async () => {
      const user = userEvent.setup();
      render(
        <TodaysRoutinesWidget
          routines={mockRoutines}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onComplete={mockOnComplete}
        />
      );

      const startButton = screen.getAllByRole('button', { name: /start/i })[0];
      await user.click(startButton);

      expect(mockStartTimer).toHaveBeenCalledWith(mockRoutines[0]);
    });
  });
});