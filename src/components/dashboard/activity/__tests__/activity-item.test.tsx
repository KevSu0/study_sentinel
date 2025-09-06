import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityItem } from '../activity-item';
import { transformToCompletedItem } from '@/lib/transformers';
import type { CompletedActivity, StudyTask } from '@/lib/types';

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

const defaultProps = {
  onUndo: jest.fn(),
  onDelete: jest.fn(),
  isUndone: false,
};

describe('ActivityItem', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Completed Task Event', () => {
    const taskCompleteItem: CompletedActivity = {
        attempt: { id: 'attempt1', status: 'COMPLETED', templateId: 'task1', createdAt: 0, events: [{occurredAt: 0}, {occurredAt: 3000000}], productiveDuration: 3000000, points: 150 } as any,
        completeEvent: { occurredAt: 3000000 } as any,
        template: mockTask,
    };
    const transformedItem = transformToCompletedItem(taskCompleteItem);

    it('renders correctly with log data', () => {
      render(<ActivityItem {...defaultProps} item={transformedItem} />);
      expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      expect(screen.getByText(/Total: 50m/)).toBeInTheDocument();
      expect(screen.getByText(/Prod: 50m/)).toBeInTheDocument();
      expect(screen.getByText(/150 pts/)).toBeInTheDocument();
      expect(screen.getByText(/high Priority/i)).toBeInTheDocument();
      expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
    });

    it('renders in an "undone" state', async () => {
      const user = userEvent.setup();
      render(<ActivityItem {...defaultProps} item={transformedItem} isUndone={true} />);
      expect(screen.getByTestId('UndoIcon')).toBeInTheDocument();
      
      await user.click(screen.getByTestId('MoreHorizontalIcon').closest('button')!);
      const undoButton = await screen.findByRole('menuitem', { name: 'Retry' });
      expect(undoButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('calls onUndo and onDelete from the dropdown menu', async () => {
    const user = userEvent.setup();
    const taskCompleteItem: CompletedActivity = {
        attempt: { id: 'attempt1', status: 'COMPLETED', templateId: 'task1', createdAt: 0, events: [{occurredAt: 0}, {occurredAt: 3000000}], productiveDuration: 3000000, points: 150 } as any,
        completeEvent: { occurredAt: 3000000 } as any,
        template: mockTask,
    };
    const transformedItem = transformToCompletedItem(taskCompleteItem);
    render(<ActivityItem {...defaultProps} item={transformedItem} />);

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
    const taskCompleteItem: CompletedActivity = {
        attempt: { id: 'attempt1', status: 'COMPLETED', templateId: 'task1', createdAt: 0, events: [{occurredAt: 0}, {occurredAt: 3000000}], productiveDuration: 3000000, points: 150 } as any,
        completeEvent: { occurredAt: 3000000 } as any,
        template: mockTask,
    };
    const transformedItem = transformToCompletedItem(taskCompleteItem);
    render(<ActivityItem item={transformedItem} isUndone={false} />);

    const moreButton = screen.getByTestId('MoreHorizontalIcon').closest('button')!;
    await user.click(moreButton);

    const undoButton = await screen.findByRole('menuitem', { name: 'Retry' });
    await expect(user.click(undoButton)).resolves.not.toThrow();
  });

  it('returns null for an unknown event type', () => {
    const unknownItem = { isUndone: true } as any;
    const { container } = render(<ActivityItem {...defaultProps} item={unknownItem} />);
    expect(container.firstChild).toBeNull();
  });
});
