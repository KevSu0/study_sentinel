import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PlansPage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import { useViewMode } from '@/hooks/use-view-mode';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';
import { format, addDays, subDays } from 'date-fns';

window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock dependencies
jest.mock('@/hooks/use-global-state', () => ({
  useGlobalState: jest.fn(),
}));
jest.mock('@/hooks/use-view-mode', () => ({
  useViewMode: jest.fn(),
}));
jest.mock('react-hot-toast');
// Mock dynamic imports
jest.mock(
  '@/components/tasks/add-task-dialog',
  () => ({
    __esModule: true,
    AddItemDialog: jest.fn(({ isOpen, onOpenChange, editingItem }) =>
      isOpen ? (
        <div data-testid="add-item-dialog">
          <h2>{editingItem ? 'Edit Item' : 'Add New Task or Routine'}</h2>
          <button onClick={() => onOpenChange(false)}>Close</button>
        </div>
      ) : null
    ),
  })
);

// Mock ViewModeToggle to a simple, deterministic menu to avoid Radix complexity in tests
jest.mock('@/components/plans/view-mode-toggle', () => ({
  ViewModeToggle: ({ setViewMode }: { viewMode: 'card' | 'list'; setViewMode: (m: 'card' | 'list') => void }) => (
    <div>
      <button aria-label="Toggle view mode">toggle</button>
      <div role="menu">
        <button role="menuitem" aria-label="List" onClick={() => setViewMode('list')}>List</button>
        <button role="menuitem" aria-label="Card" onClick={() => setViewMode('card')}>Card</button>
      </div>
    </div>
  ),
}));

// Mock CompletedTodayWidget to a simple static widget with expected roles
jest.mock('@/components/dashboard/widgets/completed-today-widget', () => ({
  CompletedTodayWidget: ({ todaysActivity, onUndoComplete, onDeleteComplete, viewMode }: any) => (
    <div>
      {todaysActivity.map((item: any, idx: number) => (
        <div key={idx} data-testid={viewMode === 'list' ? 'completed-plan-list-item' : 'completed-plan-card'}>
          <span>{
            item.type === 'TASK_COMPLETE'
              ? item.data.task.title
              : (item.data.routine?.title || item.data.log?.payload?.title || item.data.payload?.title || 'Completed Routine')
          }</span>
          <button aria-label="open menu">menu</button>
          <div role="menu">
            <button role="menuitem" aria-label="Undo completion" onClick={() => onUndoComplete(item)}>Undo completion</button>
            <button role="menuitem" aria-label="Delete Log" onClick={() => onDeleteComplete(item)}>Delete Log</button>
          </div>
        </div>
      ))}
    </div>
  ),
}));

// Mock plan item components to deterministic menus
jest.mock('@/components/plans/plan-item-card', () => ({
  PlanItemCard: ({ item, onEditTask, onEditRoutine, onCompleteRoutine, onUpdateTask, onPushTaskToNextDay, onDeleteRoutine }: any) => (
    <div data-testid="plan-item-card">
      <div>{item.data.title}</div>
      <button aria-label="open menu">menu</button>
      <div role="menu">
        {item.type === 'task' && onEditTask && (
          <button role="menuitem" aria-label="Edit" onClick={() => onEditTask(item.data)}>Edit</button>
        )}
        {item.type === 'routine' && onEditRoutine && (
          <button role="menuitem" aria-label="Edit" onClick={() => onEditRoutine(item.data)}>Edit</button>
        )}
        {item.type === 'routine' && onCompleteRoutine && (
          <button role="menuitem" aria-label="Complete routine" onClick={() => onCompleteRoutine(item.data)}>Complete routine</button>
        )}
        {item.type === 'task' && onPushTaskToNextDay && (
          <button role="menuitem" aria-label="Push to today" onClick={() => onPushTaskToNextDay(item.data.id)}>Push to today</button>
        )}
        {item.type === 'routine' && onDeleteRoutine && (
          <button role="menuitem" aria-label="Delete" onClick={() => onDeleteRoutine(item.data.id)}>Delete</button>
        )}
      </div>
    </div>
  ),
}));

