import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityItem } from '../activity-item';
import type { ActivityFeedItem } from '@/hooks/use-global-state';
import type { StudyTask } from '@/lib/types';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  CheckCircle: () => <svg data-testid="CheckCircleIcon" />,
  Timer: () => <svg data-testid="TimerIcon" />,
  Star: () => <svg data-testid="StarIcon" />,
  XCircle: () => <svg data-testid="XCircleIcon" />,
  AlertTriangle: () => <svg data-testid="AlertTriangleIcon" />,
  BookText: () => <svg data-testid="BookTextIcon" />,
  Clock: () => <svg data-testid="ClockIcon" />,
  Undo: () => <svg data-testid="UndoIcon" />,
  MoreHorizontal: () => <svg data-testid="MoreHorizontalIcon" />,
}));

const mockTask: StudyTask = {
  id: 't1',
  shortId: 't1',
  title: 'Test Task',
  time: '10:00',
  date: '2024-01-01',
  points: 100,
  status: 'completed',
  priority: 'high',
  timerType: 'countdown',
  duration: 60, // 60 minutes
};

const baseItem: Pick<ActivityFeedItem, 'timestamp'> = {
  timestamp: '2024-01-01T10:30:00.000Z',
};

const defaultProps = {
  onUndo: jest.fn(),
  onDelete: jest.fn(),
  isUndone: false,
};

