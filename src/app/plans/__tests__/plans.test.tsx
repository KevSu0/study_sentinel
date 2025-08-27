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
jest.mock('@/hooks/use-global-state');
jest.mock('@/hooks/use-view-mode');
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

const mockUseGlobalState = useGlobalState as jest.Mock;
const mockUseViewMode = useViewMode as jest.Mock;

const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');
const yesterday = subDays(today, 1);
const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

const mockTasks = [
  { id: 't1', title: 'Upcoming Task', date: todayStr, status: 'todo', time: '09:00' },
  { id: 't2', title: 'Overdue Task', date: yesterdayStr, status: 'todo' },
  { id: 't3', title: 'Completed Task', date: todayStr, status: 'completed' },
  { id: 't4', title: 'In Progress Task', date: todayStr, status: 'in_progress' },
];

const mockRoutines = [
  { id: 'r1', title: 'Upcoming Routine', days: [today.getDay()], startTime: '10:00' },
  { id: 'r2', title: 'Completed Routine', days: [today.getDay()], startTime: '11:00' },
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
    const menuButton = within(card).getByRole('button', { name: /open menu/i });
    await user.click(menuButton);
    
    const pushButton = await screen.findByRole('menuitem', { name: /push to today/i });
    await user.click(pushButton);
    expect(mockPushTaskToNextDay).toHaveBeenCalledWith('t2');
  });

  it('should handle editing an overdue task', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByText(/Overdue/));
    const overdueTask = await screen.findByText('Overdue Task');
    const card = overdueTask.closest('[data-testid="plan-item-card"]') as HTMLElement;
    const menuButton = within(card).getByRole('button', { name: /open menu/i });
    await user.click(menuButton);
    const editButton = await screen.findByRole('menuitem', { name: /edit/i });
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
    setup();
    const routineTitle = await screen.findByText('Upcoming Routine');
    const routineCard = routineTitle.closest('[data-testid="plan-item-card"]') as HTMLElement;
    const completeButton = within(routineCard).getByRole('button', { name: /complete routine/i });
    fireEvent.click(completeButton);
    expect(mockAddLog).toHaveBeenCalledWith('ROUTINE_SESSION_COMPLETE', expect.any(Object));
  });

  it('should handle editing a routine', async () => {
    const user = userEvent.setup();
    setup();
    const routineTitle = await screen.findByText('Upcoming Routine');
    const routineCard = routineTitle.closest('[data-testid="plan-item-card"]') as HTMLElement;
    const menuButton = within(routineCard).getByRole('button', { name: /open menu/i });
    await user.click(menuButton);
    const editButton = await screen.findByRole('menuitem', { name: /edit/i });
    await user.click(editButton);
    expect(await screen.findByTestId('add-item-dialog')).toBeInTheDocument();
    expect(await screen.findByText('Edit Item')).toBeInTheDocument();
  });

  it('should handle deleting a routine', async () => {
    const user = userEvent.setup();
    setup();
    const routineTitle = await screen.findByText('Upcoming Routine');
    const routineCard = routineTitle.closest('[data-testid="plan-item-card"]') as HTMLElement;
    const menuButton = within(routineCard).getByRole('button', { name: /open menu/i });
    await user.click(menuButton);
    const deleteButton = await screen.findByRole('menuitem', { name: /delete/i });
    await user.click(deleteButton);

    // The confirmation button is now a simple button due to the mock
    const description = await screen.findByText(/This will permanently delete the routine "Upcoming Routine"./);
    const dialog = description.closest('[role="dialog"]') as HTMLElement;
    if (!dialog) throw new Error('Dialog not found');
    const confirmButton = within(dialog).getByRole('button', { name: /delete/i });
    await user.click(confirmButton);

    expect(mockDeleteRoutine).toHaveBeenCalledWith('r1');
  });

  it('should handle editing a task', async () => {
    const user = userEvent.setup();
    setup();
    const taskTitle = await screen.findByText('Upcoming Task');
    const taskCard = taskTitle.closest('[data-testid="plan-item-card"]') as HTMLElement;
    const menuButton = within(taskCard).getByRole('button', { name: /open menu/i });
    await user.click(menuButton);
    const editButton = await screen.findByRole('menuitem', { name: /edit/i });
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

    const dialog = await screen.findByRole('dialog');
    const goToTodayButton = within(dialog).getByRole('button', { name: /go to today/i });
    await user.click(goToTodayButton);

    // The button to open the calendar will now say "Today"
    expect(await screen.findByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('should open the add item dialog via floating action button', async () => {
    setup();
    const fab = (await screen.findAllByRole('button', { name: 'Add New Item' })).find(b => b.classList.contains('fixed'));
    expect(fab).toBeInTheDocument();
    fireEvent.click(fab as HTMLElement);
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