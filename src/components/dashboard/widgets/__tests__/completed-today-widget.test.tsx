import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {CompletedTodayWidget} from '../completed-today-widget';
import {ActivityFeedItem} from '@/hooks/use-global-state';
import {TaskViewMode} from '@/hooks/use-view-mode';
import { CompletedPlanListItem } from '@/components/plans/completed-plan-list-item';
import { ActivityItem } from '@/components/dashboard/activity/activity-item';

// Mock child components to isolate the widget
jest.mock('@/components/plans/completed-plan-list-item', () => ({
  CompletedPlanListItem: jest.fn(({item, onUndo, onDelete, isUndone}) => (
    <div data-testid="completed-plan-list-item" data-undone={isUndone}>
      {item.type}
      <button onClick={onUndo}>Retry</button>
      <button onClick={onDelete}>Delete Log</button>
    </div>
  )),
}));

jest.mock('@/components/dashboard/activity/activity-item', () => ({
  ActivityItem: jest.fn(({item, onUndo, onDelete, isUndone}) => (
    <div data-testid="activity-item" data-undone={isUndone}>
      {item.type}
      <button onClick={onUndo}>Retry</button>
      <button onClick={onDelete}>Delete Log</button>
    </div>
  )),
}));

const mockTaskActivity: ActivityFeedItem = {
  type: 'TASK_COMPLETE',
  timestamp: new Date().toISOString(),
  data: {
    task: {id: 'task1', title: 'Test Task', status: 'completed'},
    log: {id: 'log1'},
  },
};

const mockRoutineActivity: ActivityFeedItem = {
  type: 'ROUTINE_COMPLETE',
  timestamp: new Date().toISOString(),
  data: {id: 'routine1', name: 'Test Routine', isUndone: false},
};

