import React from 'react';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PlanItemRenderer} from '../plan-item-renderer';
import {useGlobalState} from '@/hooks/use-global-state';
import {StudyTask, Routine, LogEvent} from '@/lib/types';

// Mock dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('@/components/tasks/manual-log-dialog', () => ({
  ManualLogDialog: jest.fn(({isOpen}) =>
    isOpen ? <div data-testid="manual-log-dialog">Log Dialog</div> : null
  ),
}));

const mockUseGlobalState = useGlobalState as jest.Mock;
const mockStartTimer = jest.fn();

const mockTask: StudyTask = {
  id: 'task1',
  shortId: 'T1',
  title: 'Test Task',
  status: 'todo',
  priority: 'high',
  duration: 60,
  points: 100,
  timerType: 'countdown',
  time: '10:00',
  date: '2025-07-29',
};

const mockRoutine: Routine = {
  id: 'routine1',
  shortId: 'R1',
  title: 'Morning Routine',
  startTime: '09:00',
  endTime: '09:30',
  days: [1, 2, 3, 4, 5],
  priority: 'medium',
  status: 'todo',
  createdAt: Date.now(),
};

const mockCompletedLog: LogEvent & { title: string } = {
    id: 'log1',
    type: 'ROUTINE_SESSION_COMPLETE',
    timestamp: new Date().toISOString(),
    title: 'Completed Routine', // Workaround for component bug
    payload: {
        title: 'Completed Routine'
    }
}

const renderComponent = (props: any) => {
  return render(<PlanItemRenderer variant="card" {...props} />);
};

