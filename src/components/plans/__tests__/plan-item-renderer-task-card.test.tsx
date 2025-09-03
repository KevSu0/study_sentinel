import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanItemRenderer } from '../plan-item-renderer';
import { useGlobalState } from '@/hooks/use-global-state';
import { StudyTask } from '../../../types/study-task';
import { toast } from 'sonner';
// Removed canvas-confetti import as it's not needed for tests

// Mock dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('sonner');
// Removed canvas-confetti mock as it's not needed for tests
jest.mock('@/components/tasks/timer-dialog', () => ({
  TimerDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="timer-dialog">Timer Dialog</div> : null,
}));

const mockUseGlobalState = useGlobalState as jest.MockedFunction<typeof useGlobalState>;
const mockToast = toast as jest.Mocked<typeof toast>;
// Removed confetti mock as it's not needed

const mockStartTimer = jest.fn();

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

const defaultProps = {
  onEditTask: jest.fn(),
  onUpdateTask: jest.fn(),
  onPushTaskToNextDay: jest.fn(),
  onArchiveTask: jest.fn(),
  onUnarchiveTask: jest.fn(),
  subjectDate: new Date('2024-01-15'),
};

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the mock to default state before each test
  mockUseGlobalState.mockReturnValue({
    state: { activeItem: null },
    startTimer: mockStartTimer,
    updateRoutine: jest.fn(),
    updateLog: jest.fn(),
  } as any);
});

afterEach(() => {
  // Clean up DOM and reset all mocks
  cleanup();
  jest.clearAllMocks();
  mockUseGlobalState.mockReturnValue({
    state: { activeItem: null },
    startTimer: mockStartTimer,
    updateRoutine: jest.fn(),
    updateLog: jest.fn(),
  } as any);
});

describe('PlanItemRenderer (Task-Card Variant)', () => {
  it('renders task details with description and date', () => {
    render(
      <PlanItemRenderer
        item={{ type: 'task', data: mockTask }}
        variant="task-card"
        {...defaultProps}
      />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test task description')).toBeInTheDocument();
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('10 pts')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
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

  it('shows task-card specific actions in dropdown', async () => {
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

    expect(screen.getByRole('menuitem', { name: /start timer/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /mark complete/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /push to next day/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /archive/i })).toBeInTheDocument();
  });

  it('handles task completion with confetti and toast', async () => {
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
    
    const completeButton = screen.getByText('Mark Complete');
    await user.click(completeButton);

    expect(mockToast.success).toHaveBeenCalledWith('Task completed! 🎉');
    expect(defaultProps.onUpdateTask).toHaveBeenCalledWith({
      ...mockTask,
      status: 'completed',
    });
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
    expect(screen.queryByRole('menuitem', { name: /^archive$/i })).not.toBeInTheDocument();
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

  it('opens timer dialog for countdown timer type', async () => {
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

    expect(screen.getByTestId('timer-dialog')).toBeInTheDocument();
  });

  it('starts timer directly for infinity timer type', async () => {
    const infinityTask = { ...mockTask, timerType: 'infinity' as const };
    const user = userEvent.setup();
    render(
      <PlanItemRenderer
        item={{ type: 'task', data: infinityTask }}
        variant="task-card"
        {...defaultProps}
      />
    );

    const menuButton = screen.getByRole('button');
    await user.click(menuButton);
    
    const timerButton = screen.getByRole('menuitem', { name: /start timer/i });
    await user.click(timerButton);

    expect(mockStartTimer).toHaveBeenCalledWith(infinityTask);
    expect(screen.queryByTestId('timer-dialog')).not.toBeInTheDocument();
  });

  it('calls onEditTask when edit is clicked', async () => {
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
    
    const editButton = screen.getByRole('menuitem', { name: /edit/i });
    await user.click(editButton);

    expect(defaultProps.onEditTask).toHaveBeenCalledWith(mockTask);
  });

  it('calls onPushTaskToNextDay when push to next day is clicked', async () => {
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
    
    const pushButton = screen.getByRole('menuitem', { name: /push to next day/i });
    await user.click(pushButton);

    expect(defaultProps.onPushTaskToNextDay).toHaveBeenCalledWith(mockTask.id);
  });

  it('displays priority colors correctly', () => {
    const { rerender } = render(
      <PlanItemRenderer
        item={{ type: 'task', data: { ...mockTask, priority: 'high' } }}
        variant="task-card"
        {...defaultProps}
      />
    );
    expect(screen.getByText('High')).toHaveClass('text-red-500');

    rerender(
      <PlanItemRenderer
        item={{ type: 'task', data: { ...mockTask, priority: 'medium' } }}
        variant="task-card"
        {...defaultProps}
      />
    );
    expect(screen.getByText('Medium')).toHaveClass('text-yellow-500');

    rerender(
      <PlanItemRenderer
        item={{ type: 'task', data: { ...mockTask, priority: 'low' } }}
        variant="task-card"
        {...defaultProps}
      />
    );
    expect(screen.getByText('Low')).toHaveClass('text-blue-500');
  });

  it('highlights task when timer is active', () => {
    mockUseGlobalState.mockReturnValue({
      state: { activeItem: { item: { id: mockTask.id } } },
      startTimer: mockStartTimer,
      updateRoutine: jest.fn(),
      updateLog: jest.fn(),
    } as any);

    render(
      <PlanItemRenderer
        item={{ type: 'task', data: mockTask }}
        variant="task-card"
        {...defaultProps}
      />
    );

    expect(screen.getByText('Test Task')).toHaveClass('text-primary');
  });

  it('renders without description when not provided', () => {
    const taskWithoutDescription = { ...mockTask, description: undefined };
    render(
      <PlanItemRenderer
        item={{ type: 'task', data: taskWithoutDescription }}
        variant="task-card"
        {...defaultProps}
      />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.queryByText('Test task description')).not.toBeInTheDocument();
  });
});