describe('CompletedTodayWidget', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the empty state when there is no activity', () => {
    render(<CompletedTodayWidget todaysActivity={[]} />);
    expect(screen.getByText('No Activity Yet Today')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Your completed tasks and routines will appear here/
      )
    ).toBeInTheDocument();
  });

  it('should render the list of activities', () => {
    render(
      <CompletedTodayWidget
        todaysActivity={[mockTaskActivity, mockRoutineActivity]}
      />
    );
    expect(screen.getByText("Today's Activity")).toBeInTheDocument();
    expect(screen.getAllByTestId('activity-item')).toHaveLength(2);
  });

  it('should render ActivityItem components by default (card view)', () => {
    render(<CompletedTodayWidget todaysActivity={[mockTaskActivity]} />);
    expect(screen.getByTestId('activity-item')).toBeInTheDocument();
    expect(
      screen.queryByTestId('completed-plan-list-item')
    ).not.toBeInTheDocument();
  });

  it('should render CompletedPlanListItem components for list view', () => {
    render(
      <CompletedTodayWidget
        todaysActivity={[mockTaskActivity]}
        viewMode="list"
      />
    );
    expect(screen.getByTestId('completed-plan-list-item')).toBeInTheDocument();
    expect(screen.queryByTestId('activity-item')).not.toBeInTheDocument();
  });

  it('should call onUndoComplete with transformed item when undo is clicked', () => {
    const onUndoComplete = jest.fn();
    render(
      <CompletedTodayWidget
        todaysActivity={[mockTaskActivity]}
        onUndoComplete={onUndoComplete}
      />
    );

    fireEvent.click(screen.getByText('Retry'));

    expect(onUndoComplete).toHaveBeenCalledTimes(1);
    expect(onUndoComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'completed_task',
        logId: 'log1',
      })
    );
  });

  it('should use task.id as fallback for logId if log is missing', () => {
    const onUndoComplete = jest.fn();
    const taskWithoutLog: ActivityFeedItem = {
        ...mockTaskActivity,
        data: { task: {id: 'task1', title: 'Test Task', status: 'completed'}, log: null }
    };
    render(
      <CompletedTodayWidget
        todaysActivity={[taskWithoutLog]}
        onUndoComplete={onUndoComplete}
      />
    );

    fireEvent.click(screen.getByText('Retry'));

    expect(onUndoComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        logId: 'task1',
      })
    );
  });

  it('should call onDeleteComplete with transformed item when delete is clicked', () => {
    const onDeleteComplete = jest.fn();
    render(
      <CompletedTodayWidget
        todaysActivity={[mockRoutineActivity]}
        onDeleteComplete={onDeleteComplete}
      />
    );

    fireEvent.click(screen.getByText('Delete Log'));

    expect(onDeleteComplete).toHaveBeenCalledTimes(1);
    expect(onHardUndoComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'completed_routine',
      })
    );
  });

  it('should not throw error if undo callbacks are not provided', () => {
    render(<CompletedTodayWidget todaysActivity={[mockTaskActivity]} />);
    const undoButton = screen.getByText('Retry');
    const hardUndoButton = screen.getByText('Delete Log');

    expect(() => fireEvent.click(undoButton)).not.toThrow();
    expect(() => fireEvent.click(hardUndoButton)).not.toThrow();
  });

  it('should not call undo callbacks for unhandled activity types', () => {
    const onUndoComplete = jest.fn();
    const onHardUndoComplete = jest.fn();
    const unhandledActivity: ActivityFeedItem = {
      type: 'TASK_STOPPED', // This type is not handled by transformToPlanItem
      timestamp: new Date().toISOString(),
      data: { id: 'stopped1' },
    };

    render(
      <CompletedTodayWidget
        todaysActivity={[unhandledActivity]}
        onUndoComplete={onUndoComplete}
        onHardUndoComplete={onHardUndoComplete}
      />
    );

    // The mock child component will render the buttons, allowing us to test the handler
    fireEvent.click(screen.getByText('Retry'));
    fireEvent.click(screen.getByText('Delete Log'));

    // The callbacks should not be called because transformToPlanItem returns null
    expect(onUndoComplete).not.toHaveBeenCalled();
    expect(onHardUndoComplete).not.toHaveBeenCalled();
  });

  describe('isUndone state', () => {
    it('should pass isUndone=true for a task that is no longer completed', () => {
        const undoneTaskActivity: ActivityFeedItem = {
            ...mockTaskActivity,
            data: { ...mockTaskActivity.data, task: { ...mockTaskActivity.data.task, status: 'todo' } }
        };
        render(<CompletedTodayWidget todaysActivity={[undoneTaskActivity]} />);
        expect(screen.getByTestId('activity-item')).toHaveAttribute('data-undone', 'true');
    });

    it('should pass isUndone=true for a routine that has been undone', () => {
        const undoneRoutineActivity: ActivityFeedItem = {
            ...mockRoutineActivity,
            data: { ...mockRoutineActivity.data, isUndone: true }
        };
        render(<CompletedTodayWidget todaysActivity={[undoneRoutineActivity]} />);
        expect(screen.getByTestId('activity-item')).toHaveAttribute('data-undone', 'true');
    });

    it('should pass isUndone=false for a normally completed item', () => {
        render(<CompletedTodayWidget todaysActivity={[mockTaskActivity]} />);
        expect(screen.getByTestId('activity-item')).toHaveAttribute('data-undone', 'false');
    });
  });

  it('should generate a key using the index as a fallback', () => {
    const activityWithNoId: ActivityFeedItem = {
        type: 'ROUTINE_COMPLETE',
        timestamp: new Date().toISOString(),
        data: {}, // No id properties
    };
    // This test just ensures that rendering does not crash due to a missing key.
    // The mock component doesn't expose the key, so we can't assert it directly.
    expect(() => render(<CompletedTodayWidget todaysActivity={[activityWithNoId]} />)).not.toThrow();
    expect(screen.getByTestId('activity-item')).toBeInTheDocument();
  });

  describe('List View Callbacks', () => {
    it('should call onUndoComplete from list view', () => {
        const onUndoComplete = jest.fn();
        render(
          <CompletedTodayWidget
            todaysActivity={[mockTaskActivity]}
            onUndoComplete={onUndoComplete}
            viewMode="list"
          />
        );
    
        fireEvent.click(screen.getByText('Retry'));
        expect(onUndoComplete).toHaveBeenCalledTimes(1);
    });

    it('should call onDeleteComplete from list view', () => {
        const onDeleteComplete = jest.fn();
        render(
            <CompletedTodayWidget
                todaysActivity={[mockTaskActivity]}
                onDeleteComplete={onDeleteComplete}
                viewMode="list"
            />
        );

        fireEvent.click(screen.getByText('Delete Log'));
        expect(onDeleteComplete).toHaveBeenCalledTimes(1);
    });
  });
});