jest.mock('@/components/plans/plan-item-list-item', () => ({
  PlanListItem: ({ item, onEditTask, onEditRoutine, onCompleteRoutine, onUpdateTask, onPushTaskToNextDay, onDeleteRoutine }: any) => (
    <div data-testid="plan-item-card">
      <div>{item.data.title}</div>
      <button aria-label="open menu">menu</button>
      <div role="menu">
        {item.type === 'task' && onEditTask && (
          <button role="menuitem" aria-label="Edit" onClick={() => onEditTask(item.data)}>Edit</button>
        )}
        {item.type === 'routine' && onEditRoutine && (
          <button role="menuitem" aria-label="Edit" onClick={() => onEditRoutine(item.data)}>Edit</button>
        )}
        {item.type === 'routine' && onCompleteRoutine && (
          <button role="menuitem" aria-label="Complete routine" onClick={() => onCompleteRoutine(item.data)}>Complete routine</button>
        )}
        {item.type === 'task' && onPushTaskToNextDay && (
          <button role="menuitem" aria-label="Push to today" onClick={() => onPushTaskToNextDay(item.data.id)}>Push to today</button>
        )}
        {item.type === 'routine' && onDeleteRoutine && (
          <button role="menuitem" aria-label="Delete" onClick={() => onDeleteRoutine(item.data.id)}>Delete</button>
        )}
      </div>
    </div>
  ),
}));

// Mock EmptyState component used in global empty state
jest.mock('@/components/tasks/empty-state', () => ({
  EmptyState: ({ onAddTask, title, message, buttonText }: any) => (
    <div>
      <div>{title}</div>
      <div>{message}</div>
      <button onClick={onAddTask}>{buttonText}</button>
    </div>
  ),
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  __esModule: true,
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => <button onClick={onClick}>{children}</button>,
}));

const { useGlobalState: mockedUseGlobalState } = require('@/hooks/use-global-state');
const { useViewMode: mockedUseViewMode } = require('@/hooks/use-view-mode');
const mockUseGlobalState = mockedUseGlobalState as jest.Mock;
const mockUseViewMode = mockedUseViewMode as jest.Mock;

const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');
const yesterday = subDays(today, 1);
const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

const mockTasks = [
  { id: 't1', title: 'Upcoming Task', date: todayStr, status: 'todo', time: '09:00', priority: 'medium' },
  { id: 't2', title: 'Overdue Task', date: yesterdayStr, status: 'todo', time: '08:00', priority: 'medium' },
  { id: 't3', title: 'Completed Task', date: todayStr, status: 'completed', time: '10:00', priority: 'medium' },
  { id: 't4', title: 'In Progress Task', date: todayStr, status: 'in_progress', time: '11:00', priority: 'medium' },
];

const mockRoutines = [
  { id: 'r1', title: 'Upcoming Routine', days: [today.getDay()], startTime: '10:00', endTime: '10:30', priority: 'medium', status: 'todo', createdAt: Date.now(), shortId: 'r1' },
  { id: 'r2', title: 'Completed Routine', days: [today.getDay()], startTime: '11:00', endTime: '11:30', priority: 'medium', status: 'completed', createdAt: Date.now(), shortId: 'r2' },
];

const mockTodaysActivity = [
    {
        type: 'TASK_COMPLETE',
        timestamp: `${todayStr}T12:00:00.000Z`,
        data: {
            task: mockTasks.find(t => t.id === 't3'),
            log: { id: 'log1', payload: { duration: 10, points: 5 } }
        }
    },
    {
        type: 'ROUTINE_COMPLETE',
        timestamp: `${todayStr}T13:00:00.000Z`,
        data: {
            id: 'log2',
            payload: { routineId: 'r2', title: 'Completed Routine', duration: 15, points: 10 },
        },
    }
];


const OriginalDate = global.Date;