describe('ActivityItem', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('TASK_COMPLETE Event', () => {
    const taskCompleteItem: ActivityFeedItem = {
      ...baseItem,
      type: 'TASK_COMPLETE',
      data: { task: mockTask, log: { id: 'l1', payload: { duration: 3000, points: 150 } } },
    };

    it('renders correctly with log data', () => {
      render(<ActivityItem {...defaultProps} item={taskCompleteItem} />);
      expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      expect(screen.getByText(/Completed \(50m\)/)).toBeInTheDocument();
      expect(screen.getByText(/150 pts/)).toBeInTheDocument();
      expect(screen.getByText(/high priority/i)).toBeInTheDocument();
      expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
    });

    it('renders correctly using task data as fallback if log is null', () => {
      const itemWithoutLog = { ...taskCompleteItem, data: { task: mockTask, log: null } };
      render(<ActivityItem {...defaultProps} item={itemWithoutLog} />);
      expect(screen.getByText(/Completed \(1h\)/)).toBeInTheDocument(); // from task.duration
      expect(screen.getByText(/100 pts/)).toBeInTheDocument(); // from task.points
    });

    it('handles task with no duration specified', () => {
        const taskWithoutDuration = { ...mockTask, duration: undefined };
        const item = { ...taskCompleteItem, data: { task: taskWithoutDuration, log: null } };
        render(<ActivityItem {...defaultProps} item={item} />);
        expect(screen.getByText(/Completed \(0s\)/)).toBeInTheDocument();
    });

    it('formats duration with hours and minutes correctly', () => {
        const itemWithHoursAndMinutes = {
          ...taskCompleteItem,
          data: {
            task: mockTask,
            log: { id: 'l1', payload: { duration: 5400, points: 150 } }, // 1h 30m
          },
        };
        render(<ActivityItem {...defaultProps} item={itemWithHoursAndMinutes} />);
        expect(screen.getByText(/Completed \(1h 30m\)/)).toBeInTheDocument();
      });
    
    it('formats duration with only hours correctly', () => {
        const itemWithHours = {
            ...taskCompleteItem,
            data: {
            task: mockTask,
            log: { id: 'l1', payload: { duration: 3600, points: 150 } }, // 1h
            },
        };
        render(<ActivityItem {...defaultProps} item={itemWithHours} />);
        expect(screen.getByText(/Completed \(1h\)/)).toBeInTheDocument();
    });

    it('renders in an "undone" state', async () => {
      const user = userEvent.setup();
      render(<ActivityItem {...defaultProps} item={taskCompleteItem} isUndone={true} />);
      expect(screen.getByTestId('UndoIcon')).toBeInTheDocument();
      expect(screen.getByText(mockTask.title)).toHaveClass('text-muted-foreground');
      
      await user.click(screen.getByTestId('MoreHorizontalIcon').closest('button')!);
      const undoButton = await screen.findByRole('menuitem', { name: 'Retry' });
      expect(undoButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('ROUTINE_COMPLETE Event', () => {
    const routineCompleteItem: ActivityFeedItem = {
      ...baseItem,
      type: 'ROUTINE_COMPLETE',
      data: {
        id: 'l2',
        payload: {
          title: 'Morning Routine',
          duration: 1800,
          points: 50,
          studyLog: 'Reviewed flashcards.',
        },
      },
    };

    it('renders correctly with a study log', () => {
      render(<ActivityItem {...defaultProps} item={routineCompleteItem} />);
      expect(screen.getByText('Morning Routine')).toBeInTheDocument();
      expect(screen.getByText(/Studied for 30m/)).toBeInTheDocument();
      expect(screen.getByText(/50 pts earned/)).toBeInTheDocument();
      expect(screen.getByText('Reviewed flashcards.')).toBeInTheDocument();
      expect(screen.getByTestId('BookTextIcon')).toBeInTheDocument();
    });

    it('renders correctly without a study log', () => {
      const itemWithoutLog = { ...routineCompleteItem, data: { ...routineCompleteItem.data, payload: { ...routineCompleteItem.data.payload, studyLog: null } } };
      render(<ActivityItem {...defaultProps} item={itemWithoutLog} />);
      expect(screen.queryByTestId('BookTextIcon')).not.toBeInTheDocument();
    });

    it('handles routine with no duration or points', () => {
        const itemWithoutData = { ...routineCompleteItem, data: { ...routineCompleteItem.data, payload: { title: 'Basic Routine' } } };
        render(<ActivityItem {...defaultProps} item={itemWithoutData} />);
        expect(screen.getByText(/Studied for 0s/)).toBeInTheDocument();
        expect(screen.getByText(/0 pts earned/)).toBeInTheDocument();
    });

    it('renders in an "undone" state', () => {
        render(<ActivityItem {...defaultProps} item={routineCompleteItem} isUndone={true} />);
        expect(screen.getByTestId('UndoIcon')).toBeInTheDocument();
        expect(screen.getByText('Morning Routine')).toHaveClass('text-muted-foreground');
    });
  });

  describe('TASK_STOPPED Event', () => {
    const taskStoppedItem: ActivityFeedItem = {
      ...baseItem,
      type: 'TASK_STOPPED',
      data: {
        id: 'l3',
        payload: {
          title: 'Interrupted Task',
          reason: 'Phone call',
          timeSpentSeconds: 90,
        },
      },
    };

    it('renders correctly with a reason', () => {
      render(<ActivityItem {...defaultProps} item={taskStoppedItem} />);
      expect(screen.getByText('Interrupted Task (Stopped)')).toBeInTheDocument();
      expect(screen.getByText(/Time spent: 1m/)).toBeInTheDocument();
      expect(screen.getByText(/Reason: Phone call/)).toBeInTheDocument();
      expect(screen.getByTestId('XCircleIcon')).toBeInTheDocument();
      expect(screen.getByTestId('AlertTriangleIcon')).toBeInTheDocument();
    });

    it('renders correctly without a reason', () => {
      const itemWithoutReason = { ...taskStoppedItem, data: { ...taskStoppedItem.data, payload: { ...taskStoppedItem.data.payload, reason: null } } };
      render(<ActivityItem {...defaultProps} item={itemWithoutReason} />);
      expect(screen.queryByTestId('AlertTriangleIcon')).not.toBeInTheDocument();
    });

    it('handles stopped task with no time spent', () => {
        const itemWithoutTime = { ...taskStoppedItem, data: { ...taskStoppedItem.data, payload: { ...taskStoppedItem.data.payload, timeSpentSeconds: undefined } } };
        render(<ActivityItem {...defaultProps} item={itemWithoutTime} />);
        expect(screen.getByText(/Time spent: 0s/)).toBeInTheDocument();
    });
  });

  it('calls onUndo and onDelete from the dropdown menu', async () => {
    const user = userEvent.setup();
    const taskCompleteItem: ActivityFeedItem = {
      ...baseItem,
      type: 'TASK_COMPLETE',
      data: { task: mockTask, log: {id: 'l4', payload: {}} },
    };
    render(<ActivityItem {...defaultProps} item={taskCompleteItem} />);

    const moreButton = screen.getByTestId('MoreHorizontalIcon').closest('button')!;
    await user.click(moreButton);
    
    const undoButton = await screen.findByRole('menuitem', { name: 'Retry' });
    await user.click(undoButton);
    expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);

    // The menu closes after click, so we need to open it again.
    await user.click(moreButton);
    const deleteButton = await screen.findByRole('menuitem', { name: /Delete Log/ });
    await user.click(deleteButton);
    expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not crash if onUndo/onDelete are not provided', async () => {
    const user = userEvent.setup();
    const taskCompleteItem: ActivityFeedItem = {
      ...baseItem,
      type: 'TASK_COMPLETE',
      data: { task: mockTask, log: {id: 'l4', payload: {}} },
    };
    render(<ActivityItem item={taskCompleteItem} isUndone={false} />);

    const moreButton = screen.getByTestId('MoreHorizontalIcon').closest('button')!;
    await user.click(moreButton);

    const undoButton = await screen.findByRole('menuitem', { name: 'Retry' });
    await expect(user.click(undoButton)).resolves.not.toThrow();
  });

  it('returns null for an unknown event type', () => {
    const unknownItem = { ...baseItem, type: 'ANYTHING_ELSE', data: {} } as unknown as ActivityFeedItem;
    const { container } = render(<ActivityItem {...defaultProps} item={unknownItem} />);
    expect(container.firstChild).toBeNull();
  });
});