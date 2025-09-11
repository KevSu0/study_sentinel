import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodaysPlanWidget } from '@/components/dashboard/widgets/todays-plan-widget';
import type { StudyTask } from '@/lib/types';
import { useGlobalState } from '@/hooks/use-global-state';

// Mock dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('@/components/providers/confetti-provider', () => ({
  useConfetti: () => ({ fire: jest.fn() }),
}));
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
}));
jest.mock('@/components/tasks/timer-dialog', () => ({
  TimerDialog: jest.fn(() => null),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('TodaysPlanWidget', () => {
  const mockOnUpdate = jest.fn();
  const mockOnArchive = jest.fn();
  const mockOnUnarchive = jest.fn();
  const mockOnPushToNextDay = jest.fn();
  const mockOnEdit = jest.fn();

  const mockTasks: StudyTask[] = [
    {
      id: 't1',
      shortId: 's1',
      title: 'Test Task 1',
      date: '2024-07-31',
      status: 'todo',
      time: '10:00',
      priority: 'medium',
      duration: 30,
      timerType: 'countdown',
      description: '',
      points: 10,
    },
    {
      id: 't2',
      shortId: 's2',
      title: 'Test Task 2',
      date: '2024-07-31',
      status: 'completed',
      time: '11:00',
      priority: 'high',
      duration: 60,
      timerType: 'countdown',
      description: '',
      points: 20,
    },
  ];

  beforeEach(() => {
    (useGlobalState as jest.Mock).mockReturnValue({
      state: { activeItem: null },
      dispatch: jest.fn(),
    });
    jest.clearAllMocks();
  });

  it('renders no tasks message when there are no tasks', () => {
    render(
      <TodaysPlanWidget
        tasks={[]}
        onUpdate={mockOnUpdate}
        onArchive={mockOnArchive}
        onUnarchive={mockOnUnarchive}
        onPushToNextDay={mockOnPushToNextDay}
        onEdit={mockOnEdit}
      />
    );
    expect(screen.getByText('No tasks planned for today.')).toBeInTheDocument();
  });

  it('renders a list of tasks', () => {
    render(
      <TodaysPlanWidget
        tasks={mockTasks}
        onUpdate={mockOnUpdate}
        onArchive={mockOnArchive}
        onUnarchive={mockOnUnarchive}
        onPushToNextDay={mockOnPushToNextDay}
        onEdit={mockOnEdit}
      />
    );
    expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    expect(screen.getByText('Test Task 2')).toBeInTheDocument();
  });

  it('completes a task when the checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TodaysPlanWidget
        tasks={mockTasks}
        onUpdate={mockOnUpdate}
        onArchive={mockOnArchive}
        onUnarchive={mockOnUnarchive}
        onPushToNextDay={mockOnPushToNextDay}
        onEdit={mockOnEdit}
      />
    );

    const checkbox = screen.getByLabelText(/Mark task Test Task 1 as complete/i);
    await user.click(checkbox);

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', status: 'completed' })
    );
  });

  it('opens the edit dialog when edit is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TodaysPlanWidget
        tasks={mockTasks}
        onUpdate={mockOnUpdate}
        onArchive={mockOnArchive}
        onUnarchive={mockOnUnarchive}
        onPushToNextDay={mockOnPushToNextDay}
        onEdit={mockOnEdit}
      />
    );

    const menuButtons = screen.getAllByRole('button', { name: /more options/i });
    await user.click(menuButtons[0]);
    const editButton = await screen.findByRole('menuitem', { name: /edit/i });
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockTasks[0]);
  });

  describe('Offline User Flows', () => {
    beforeEach(() => {
      (useGlobalState as jest.Mock).mockReturnValue({
        state: { activeItem: null, isOffline: true },
        dispatch: jest.fn(),
      });
    });

    it('should complete a task when offline', async () => {
      const user = userEvent.setup();
      render(
        <TodaysPlanWidget
          tasks={mockTasks}
          onUpdate={mockOnUpdate}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
          onPushToNextDay={mockOnPushToNextDay}
          onEdit={mockOnEdit}
        />
      );

      const checkbox = screen.getByLabelText(/Mark task Test Task 1 as complete/i);
      await user.click(checkbox);

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 't1', status: 'completed' })
      );
    });

    it('should allow editing a task when offline', async () => {
      const user = userEvent.setup();
      render(
        <TodaysPlanWidget
          tasks={mockTasks}
          onUpdate={mockOnUpdate}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
          onPushToNextDay={mockOnPushToNextDay}
          onEdit={mockOnEdit}
        />
      );

      const menuButton = screen.getAllByRole('button', { name: /more options/i })[0];
      await user.click(menuButton);
      const editButton = await screen.findByRole('menuitem', { name: /edit/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockTasks[0]);
    });

    it('should archive a task when offline', async () => {
      const user = userEvent.setup();
      render(
        <TodaysPlanWidget
          tasks={mockTasks}
          onUpdate={mockOnUpdate}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
          onPushToNextDay={mockOnPushToNextDay}
          onEdit={mockOnEdit}
        />
      );

      const menuButton = screen.getAllByRole('button', { name: /more options/i })[0];
      await user.click(menuButton);
      const archiveButton = await screen.findByRole('menuitem', { name: /archive/i });
      await user.click(archiveButton);

      expect(mockOnArchive).toHaveBeenCalledWith('t1');
    });
  });
});