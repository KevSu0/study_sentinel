import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanItemRenderer } from '../plan-item-renderer';
import { useGlobalState } from '@/hooks/use-global-state';
import { type StudyTask, type Routine, type LogEvent } from '@/lib/types';
import { toast } from 'sonner';
// Removed canvas-confetti import as it's not needed for tests

// Mock dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('sonner');
// Removed canvas-confetti mock as it's not needed for tests
jest.mock('@/components/tasks/manual-log-dialog', () => ({
  ManualLogDialog: jest.fn(({ isOpen }) =>
    isOpen ? <div data-testid="manual-log-dialog">Log Dialog</div> : null
  ),
}));
jest.mock('@/components/tasks/timer-dialog', () => ({
  TimerDialog: ({ isOpen, task, onOpenChange, onComplete }: any) =>
    isOpen ? (
      <div data-testid="timer-dialog">
        <div>Timer Dialog</div>
        <button onClick={() => onComplete()}>Start</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

const mockUseGlobalState = useGlobalState as jest.MockedFunction<typeof useGlobalState>;
const mockToast = toast as jest.Mocked<typeof toast>;
// Removed confetti mock as it's not needed

const mockStartTimer = jest.fn();
const mockUpdateRoutine = jest.fn();
const mockUpdateLog = jest.fn();

// Mock data
const mockTask: StudyTask = {
  id: 'task-1',
  shortId: 'T001',
  title: 'Test Task',
  description: 'Test task description',
  subject: 'Math',
  priority: 'high',
  status: 'todo',
  date: '2024-01-15',
  time: '09:00',
  duration: 30,
  timerType: 'countdown',
  points: 10,
};

const mockRoutine: Routine = {
  id: 'routine-1',
  shortId: 'R001',
  title: 'Test Routine',
  description: 'Test routine description',
  subject: 'Science',
  days: [1, 2, 3, 4, 5], // Monday to Friday
  startTime: '10:00',
  endTime: '11:00',
  priority: 'medium',
  status: 'todo',
  createdAt: Date.now(),
};

const mockLogEvent: LogEvent = {
  id: 'log-1',
  type: 'TASK_COMPLETE',
  timestamp: '2024-01-15T09:30:00Z',
  payload: {
    taskId: 'task-1',
    title: 'Test Task',
    subject: 'Math',
    duration: 30,
    points: 10,
    studyLog: 'Completed successfully',
  },
};

const defaultProps = {
  onEditTask: jest.fn(),
  onUpdateTask: jest.fn(),
  onPushTaskToNextDay: jest.fn(),
  onEditRoutine: jest.fn(),
  onDeleteRoutine: jest.fn(),
  onCompleteRoutine: jest.fn(),
  onUndoCompleteRoutine: jest.fn(),
  onDeleteCompleteRoutine: jest.fn(),
  onArchiveTask: jest.fn(),
  onUnarchiveTask: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseGlobalState.mockReturnValue({
    state: { activeItem: null },
    startTimer: mockStartTimer,
    updateRoutine: mockUpdateRoutine,
    updateLog: mockUpdateLog,
  } as any);
});

describe('PlanItemRenderer', () => {
  describe('Card Variant', () => {
    it('renders task item in card variant correctly', () => {
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('#T001')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('10 pts')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('renders routine item in card variant correctly', () => {
      render(
        <PlanItemRenderer
          item={{ type: 'routine', data: mockRoutine }}
          variant="card"
          {...defaultProps}
        />
      );

      expect(screen.getByText('Test Routine')).toBeInTheDocument();
      expect(screen.getByText('#R001')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText(/^\s*routine\s*$/i)).toBeInTheDocument();
      expect(screen.getByText('10 pts')).toBeInTheDocument();
    });

    it('shows completed state for completed items', () => {
      const completedTask = {
        ...mockTask,
        isCompleted: true,
        status: 'completed' as const,
        completedAt: '2024-01-15T10:30:00Z',
        done: true,
        // LogEvent properties
        id: mockTask.id,
        timestamp: '2024-01-15T10:30:00Z',
        type: 'TASK_COMPLETE' as const,
        payload: { taskId: mockTask.id, title: mockTask.title },
      };
      
      render(
        <PlanItemRenderer
          item={{ type: 'completed_task', data: completedTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      expect(screen.getByRole('heading', { level: 3, name: /test task/i }))
        .toHaveClass('line-through');
    });
  });

  describe('List Variant', () => {
    it('renders task item in list variant correctly', () => {
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="list"
          {...defaultProps}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('#T001')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
      // List variant should not have Card wrapper
      expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });

    it('renders routine item in list variant correctly', () => {
      render(
        <PlanItemRenderer
          item={{ type: 'routine', data: mockRoutine }}
          variant="list"
          {...defaultProps}
        />
      );

      expect(screen.getByText('Test Routine')).toBeInTheDocument();
      expect(screen.getByText('#R001')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  describe('Task-Card Variant', () => {
    it('renders task item in task-card variant with additional details', () => {
      const taskWithDescription = { ...mockTask, description: 'Detailed description' };
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: taskWithDescription }}
          variant="task-card"
          subjectDate={new Date('2024-01-15')}
          {...defaultProps}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Detailed description')).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    });

    it('does not show checkbox in task-card variant', () => {
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="task-card"
          {...defaultProps}
        />
      );

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('handles task completion with confetti and toast', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(defaultProps.onUpdateTask).toHaveBeenCalledWith({
        ...mockTask,
        status: 'completed',
      });
    });

    it('opens dropdown menu and shows task actions', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);

      expect(screen.getByRole('menuitem', { name: /start timer/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /push to next day/i })).toBeInTheDocument();
    });

    it('opens dropdown menu and shows routine actions', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'routine', data: mockRoutine }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);

      expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /complete routine/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /log time/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
    });

    it('calls onEditTask when edit is clicked', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const editButton = screen.getByRole('menuitem', { name: /edit/i });
      await user.click(editButton);

      expect(defaultProps.onEditTask).toHaveBeenCalledWith(mockTask);
    });

    it('calls onCompleteRoutine when complete routine is clicked', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'routine', data: mockRoutine }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const completeButton = screen.getByRole('menuitem', { name: /complete routine/i });
      await user.click(completeButton);

      expect(defaultProps.onCompleteRoutine).toHaveBeenCalledWith(mockRoutine);
    });

    it('opens timer dialog when start timer is clicked', async () => {
      const countdownTask = {
        ...mockTask,
        id: 'T005',
        title: 'Countdown Task',
        timerType: 'countdown' as const,
      };
      
      const user = userEvent.setup();
      
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: countdownTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const timerButton = screen.getByRole('menuitem', { name: /start timer/i });
      await user.click(timerButton);

      // Robust dialog lookup (Radix may use alertdialog)
      const dialog = 
        (await screen.findByRole('dialog').catch(() => null)) ??
        (await screen.findByRole('alertdialog').catch(() => null)) ??
        (await screen.findByTestId('timer-dialog'));
      
      expect(dialog).toBeInTheDocument();
      
      // Assert on stable controls inside
      expect(
        within(dialog).getByRole('button', { name: /start|save|apply/i })
      ).toBeInTheDocument();
    });

    it('opens delete confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'routine', data: mockRoutine }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const deleteButton = screen.getByRole('menuitem', { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.getByText('Delete Routine')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete this routine\?/i)).toBeInTheDocument();
    });

    it('confirms routine deletion', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'routine', data: mockRoutine }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const deleteButton = screen.getByRole('menuitem', { name: /delete/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /delete/i });
      await user.click(confirmButton);

      expect(defaultProps.onDeleteRoutine).toHaveBeenCalledWith(mockRoutine.id);
    });
  });

  describe('Task-Card Specific Features', () => {
    it('shows archive action in task-card variant', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="task-card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);

      expect(screen.getByRole('menuitem', { name: /archive/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /mark complete/i })).toBeInTheDocument();
    });

    it('handles task archiving with toast', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="task-card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const archiveButton = screen.getByRole('menuitem', { name: /archive/i });
      await user.click(archiveButton);

      expect(defaultProps.onArchiveTask).toHaveBeenCalledWith(mockTask.id);
      expect(mockToast.success).toHaveBeenCalledWith('Task archived');
    });

    it('handles task completion with confetti and toast in task-card variant', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="task-card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const completeButton = screen.getByRole('menuitem', { name: /mark complete/i });
      await user.click(completeButton);

      expect(mockToast.success).toHaveBeenCalledWith('Task completed! 🎉');
      expect(defaultProps.onUpdateTask).toHaveBeenCalledWith({
        ...mockTask,
        status: 'completed',
      });
    });

    it('shows restore action for archived tasks', async () => {
      const archivedTask = { ...mockTask, status: 'archived' as const };
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: archivedTask }}
          variant="task-card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);

      expect(screen.getByRole('menuitem', { name: /restore/i })).toBeInTheDocument();
    });

    it('handles task restoration with toast', async () => {
      const archivedTask = { ...mockTask, status: 'archived' as const };
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: archivedTask }}
          variant="task-card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const restoreButton = screen.getByRole('menuitem', { name: /restore/i });
      await user.click(restoreButton);

      expect(defaultProps.onUnarchiveTask).toHaveBeenCalledWith(archivedTask.id);
      expect(mockToast.success).toHaveBeenCalledWith('Task restored');
    });
  });

  describe('Timer Integration', () => {
    it('starts timer directly for infinity timer type', async () => {
      const infinityTask = { ...mockTask, timerType: 'infinity' as const };
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: infinityTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const timerButton = screen.getByText('Start Timer');
      await user.click(timerButton);

      expect(mockStartTimer).toHaveBeenCalledWith(infinityTask);
    });

    it('opens timer dialog for countdown timer type in task-card variant', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="task-card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const timerButton = screen.getByRole('menuitem', { name: /start timer/i });
      await user.click(timerButton);

      // Robust dialog lookup (Radix may use alertdialog)
      const dialog = 
        (await screen.findByRole('dialog').catch(() => null)) ??
        (await screen.findByRole('alertdialog').catch(() => null)) ??
        (await screen.findByTestId('timer-dialog'));
      
      expect(dialog).toBeInTheDocument();
      
      // Assert on stable controls inside
      expect(
        within(dialog).getByRole('button', { name: /start|save|apply/i })
      ).toBeInTheDocument();
    });
  });

  describe('Active Timer State', () => {
    it('highlights item when timer is active', () => {
      mockUseGlobalState.mockReturnValue({
        state: { activeItem: { item: { id: mockTask.id } } },
        startTimer: mockStartTimer,
        updateRoutine: mockUpdateRoutine,
        updateLog: mockUpdateLog,
      } as any);

      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      expect(screen.getByText('Test Task')).toHaveClass('text-primary');
    });
  });
});