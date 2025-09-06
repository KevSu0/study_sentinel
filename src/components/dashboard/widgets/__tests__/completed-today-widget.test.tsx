import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {CompletedTodayWidget} from '../completed-today-widget';
import { CompletedWork } from '@/lib/types';

// Mock child components to isolate the widget
jest.mock('@/components/plans/completed-plan-list-item', () => ({
  CompletedPlanListItem: jest.fn(({item, onUndo, onDelete, isUndone}) => (
    <div data-testid="completed-plan-list-item" data-undone={isUndone}>
      {item.title}
      <button onClick={onUndo}>Retry</button>
      <button onClick={onDelete}>Delete Log</button>
    </div>
  )),
}));

jest.mock('@/components/dashboard/activity/activity-item', () => ({
  ActivityItem: jest.fn(({item, onUndo, onDelete, isUndone}) => (
    <div data-testid="activity-item" data-undone={isUndone}>
      {item.title}
      <button onClick={onUndo}>Retry</button>
      <button onClick={onDelete}>Delete Log</button>
    </div>
  )),
}));

const mockTask: CompletedWork = {
  date: '2024-01-01',
  duration: 1200,
  pausedDuration: 120,
  type: 'task',
  title: 'Test Task',
  points: 100,
  timestamp: '2024-01-01T10:00:00Z',
};

const mockRoutine: CompletedWork = {
  date: '2024-01-01',
  duration: 1800,
  type: 'routine',
  title: 'Test Routine',
  points: 150,
  timestamp: '2024-01-01T11:00:00Z',
};

describe('CompletedTodayWidget', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the empty state when there is no activity', () => {
    render(<CompletedTodayWidget todaysCompletedActivities={[]} />);
    expect(screen.getByText('No Activity Yet Today')).toBeInTheDocument();
  });

  it('should render the list of activities', () => {
    render(
      <CompletedTodayWidget
        todaysCompletedActivities={[mockTask, mockRoutine]}
      />
    );
    expect(screen.getByText("Today's Activity")).toBeInTheDocument();
    expect(screen.getAllByTestId('activity-item')).toHaveLength(2);
  });

  it('should render ActivityItem components by default (card view)', () => {
    render(<CompletedTodayWidget todaysCompletedActivities={[mockTask]} />);
    expect(screen.getByTestId('activity-item')).toBeInTheDocument();
    expect(screen.queryByTestId('completed-plan-list-item')).not.toBeInTheDocument();
  });

  it('should render CompletedPlanListItem components for list view', () => {
    render(
      <CompletedTodayWidget
        todaysCompletedActivities={[mockTask]}
        viewMode="list"
      />
    );
    expect(screen.getByTestId('completed-plan-list-item')).toBeInTheDocument();
    expect(screen.queryByTestId('activity-item')).not.toBeInTheDocument();
  });

  it('should call onUndoComplete when undo is clicked', () => {
    const onUndoComplete = jest.fn();
    render(
      <CompletedTodayWidget
        todaysCompletedActivities={[mockTask]}
        onUndoComplete={onUndoComplete}
      />
    );

    fireEvent.click(screen.getByText('Retry'));

    expect(onUndoComplete).toHaveBeenCalledTimes(1);
    expect(onUndoComplete).toHaveBeenCalledWith(mockTask);
  });

  it('should call onDeleteComplete when delete is clicked', () => {
    const onDeleteComplete = jest.fn();
    render(
      <CompletedTodayWidget
        todaysCompletedActivities={[mockRoutine]}
        onDeleteComplete={onDeleteComplete}
      />
    );

    fireEvent.click(screen.getByText('Delete Log'));

    expect(onDeleteComplete).toHaveBeenCalledTimes(1);
    expect(onDeleteComplete).toHaveBeenCalledWith(mockRoutine);
  });

  it('should pass isUndone=true for an undone item', () => {
    const undoneTask: CompletedWork = { ...mockTask, isUndone: true };
    render(<CompletedTodayWidget todaysCompletedActivities={[undoneTask]} />);
    expect(screen.getByTestId('activity-item')).toHaveAttribute('data-undone', 'true');
  });

  it('should pass isUndone=false for a completed item', () => {
    render(<CompletedTodayWidget todaysCompletedActivities={[mockTask]} />);
    expect(screen.getByTestId('activity-item')).toHaveAttribute('data-undone', 'false');
  });
});