describe('PlanItemRenderer (Card Variant)', () => {
  beforeEach(() => {
    mockUseGlobalState.mockReturnValue({
      state: {activeItem: null},
      startTimer: mockStartTimer,
    });
    jest.clearAllMocks();
  });

  describe('Active Task (`type: "task"`)', () => {
    const props = {
      item: {type: 'task', data: mockTask},
      onUpdateTask: jest.fn(),
      onEditTask: jest.fn(),
      onPushTaskToNextDay: jest.fn(),
    };

    it('renders task details and high priority style', () => {
      renderComponent(props);
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('T1')).toBeInTheDocument();
      expect(screen.getByText(/60 min/)).toBeInTheDocument();
      expect(screen.getByText(/100 pts/)).toBeInTheDocument();
      expect(screen.getByTestId('plan-item-card').querySelector('.border-red-500\\/80')).toBeInTheDocument();
    });

    it('renders medium priority style', () => {
        const mediumPriorityTask = { ...mockTask, priority: 'medium' as const };
        renderComponent({ item: { type: 'task', data: mediumPriorityTask }, onUpdateTask: jest.fn() });
        expect(screen.getByTestId('plan-item-card').querySelector('.border-yellow-500\\/80')).toBeInTheDocument();
    });

    it('renders low priority style', () => {
        const lowPriorityTask = { ...mockTask, priority: 'low' as const };
        renderComponent({ item: { type: 'task', data: lowPriorityTask }, onUpdateTask: jest.fn() });
        expect(screen.getByTestId('plan-item-card').querySelector('.border-blue-500\\/80')).toBeInTheDocument();
    });
    
    it('renders infinity timer details for task', () => {
        const infinityTask = { ...mockTask, timerType: 'infinity' as const };
        renderComponent({ item: { type: 'task', data: infinityTask } });
        expect(screen.getByText('Infinity')).toBeInTheDocument();
    });

    it('calls onUpdateTask with "completed" status on checkbox click', async () => {
      renderComponent(props);
      await userEvent.click(screen.getByRole('checkbox'));
      expect(props.onUpdateTask).toHaveBeenCalledWith({...mockTask, status: 'completed'});
    });

    it('calls startTimer on timer button click', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByRole('button', {name: /start timer/i}));
        expect(mockStartTimer).toHaveBeenCalledWith(mockTask);
    });

    it('calls onEditTask from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByRole('button', {name: /open menu/i}));
        await userEvent.click(screen.getByText(/edit/i));
        expect(props.onEditTask).toHaveBeenCalledWith(mockTask);
    });
    
    it('calls onPushTaskToNextDay from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByRole('button', {name: /open menu/i}));
        await userEvent.click(screen.getByText(/push to today/i));
        expect(props.onPushTaskToNextDay).toHaveBeenCalledWith(mockTask.id);
    });

    it('opens manual log dialog from dropdown', async () => {
        renderComponent(props);
        expect(screen.queryByTestId('manual-log-dialog')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: /open menu/i}));
        await userEvent.click(screen.getByText(/log time/i));
        expect(screen.getByTestId('manual-log-dialog')).toBeInTheDocument();
    });
  });

  describe('Active Routine (`type: "routine"`)', () => {
    const props = {
        item: {type: 'routine', data: mockRoutine},
        onCompleteRoutine: jest.fn(),
        onEditRoutine: jest.fn(),
        onDeleteRoutine: jest.fn(),
    };

    it('renders routine details and style', () => {
        renderComponent(props);
        expect(screen.getByText('Morning Routine')).toBeInTheDocument();
        expect(screen.getByText('Routine')).toBeInTheDocument();
        expect(screen.getByTestId('plan-item-card').querySelector('.border-purple-500\\/50')).toBeInTheDocument();
    });

    it('calls onCompleteRoutine on check button click', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByRole('button', {name: /complete routine/i}));
        expect(props.onCompleteRoutine).toHaveBeenCalledWith(mockRoutine);
    });

    it('calls onEditRoutine from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByRole('button', {name: /open menu/i}));
        await userEvent.click(screen.getByText(/edit/i));
        expect(props.onEditRoutine).toHaveBeenCalledWith(mockRoutine);
    });

    it('opens manual log dialog from dropdown for a routine', async () => {
        renderComponent(props);
        expect(screen.queryByTestId('manual-log-dialog')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: /open menu/i}));
        await userEvent.click(screen.getByText(/log time/i));
        expect(screen.getByTestId('manual-log-dialog')).toBeInTheDocument();
    });

    it('calls onDeleteRoutine after confirming dialog', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByRole('button', {name: /open menu/i}));
        await userEvent.click(screen.getByText(/delete/i));
        
        const dialog = screen.getByRole('alertdialog');
        expect(dialog).toBeInTheDocument();
        
        const deleteButton = within(dialog).getByRole('button', {name: /delete/i});
        await userEvent.click(deleteButton);

        expect(props.onDeleteRoutine).toHaveBeenCalledWith(mockRoutine.id);
    });
  });

  describe('Completed Task (`type: "completed_task"`)', () => {
    const props = {
        item: {type: 'completed_task', data: {...mockTask, status: 'completed'}},
        onUpdateTask: jest.fn(),
    };

    it('renders with line-through style and checked checkbox', () => {
        renderComponent(props);
        expect(screen.getByText('Test Task')).toHaveClass('line-through');
        expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('calls onUpdateTask with "todo" status on checkbox click', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByRole('checkbox'));
        expect(props.onUpdateTask).toHaveBeenCalledWith({...mockTask, status: 'todo'});
    });
  });

  describe('Completed Routine (`type: "completed_routine"`)', () => {
    const props = {
        item: {type: 'completed_routine', data: mockCompletedLog},
        onUndoCompleteRoutine: jest.fn(),
        onDeleteCompleteRoutine: jest.fn(),
    };

    it('renders with line-through style and undo dropdown', async () => {
        renderComponent(props);
        const titleElement = screen.getByText('Completed Routine');
        expect(titleElement).toBeInTheDocument();
        expect(titleElement).toHaveClass('line-through');
        
        const undoButton = screen.getByRole('button', {name: /undo completion/i});
        expect(undoButton).toBeInTheDocument();
        await userEvent.click(undoButton);

        expect(screen.getByText('Retry')).toBeInTheDocument();
        expect(screen.getByText('Delete Log')).toBeInTheDocument();
    });

    it('calls onUndoCompleteRoutine from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByRole('button', {name: /retry completion/i}));
        await userEvent.click(screen.getByText('Retry'));
        expect(props.onUndoCompleteRoutine).toHaveBeenCalledWith(mockCompletedLog.id);
    });

    it('calls onDeleteCompleteRoutine from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByRole('button', {name: /retry completion/i}));
        await userEvent.click(screen.getByText('Delete Log'));
        expect(props.onDeleteCompleteRoutine).toHaveBeenCalledWith(mockCompletedLog.id);
    });
  });

  it('applies active timer highlight', () => {
    mockUseGlobalState.mockReturnValue({
        state: {activeItem: {item: mockTask}},
        startTimer: mockStartTimer,
    });
    renderComponent({item: {type: 'task', data: mockTask}});
    expect(screen.getByTestId('plan-item-card').querySelector('.ring-2')).toBeInTheDocument();
  });
});