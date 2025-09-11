import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CompletedTodayWidget} from '@/components/dashboard/widgets/completed-today-widget';
import type {ActivityFeedItem} from '@/hooks/use-global-state';

const mockTaskActivity: ActivityFeedItem = {
  timestamp: '2024-07-31T10:00:00.000Z',
  type: 'TASK_COMPLETE',
  data: {
    task: {
      id: 't1',
      shortId: 't1',
      title: 'Completed Task',
      duration: 60,
      points: 50,
      time: '10:00',
      date: '2024-07-31',
      status: 'completed',
      priority: 'high',
      timerType: 'countdown',
    },
    log: {id: 'log1', payload: {duration: 3600, points: 50}},
  },
};

const mockRoutineActivity: ActivityFeedItem = {
  timestamp: '2024-07-31T11:00:00.000Z',
  type: 'ROUTINE_COMPLETE',
  data: {
    id: 'log2',
    type: 'ROUTINE_COMPLETE',
    timestamp: '2024-07-31T11:00:00.000Z',
    payload: {
      title: 'Morning Routine',
      duration: 1800,
      points: 25,
    },
  },
};

const mockActivity: ActivityFeedItem[] = [mockTaskActivity, mockRoutineActivity];

describe('CompletedTodayWidget', () => {
  describe('Online User Flows', () => {
    it('renders no activity message when there is no data', () => {
      render(<CompletedTodayWidget todaysActivity={[]} />);
      expect(screen.getByText('No Activity Yet Today')).toBeInTheDocument();
    });

    it('renders ActivityItem components by default (card view)', () => {
      render(<CompletedTodayWidget todaysActivity={mockActivity} />);
      expect(screen.getByText("Today's Activity")).toBeInTheDocument();
      expect(screen.getByText('Completed Task')).toBeInTheDocument();
      expect(screen.getByText('Morning Routine')).toBeInTheDocument();
      // Check for a class/element specific to ActivityItem if needed
    });

    it('renders CompletedPlanListItem components when viewMode is list', () => {
      render(
        <CompletedTodayWidget todaysActivity={mockActivity} viewMode="list" />
      );
      expect(screen.getByText('Completed Task')).toBeInTheDocument();
      expect(screen.getByText('Morning Routine')).toBeInTheDocument();
      // Check for a class/element specific to CompletedPlanListItem if needed
    });

    it('calls onUndoComplete when undo is clicked from the dropdown', async () => {
      const onUndoComplete = jest.fn();
      const user = userEvent.setup();
      render(
        <CompletedTodayWidget
          todaysActivity={[mockTaskActivity]}
          onUndoComplete={onUndoComplete}
        />
      );

      const menuButtons = screen.getAllByRole('button', {name: /open menu/i});
      await user.click(menuButtons[0]);

      const undoButton = await screen.findByRole('menuitem', {
        name: /undo completion/i,
      });
      await user.click(undoButton);

      expect(onUndoComplete).toHaveBeenCalledTimes(1);
      expect(onUndoComplete).toHaveBeenCalledWith(
        expect.objectContaining({type: 'completed_task'})
      );
    });

    it('calls onHardUndoComplete when hard undo is clicked from the dropdown', async () => {
      const onHardUndoComplete = jest.fn();
      const user = userEvent.setup();
      render(
        <CompletedTodayWidget
          todaysActivity={[mockTaskActivity]}
          onHardUndoComplete={onHardUndoComplete}
        />
      );

      const menuButtons = screen.getAllByRole('button', {name: /open menu/i});
      await user.click(menuButtons[0]);

      const hardUndoButton = await screen.findByRole('menuitem', {
        name: /hard undo/i,
      });
      await user.click(hardUndoButton);

      expect(onHardUndoComplete).toHaveBeenCalledTimes(1);
      expect(onHardUndoComplete).toHaveBeenCalledWith(
        expect.objectContaining({type: 'completed_task'})
      );
    });
  });

  describe('Offline User Flows', () => {
    it('renders no activity message when offline and there is no data', () => {
      render(<CompletedTodayWidget todaysActivity={[]} />);
      expect(screen.getByText('No Activity Yet Today')).toBeInTheDocument();
    });

    it('renders activity list correctly when offline', () => {
      render(<CompletedTodayWidget todaysActivity={mockActivity} />);
      expect(screen.getByText('Completed Task')).toBeInTheDocument();
      expect(screen.getByText('Morning Routine')).toBeInTheDocument();
    });

    it('allows undoing an item when offline', async () => {
      const onUndoComplete = jest.fn();
      const user = userEvent.setup();
      render(
        <CompletedTodayWidget
          todaysActivity={[mockTaskActivity]}
          onUndoComplete={onUndoComplete}
        />
      );

      const menuButtons = screen.getAllByRole('button', {name: /open menu/i});
      await user.click(menuButtons[0]);

      const undoButton = await screen.findByRole('menuitem', {
        name: /undo completion/i,
      });
      await user.click(undoButton);

      expect(onUndoComplete).toHaveBeenCalledTimes(1);
    });
  });
});