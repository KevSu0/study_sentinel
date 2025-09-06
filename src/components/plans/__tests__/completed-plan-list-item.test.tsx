import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CompletedPlanListItem} from '../completed-plan-list-item';
import { CompletedActivity } from '@/lib/types';
import { transformToCompletedItem } from '@/lib/transformers';

const mockTaskActivity: CompletedActivity = {
    attempt: {
        id: 'attempt1',
        status: 'COMPLETED',
        templateId: 'task1',
        productiveDuration: 3665,
        points: 150,
        createdAt: 0,
        events: [
            { occurredAt: 0, type: 'CREATE' } as any,
            { occurredAt: 3665000, type: 'COMPLETE' } as any,
        ],
    } as any,
    completeEvent: { occurredAt: 3665000 } as any,
    template: {
        id: 'task1',
        title: 'Completed Task',
        status: 'completed',
        priority: 'high',
        points: 100,
    } as any,
};

const mockRoutineActivity: CompletedActivity = {
    attempt: {
        id: 'attempt2',
        status: 'COMPLETED',
        templateId: 'routine1',
        productiveDuration: 120,
        points: 25,
        createdAt: 0,
        events: [
            { occurredAt: 0, type: 'CREATE' } as any,
            { occurredAt: 120000, type: 'COMPLETE' } as any,
        ],
    } as any,
    completeEvent: { occurredAt: 120000 } as any,
    template: {
        id: 'routine1',
        title: 'Morning Routine',
        priority: 'medium',
    } as any,
};

const mockTaskItem = transformToCompletedItem(mockTaskActivity);
const mockRoutineItem = transformToCompletedItem(mockRoutineActivity);

describe('CompletedPlanListItem', () => {
  it('renders correctly for a completed task', () => {
    render(<CompletedPlanListItem item={mockTaskItem} isUndone={false} />);
    expect(screen.getByText('Completed Task')).toBeInTheDocument();
    expect(screen.getByText('1h 1m')).toBeInTheDocument(); // Formatted duration
    expect(screen.getByText('150 pts')).toBeInTheDocument();
  });

  it('renders correctly for a completed routine', () => {
    render(<CompletedPlanListItem item={mockRoutineItem} isUndone={false} />);
    expect(screen.getByText('Morning Routine')).toBeInTheDocument();
    expect(screen.getByText('2m')).toBeInTheDocument();
    expect(screen.getByText('25 pts')).toBeInTheDocument();
  });

  it('formats duration correctly for exact hours', () => {
    const itemWithExactHourActivity: CompletedActivity = {
        ...mockTaskActivity,
        attempt: {
            ...mockTaskActivity.attempt,
            events: [
                { occurredAt: 0, type: 'CREATE' } as any,
                { occurredAt: 3600000, type: 'COMPLETE' } as any,
            ],
        },
    };
    const itemWithExactHour = transformToCompletedItem(itemWithExactHourActivity);
    render(<CompletedPlanListItem item={itemWithExactHour} isUndone={false} />);
    expect(screen.getByText('1h')).toBeInTheDocument();
  });

  it('formats duration correctly for only minutes', () => {
    const itemWithMinutesActivity: CompletedActivity = {
        ...mockTaskActivity,
        attempt: {
            ...mockTaskActivity.attempt,
            events: [
                { occurredAt: 0, type: 'CREATE' } as any,
                { occurredAt: 180000, type: 'COMPLETE' } as any,
            ],
        },
    };
    const itemWithMinutes = transformToCompletedItem(itemWithMinutesActivity);
    render(<CompletedPlanListItem item={itemWithMinutes} isUndone={false} />);
    expect(screen.getByText('3m')).toBeInTheDocument();
  });

  it('formats duration correctly for only seconds', () => {
    const itemWithSecondsActivity: CompletedActivity = {
        ...mockTaskActivity,
        attempt: {
            ...mockTaskActivity.attempt,
            events: [
                { occurredAt: 0, type: 'CREATE' } as any,
                { occurredAt: 45000, type: 'COMPLETE' } as any,
            ],
        },
    };
    const itemWithSeconds = transformToCompletedItem(itemWithSecondsActivity);
    render(<CompletedPlanListItem item={itemWithSeconds} isUndone={false} />);
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('handles items with missing duration or points', () => {
    const incompleteItemActivity: CompletedActivity = {
        ...mockTaskActivity,
        attempt: {
            ...mockTaskActivity.attempt,
            productiveDuration: 0,
            points: 0,
            events: [],
        },
        template: {
            ...mockTaskActivity.template,
            title: 'Task without points',
        }
    };
    const incompleteItem = transformToCompletedItem(incompleteItemActivity);
    render(<CompletedPlanListItem item={incompleteItem} isUndone={false} />);
    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('0 pts')).toBeInTheDocument();
  });

  it('handles completed routine with missing duration or points', () => {
    const incompleteRoutineActivity: CompletedActivity = {
        ...mockRoutineActivity,
        attempt: {
            ...mockRoutineActivity.attempt,
            productiveDuration: 0,
            points: 0,
            events: [],
        },
        template: {
            ...mockRoutineActivity.template,
            title: 'Routine without points',
        }
    };
    const incompleteRoutine = transformToCompletedItem(incompleteRoutineActivity);
    render(<CompletedPlanListItem item={incompleteRoutine} isUndone={false} />);
    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('0 pts')).toBeInTheDocument();
  });

  describe('when isUndone is true', () => {
    beforeEach(() => {
      render(<CompletedPlanListItem item={mockTaskItem} isUndone={true} />);
    });

    it('applies line-through style to the title', () => {
      expect(screen.getByText('Completed Task')).toHaveClass('line-through');
    });

    it('disables the "Retry" menu item', async () => {
      await userEvent.click(screen.getByRole('button', {name: /open menu/i}));
      const undoMenuItem = screen.getByRole('menuitem', {
        name: /retry/i,
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