describe('PlansPage', () => {
  const mockUpdateTask = jest.fn();
  const mockPushTaskToNextDay = jest.fn();
  const mockSetViewMode = jest.fn();
  const mockDeleteRoutine = jest.fn();
  const mockAddLog = jest.fn();
  const mockUpdateLog = jest.fn();
  const mockRemoveLog = jest.fn();
  const mockAddTask = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.Date = OriginalDate;
  });

  const setup = (viewMode = 'card', stateOverrides = {}, date = today) => {
    mockUseGlobalState.mockReturnValue({
      state: {
        isLoaded: true,
        tasks: mockTasks,
        routines: mockRoutines,
        todaysActivity: mockTodaysActivity,
        logs: [{id: 'log1', payload: { duration: 10, points: 5 }}],
        ...stateOverrides,
      },
      updateTask: mockUpdateTask,
      pushTaskToNextDay: mockPushTaskToNextDay,
      deleteRoutine: mockDeleteRoutine,
      addLog: mockAddLog,
      updateLog: mockUpdateLog,
      removeLog: mockRemoveLog,
      addTask: mockAddTask,
    });
    mockUseViewMode.mockReturnValue({
      viewMode,
      setViewMode: mockSetViewMode,
    });

    // Manually set the date for the test
    const mockDate = date;
    global.Date = class extends OriginalDate {
        constructor(d?: string | number | Date, ...rest: any[]) {
            if (d) {
                // @ts-ignore
                super(d, ...rest);
            } else {
                super(mockDate);
            }
        }
        static now() {
            return mockDate.getTime();
        }
    } as any;

    render(<PlansPage />, { wrapper: MemoryRouterProvider });
  };

  it('should display skeletons while loading', async () => {
    setup('card', { isLoaded: false });
    await waitFor(() => expect(screen.queryAllByRole('status').length).toBeGreaterThan(0));
    expect(screen.queryByText('Upcoming Task')).not.toBeInTheDocument();
  });

  it('should render upcoming items in card view by default', async () => {
    setup('card');
    expect(await screen.findByText('Upcoming Task')).toBeInTheDocument();
    expect(await screen.findByText('Upcoming Routine')).toBeInTheDocument();
    expect(await screen.findByText('In Progress Task')).toBeInTheDocument();
  });

  it('should render upcoming items in list view when selected', async () => {
    setup('list');
    expect(await screen.findByText('Upcoming Task')).toBeInTheDocument();
    expect(await screen.findByText('Upcoming Routine')).toBeInTheDocument();
  });

  it('should switch view modes when toggle is clicked', async () => {
    const user = userEvent.setup();
    setup('card');
    const viewModeMenu = screen.getByRole('button', { name: /toggle view mode/i });
    await user.click(viewModeMenu);
    const listViewButton = await screen.findByRole('menuitem', { name: /list/i });
    await user.click(listViewButton);
    expect(mockSetViewMode).toHaveBeenCalledWith('list');
  });

  it('should show and interact with overdue tasks', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByText(/Overdue/));
    const overdueTask = await screen.findByText('Overdue Task');
    expect(overdueTask).toBeInTheDocument();

    const card = overdueTask.closest('[data-testid="plan-item-card"]') as HTMLElement;
    // Interact within this card to avoid duplicate matches
    const pushButton = within(card).getByRole('menuitem', { name: /push to today/i });
    await user.click(pushButton);
    expect(mockPushTaskToNextDay).toHaveBeenCalledWith('t2');
  });

  it('should handle editing an overdue task', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByText(/Overdue/));
    const overdueTask = await screen.findByText('Overdue Task');
    const card = overdueTask.closest('[data-testid="plan-item-card"]') as HTMLElement;
    const editButton = within(card).getByRole('menuitem', { name: /edit/i });
    await user.click(editButton);
    expect(await screen.findByTestId('add-item-dialog')).toBeInTheDocument();
    expect(await screen.findByText('Edit Item')).toBeInTheDocument();
  });

  it('should not render the overdue section if there are no overdue tasks', async () => {
    setup('card', { tasks: [mockTasks[0]] }); // Only upcoming task
    await waitFor(() => {
      expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
    });
  });

  it('should handle completing a routine', async () => {
    const user = userEvent.setup();
    setup();
    const routineTitle = await screen.findByText('Upcoming Routine');
    const routineCard = routineTitle.closest('[data-testid="plan-item-card"]') as HTMLElement;
    const completeButton = within(routineCard).getByRole('menuitem', { name: /complete routine/i });
    await user.click(completeButton);
    expect(mockAddLog).toHaveBeenCalledWith('ROUTINE_SESSION_COMPLETE', expect.any(Object));
  });

  it('should handle editing a routine', async () => {
    const user = userEvent.setup();
    setup();
    const routineTitle = await screen.findByText('Upcoming Routine');
    const routineCard = routineTitle.closest('[data-testid="plan-item-card"]') as HTMLElement;
    const editButton = within(routineCard).getByRole('menuitem', { name: /edit/i });
    await user.click(editButton);
    expect(await screen.findByTestId('add-item-dialog')).toBeInTheDocument();
    expect(await screen.findByText('Edit Item')).toBeInTheDocument();
  });

  it('should handle deleting a routine', async () => {
    const user = userEvent.setup();
    setup();
    const routineTitle = await screen.findByText('Upcoming Routine');
    const routineCard = routineTitle.closest('[data-testid="plan-item-card"]') as HTMLElement;
    const deleteButton = within(routineCard).getByRole('menuitem', { name: /delete/i });
    await user.click(deleteButton);
    expect(mockDeleteRoutine).toHaveBeenCalledWith('r1');
  });

  it('should handle editing a task', async () => {
    const user = userEvent.setup();
    setup();
    const taskTitle = await screen.findByText('Upcoming Task');
    const taskCard = taskTitle.closest('[data-testid="plan-item-card"]') as HTMLElement;
    const editButton = within(taskCard).getByRole('menuitem', { name: /edit/i });
    await user.click(editButton);
    expect(await screen.findByText('Edit Item')).toBeInTheDocument();
  });

  it('should show an empty state for upcoming items when none are scheduled', async () => {
    setup('card', { tasks: [], routines: [] });
    expect(await screen.findByText('Nothing scheduled for this day.')).toBeInTheDocument();
  });

  it('should show a global empty state when no items exist for the day', async () => {
    setup('card', { tasks: [], routines: [], todaysActivity: [] });
    const emptyStateContainer = await screen.findByText('A Blank Slate!');
    expect(emptyStateContainer).toBeInTheDocument();
    
    const emptyState = emptyStateContainer.parentElement as HTMLElement;
    const addButton = within(emptyState).getByRole('button', { name: 'Add New Item' });
    fireEvent.click(addButton);
    
    expect(await screen.findByText('Add New Task or Routine')).toBeInTheDocument();
  });

  it('should navigate to the next and previous day and update the date', async () => {
    setup();
    expect(await screen.findByText('Today')).toBeInTheDocument();
    
    // Next day
    const nextButton = screen.getByRole('button', { name: /next day/i });
    fireEvent.click(nextButton);
    const nextDay = addDays(today, 1);
    expect(await screen.findByText(format(nextDay, 'MMM d'))).toBeInTheDocument();

    // Previous day
    const prevButton = screen.getByRole('button', { name: /previous day/i });
    fireEvent.click(prevButton);
    expect(await screen.findByText('Today')).toBeInTheDocument();
  });

  it('should change date using the calendar popover and go to today', async () => {
    const user = userEvent.setup();
    setup(); // Mocks date to today

    // go back 5 days
    const prevButton = screen.getByRole('button', { name: /previous day/i });
    for (let i = 0; i < 5; i++) {
        fireEvent.click(prevButton);
    }
    
    const fiveDaysAgo = subDays(new Date(), 5);
    const calendarButton = await screen.findByRole('button', { name: new RegExp(format(fiveDaysAgo, 'MMM d'), 'i') });
    await user.click(calendarButton);

    // Popover content is mocked to always be visible
    const goToTodayButton = screen.getByRole('button', { name: /go to today/i });
    await user.click(goToTodayButton);

    // The button to open the calendar will now say "Today"
    expect(await screen.findByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('should open the add item dialog via floating action button', async () => {
    setup();
    const fab = await screen.findByRole('button', { name: 'Add New Item' });
    fireEvent.click(fab);
    expect(await screen.findByTestId('add-item-dialog')).toBeInTheDocument();
  });

  describe('Completed Items Widget', () => {
    it('should show completed items and handle undoing a task', async () => {
        const user = userEvent.setup();
        setup('list');
        const completedTask = await screen.findByText('Completed Task');
        expect(completedTask).toBeInTheDocument();
        
        const completedItem = completedTask.closest('[data-testid="completed-plan-list-item"]') as HTMLElement;
        const menuButton = within(completedItem).getByRole('button', { name: /open menu/i });
        await user.click(menuButton);

        const undoButton = await screen.findByRole('menuitem', { name: /undo completion/i });
        await user.click(undoButton);
        expect(mockUpdateTask).toHaveBeenCalledWith({ ...mockTasks[2], status: 'todo' });
    });

    it('should handle undoing a completed routine', async () => {
        const user = userEvent.setup();
        setup('list');
        const completedRoutine = await screen.findByText('Completed Routine');
        expect(completedRoutine).toBeInTheDocument();
        
        const routineItem = completedRoutine.closest('[data-testid="completed-plan-list-item"]') as HTMLElement;
        const menuButton = within(routineItem).getByRole('button', { name: /open menu/i });
        await user.click(menuButton);

        const undoButton = await screen.findByRole('menuitem', { name: /undo completion/i });
        await user.click(undoButton);
        expect(mockUpdateLog).toHaveBeenCalledWith('log2', { isUndone: true });
    });

    it('should handle hard undo for a task', async () => {
        const user = userEvent.setup();
        setup('list');
        const completedTask = await screen.findByText('Completed Task');
        const completedItem = completedTask.closest('[data-testid="completed-plan-list-item"]') as HTMLElement;
        const menuButton = within(completedItem).getByRole('button', { name: /open menu/i });
        await user.click(menuButton);
        
        const hardUndoButton = await screen.findByRole('menuitem', { name: /delete log/i });
        await user.click(hardUndoButton);

        expect(mockRemoveLog).toHaveBeenCalledWith('log1');
        expect(mockUpdateTask).toHaveBeenCalledWith({ ...mockTasks[2], status: 'todo' });
    });

    it('should handle hard undo for a task when log is not found', async () => {
        const user = userEvent.setup();
        // Setup with no logs
        setup('list', { logs: [] });
        const completedTask = await screen.findByText('Completed Task');
        const completedItem = completedTask.closest('[data-testid="completed-plan-list-item"]') as HTMLElement;
        const menuButton = within(completedItem).getByRole('button', { name: /open menu/i });
        await user.click(menuButton);
        
        const hardUndoButton = await screen.findByRole('menuitem', { name: /delete log/i });
        await user.click(hardUndoButton);

        // removeLog should not be called, but the task should still be updated
        expect(mockRemoveLog).not.toHaveBeenCalled();
        expect(mockUpdateTask).toHaveBeenCalledWith({ ...mockTasks[2], status: 'todo' });
    });

    it('should handle hard undo for a routine', async () => {
        const user = userEvent.setup();
        setup('list');
        const completedRoutine = await screen.findByText('Completed Routine');
        const completedItem = completedRoutine.closest('[data-testid="completed-plan-list-item"]') as HTMLElement;
        const menuButton = within(completedItem).getByRole('button', { name: /open menu/i });
        await user.click(menuButton);
        
        const hardUndoButton = await screen.findByRole('menuitem', { name: /delete log/i });
        await user.click(hardUndoButton);

        expect(mockRemoveLog).toHaveBeenCalledWith('log2');
    });
  });
});
