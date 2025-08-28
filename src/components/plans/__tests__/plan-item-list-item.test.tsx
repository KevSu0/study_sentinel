import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PlanListItem} from '../plan-item-list-item';
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
  return render(<PlanListItem {...props} />);
};

describe('PlanListItem', () => {
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

    it('renders task details', () => {
      renderComponent(props);
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('T1')).toBeInTheDocument();
      expect(screen.getByText(/60 min/)).toBeInTheDocument();
    });

    it.each([
        ['high', 'text-red-500'],
        ['medium', 'text-yellow-500'],
        ['low', 'text-blue-500'],
    ])('applies correct color for %s priority', (priority, expectedClass) => {
        const taskWithPriority = {...mockTask, priority: priority as 'low' | 'medium' | 'high'};
        renderComponent({...props, item: {type: 'task', data: taskWithPriority}});
        expect(screen.getByText(/flameicon/i)).toHaveClass(expectedClass);
    });

    it('calls onUpdateTask on checkbox click', async () => {
      renderComponent(props);
      await userEvent.click(screen.getByRole('checkbox'));
      expect(props.onUpdateTask).toHaveBeenCalledWith({...mockTask, status: 'completed'});
    });

    it('calls startTimer on timer button click', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByText(/timericon/i));
        expect(mockStartTimer).toHaveBeenCalledWith(mockTask);
    });

    it('calls onEditTask from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByText(/more/i));
        await userEvent.click(screen.getByText(/edit/i));
        expect(props.onEditTask).toHaveBeenCalledWith(mockTask);
    });

    it('opens log dialog from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByText(/more/i));
        await userEvent.click(screen.getByText(/log time/i));
        expect(screen.getByTestId('manual-log-dialog')).toBeInTheDocument();
    });

    it('calls onPushTaskToNextDay from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByText(/more/i));
        await userEvent.click(screen.getByText(/push to today/i));
        expect(props.onPushTaskToNextDay).toHaveBeenCalledWith(mockTask.id);
    });
  });

  describe('Active Routine (`type: "routine"`)', () => {
    const props = {
        item: {type: 'routine', data: mockRoutine},
        onCompleteRoutine: jest.fn(),
        onDeleteRoutine: jest.fn(),
        onEditRoutine: jest.fn(),
    };

    it('renders routine details', () => {
        renderComponent(props);
        expect(screen.getByText('Morning Routine')).toBeInTheDocument();
        expect(screen.getByText('Routine')).toBeInTheDocument();
    });

    it('calls onCompleteRoutine on check button click', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByText(/check/i));
        expect(props.onCompleteRoutine).toHaveBeenCalledWith(mockRoutine);
    });

    it('calls onEditRoutine from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByText(/more/i));
        await userEvent.click(screen.getByText(/edit/i));
        expect(props.onEditRoutine).toHaveBeenCalledWith(mockRoutine);
    });

    it('opens log dialog from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByText(/more/i));
        await userEvent.click(screen.getByText(/log time/i));
        expect(screen.getByTestId('manual-log-dialog')).toBeInTheDocument();
    });

    it('calls onDeleteRoutine after confirming dialog', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByText(/more/i));
        await userEvent.click(screen.getByText(/delete/i));
        
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: /delete/i}));

        expect(props.onDeleteRoutine).toHaveBeenCalledWith(mockRoutine.id);
    });
  });

  describe('Completed Task (`type: "completed_task"`)', () => {
    const props = {
        item: {type: 'completed_task', data: {...mockTask, status: 'completed'}},
        onUpdateTask: jest.fn(),
    };

    it('renders with line-through style and "Completed" text', () => {
        renderComponent(props);
        expect(screen.getByText('Test Task')).toHaveClass('line-through');
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /start timer/i})).not.toBeInTheDocument();
    });

    it('calls onUpdateTask to undo completion', async () => {
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

    it('renders with line-through style and logged time', async () => {
        renderComponent(props);
        expect(screen.getByText('Completed Routine')).toHaveClass('line-through');
        expect(screen.getByText(/logged/i)).toBeInTheDocument();
    });

    it('calls onUndoCompleteRoutine from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByText(/undo/i));
        await userEvent.click(screen.getByText('Retry'));
        expect(props.onUndoCompleteRoutine).toHaveBeenCalledWith(mockCompletedLog.id);
    });

    it('calls onDeleteCompleteRoutine from dropdown', async () => {
        renderComponent(props);
        await userEvent.click(screen.getByText(/undo/i));
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
    expect(screen.getByText(/timericon/i).parentElement).toHaveClass('h-8 w-8 rounded-full');
    expect(screen.getByText(/timericon/i)).toHaveClass('text-primary animate-pulse');
  });
});

// Mock Lucide icons for cleaner tests
jest.mock('lucide-react', () => ({
    ...jest.requireActual('lucide-react'),
    Timer: ({className}: {className:string}) => <div className={className}>TimerIcon</div>,
    Flame: ({className}: {className:string}) => <div className={className}>FlameIcon</div>,
    MoreHorizontal: () => <div>More</div>,
    Check: () => <div>Check</div>,
    Undo: () => <div>Undo</div>,
    Repeat: () => <div>Repeat</div>,
    InfinityIcon: () => <div>Infinity</div>,
    Pencil: () => <div>Pencil</div>,
    SendToBack: () => <div>SendToBack</div>,
    Trash2: () => <div>Trash2</div>,
    PlusCircle: () => <div>PlusCircle</div>,
    Award: () => <div>Award</div>,
}));