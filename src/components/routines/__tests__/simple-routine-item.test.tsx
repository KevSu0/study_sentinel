import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { SimpleRoutineItem } from '../simple-routine-item';
import { useGlobalState } from '@/hooks/use-global-state';
import type { Routine, TaskPriority } from '@/lib/types';

// Mock dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('react-hot-toast');

const mockUseGlobalState = useGlobalState as jest.Mock;
const mockToastError = toast.error as jest.Mock;
const mockToastSuccess = toast.success as jest.Mock;

const mockRoutine: Routine = {
  id: 'routine-1',
  title: 'Morning Yoga',
  startTime: '08:00',
  endTime: '08:30',
  days: [1], // Monday
  priority: 'medium',
  shortId: 'R-1',
  description: 'A nice morning yoga session',
};

describe('SimpleRoutineItem', () => {
  const onComplete = jest.fn();
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  const startTimer = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Default mock implementation for useGlobalState
    mockUseGlobalState.mockReturnValue({
      state: { activeItem: null },
      startTimer,
    });
  });

  it('renders the routine details correctly', () => {
    render(
      <SimpleRoutineItem
        routine={mockRoutine}
        onComplete={onComplete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Morning Yoga')).toBeInTheDocument();
    expect(screen.getByText('08:00 - 08:30')).toBeInTheDocument();
  });

  it('calls onComplete with the routine when the complete button is clicked', () => {
    render(
      <SimpleRoutineItem
        routine={mockRoutine}
        onComplete={onComplete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const completeButton = screen.getByRole('button', { name: /mark as complete/i });
    fireEvent.click(completeButton);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(mockRoutine);
  });

  it('calls startTimer when the start button is clicked and no other timer is active', () => {
    render(
      <SimpleRoutineItem
        routine={mockRoutine}
        onComplete={onComplete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);

    expect(startTimer).toHaveBeenCalledTimes(1);
    expect(startTimer).toHaveBeenCalledWith(mockRoutine);
    expect(mockToastSuccess).toHaveBeenCalledWith('Timer for "Morning Yoga" is now running.');
  });

  it('disables the start button when another timer is active', () => {
    mockUseGlobalState.mockReturnValue({
      state: {
        activeItem: { type: 'task', item: { id: 'task-999', title: 'Another Task' } },
      },
      startTimer,
    });

    render(
      <SimpleRoutineItem
        routine={mockRoutine}
        onComplete={onComplete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const startButton = screen.getByRole('button', { name: /start/i });
    expect(startButton).toBeDisabled();
  });


  it('displays an active state when its own timer is running', () => {
    mockUseGlobalState.mockReturnValue({
      state: {
        activeItem: { type: 'routine', item: mockRoutine },
      },
      startTimer,
    });

    const { container } = render(
      <SimpleRoutineItem
        routine={mockRoutine}
        onComplete={onComplete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    // Check for active text and icon
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Start')).not.toBeInTheDocument();

    // Check for the visual ring indicator
    const mainDiv = container.firstChild;
    expect(mainDiv).toHaveClass('ring-2 ring-primary');
  });
});