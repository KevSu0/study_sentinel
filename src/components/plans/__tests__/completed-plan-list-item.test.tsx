import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CompletedPlanListItem} from '../completed-plan-list-item';
import {ActivityFeedItem} from '@/hooks/use-global-state';

const mockTaskItem: ActivityFeedItem = {
  type: 'TASK_COMPLETE',
  timestamp: new Date().toISOString(),
  data: {
    task: {id: 'task1', title: 'Completed Task'},
    log: {
      id: 'log1',
      payload: {duration: 3665, points: 150}, // 1h 1m 5s
    },
  },
};

const mockRoutineItem: ActivityFeedItem = {
  type: 'ROUTINE_COMPLETE',
  timestamp: new Date().toISOString(),
  data: {
    id: 'routine1',
    payload: {
      title: 'Morning Routine',
      duration: 120, // 2m
      points: 25,
    },
  },
};

describe('CompletedPlanListItem', () => {
  it('renders correctly for a completed task', () => {
    render(<CompletedPlanListItem item={mockTaskItem} isUndone={false} />);
    expect(screen.getByText('Completed Task')).toBeInTheDocument();
    expect(screen.getByText('1h 1m')).toBeInTheDocument(); // Formatted duration
    expect(screen.getByText('150 pts')).toBeInTheDocument();
    expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
  });

  it('renders correctly for a completed routine', () => {
    render(<CompletedPlanListItem item={mockRoutineItem} isUndone={false} />);
    expect(screen.getByText('Morning Routine')).toBeInTheDocument();
    expect(screen.getByText('2m')).toBeInTheDocument();
    expect(screen.getByText('25 pts')).toBeInTheDocument();
  });

  it('formats duration correctly for exact hours', () => {
    const itemWithExactHour: ActivityFeedItem = {
      ...mockTaskItem,
      data: {
        ...mockTaskItem.data,
        log: {
          id: 'log2',
          payload: { duration: 3600, points: 100 }, // Exactly 1 hour
        },
      },
    };
    render(<CompletedPlanListItem item={itemWithExactHour} isUndone={false} />);
    expect(screen.getByText('1h')).toBeInTheDocument();
  });

  it('formats duration correctly for only minutes', () => {
    const itemWithMinutes: ActivityFeedItem = {
      ...mockTaskItem,
      data: {
        ...mockTaskItem.data,
        log: {
          id: 'log3',
          payload: { duration: 180, points: 10 }, // 3 minutes
        },
      },
    };
    render(<CompletedPlanListItem item={itemWithMinutes} isUndone={false} />);
    expect(screen.getByText('3m')).toBeInTheDocument();
  });

  it('formats duration correctly for only seconds', () => {
    const itemWithSeconds: ActivityFeedItem = {
      ...mockTaskItem,
      data: {
        ...mockTaskItem.data,
        log: {
          id: 'log4',
          payload: { duration: 45, points: 5 }, // 45 seconds
        },
      },
    };
    render(<CompletedPlanListItem item={itemWithSeconds} isUndone={false} />);
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('handles items with missing duration or points', () => {
    const incompleteItem: ActivityFeedItem = {
      type: 'TASK_COMPLETE',
      timestamp: new Date().toISOString(),
      data: {task: {id: 'task2', title: 'Task without points'}},
    };
    render(<CompletedPlanListItem item={incompleteItem} isUndone={false} />);
    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('0 pts')).toBeInTheDocument();
  });

  it('handles completed routine with missing duration or points', () => {
    const incompleteRoutine: ActivityFeedItem = {
      type: 'ROUTINE_COMPLETE',
      timestamp: new Date().toISOString(),
      data: {
        id: 'routine2',
        payload: {
          title: 'Routine without points',
        },
      },
    };
    render(<CompletedPlanListItem item={incompleteRoutine} isUndone={false} />);
    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('0 pts')).toBeInTheDocument();
  });

  describe('when isUndone is true', () => {
    beforeEach(() => {
      render(<CompletedPlanListItem item={mockTaskItem} isUndone={true} />);
    });

    it('shows the Undo icon', () => {
      expect(screen.getByTestId('UndoIcon')).toBeInTheDocument();
      expect(screen.queryByTestId('CheckCircleIcon')).not.toBeInTheDocument();
    });

    it('applies line-through style to the title', () => {
      expect(screen.getByText('Completed Task')).toHaveClass('line-through');
    });

    it('disables the "Retry" menu item', async () => {
      await userEvent.click(screen.getByRole('button', {name: /open menu/i}));
      const undoMenuItem = screen.getByRole('menuitem', {
        name: /undo completion/i,
      });
      expect(undoMenuItem).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('user interactions', () => {
    const onUndo = jest.fn();
    const onDelete = jest.fn();

    beforeEach(() => {
      onUndo.mockClear();
      onDelete.mockClear();
      render(
        <CompletedPlanListItem
          item={mockTaskItem}
          isUndone={false}
          onUndo={onUndo}
          onDelete={onDelete}
        />
      );
    });

    it('calls onUndo when "Retry" is clicked', async () => {
      await userEvent.click(screen.getByRole('button', {name: /open menu/i}));
      await userEvent.click(
        screen.getByRole('menuitem', {name: /retry/i})
      );
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when "Delete Log" is clicked', async () => {
      await userEvent.click(screen.getByRole('button', {name: /open menu/i}));
      await userEvent.click(
        screen.getByRole('menuitem', {name: /delete log/i})
      );
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  it('does not throw error if callbacks are not provided', async () => {
    render(<CompletedPlanListItem item={mockTaskItem} isUndone={false} />);
    await userEvent.click(screen.getByRole('button', {name: /open menu/i}));
    const undoButton = screen.getByRole('menuitem', {name: /retry/i});
    const hardUndoButton = screen.getByRole('menuitem', {name: /delete log/i});

    expect(() => userEvent.click(undoButton)).not.toThrow();
    expect(() => userEvent.click(hardUndoButton)).not.toThrow();
  });
});

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  CheckCircle: () => <div data-testid="CheckCircleIcon" />,
  Undo: () => <div data-testid="UndoIcon" />,
  MoreHorizontal: () => <div>More</div>,
  Timer: () => <div>Timer</div>,
  Star: () => <div>Star</div>,
}));