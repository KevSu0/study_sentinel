import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PlansPage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import { useOptimizedPlanData } from '@/hooks/use-plan-data-optimized';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';
import { format, addDays, subDays } from 'date-fns';
import { ConfettiProvider } from '@/components/providers/confetti-provider';
import { AppStateProvider } from '@/hooks/state/AppStateProvider';
import { ViewModeProvider } from '@/hooks/use-view-mode';
import { DashboardLayoutProvider } from '@/hooks/use-dashboard-layout';

// Mock dependencies
jest.mock('@/hooks/use-global-state', () => ({
    ...jest.requireActual('@/hooks/use-global-state'),
    useGlobalState: jest.fn(),
  }));
jest.mock('@/hooks/use-plan-data-optimized');
jest.mock('react-hot-toast');
jest.mock('@/components/plans/view-mode-toggle', () => ({
    ViewModeToggle: ({ setViewMode }: { viewMode: 'card' | 'list'; setViewMode: (m: 'card' | 'list') => void }) => (
      <div>
        <button aria-label="Toggle view mode" onClick={() => setViewMode('list')}>toggle</button>
      </div>
    ),
  }));

const mockedUseGlobalState = useGlobalState as jest.Mock;
const mockedUseOptimizedPlanData = useOptimizedPlanData as jest.Mock;

const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');
const yesterday = subDays(today, 1);
const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

const mockTasks = [
  { id: 't1', title: 'Upcoming Task', date: todayStr, status: 'todo', time: '09:00', priority: 'medium', displayOrder: 1 },
  { id: 't2', title: 'Overdue Task', date: yesterdayStr, status: 'todo', time: '08:00', priority: 'medium', displayOrder: 2 },
  { id: 't3', title: 'Completed Task', date: todayStr, status: 'completed', time: '10:00', priority: 'medium', displayOrder: 3 },
  { id: 't4', title: 'In Progress Task', date: todayStr, status: 'in_progress', time: '11:00', priority: 'medium', displayOrder: 4 },
];

const mockRoutines = [
  { id: 'r1', title: 'Upcoming Routine', days: [today.getDay()], startTime: '10:00', endTime: '10:30', priority: 'medium', status: 'todo', createdAt: Date.now(), shortId: 'r1', displayOrder: 5 },
  { id: 'r2', title: 'Completed Routine', days: [today.getDay()], startTime: '11:00', endTime: '11:30', priority: 'medium', status: 'completed', createdAt: Date.now(), shortId: 'r2', displayOrder: 6 },
];

const mockLogs = [
  {
    id: 'log1',
    type: 'TASK_COMPLETE',
    timestamp: `${todayStr}T12:00:00.000Z`,
    payload: { taskId: 't3', duration: 10, points: 5 },
  },
  {
    id: 'log2',
    type: 'ROUTINE_SESSION_COMPLETE',
    timestamp: `${todayStr}T13:00:00.000Z`,
    payload: { routineId: 'r2', title: 'Completed Routine', duration: 15, points: 10 },
  },
];

const TestAppWrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouterProvider>
        <ConfettiProvider>
            <AppStateProvider>
                <ViewModeProvider>
                    <DashboardLayoutProvider>{children}</DashboardLayoutProvider>
                </ViewModeProvider>
            </AppStateProvider>
        </ConfettiProvider>
    </MemoryRouterProvider>
);


describe('PlansPage', () => {
  const mockUpdateTask = jest.fn();
  const mockPushTaskToNextDay = jest.fn();
  const mockDeleteRoutine = jest.fn();
  const mockAddLog = jest.fn();
  const mockAddTask = jest.fn();
  const mockRetryItem = jest.fn();
  const mockHardUndoAttempt = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseGlobalState.mockReturnValue({
        state: {
            isLoaded: true,
            tasks: mockTasks,
            routines: mockRoutines,
            logs: mockLogs,
        },
        updateTask: mockUpdateTask,
        pushTaskToNextDay: mockPushTaskToNextDay,
        deleteRoutine: mockDeleteRoutine,
        addLog: mockAddLog,
        addTask: mockAddTask,
        retryItem: mockRetryItem,
        hardUndoAttempt: mockHardUndoAttempt,
    });

    mockedUseOptimizedPlanData.mockReturnValue({
        tasks: {
            all: mockTasks,
            filtered: [mockTasks[0], mockTasks[2], mockTasks[3]],
            completed: [mockTasks[2]],
            pending: [mockTasks[0], mockTasks[3]],
            overdue: [mockTasks[1]],
            scheduled: [mockTasks[0], mockTasks[3]],
        },
        routines: {
            all: mockRoutines,
            active: [mockRoutines[0]],
            scheduled: [mockRoutines[0]],
        },
        dateInfo: {
            isToday: true,
            isTomorrow: false,
            isYesterday: false,
            isWeekend: false,
            dayOfWeek: 'Monday',
            formattedDate: format(today, 'MMM dd, yyyy'),
            relativeDate: 'Today',
        },
    });
  });

  const setup = () => {
    render(<PlansPage />, { wrapper: TestAppWrapper });
  };

  it('should render upcoming items', async () => {
    setup();
    expect(await screen.findByText('Upcoming Task')).toBeInTheDocument();
    expect(await screen.findByText('In Progress Task')).toBeInTheDocument();
    expect(await screen.findByText('Upcoming Routine')).toBeInTheDocument();
  });

  it('should handle editing a task', async () => {
    setup();
    const user = userEvent.setup();
    const editButtons = await screen.findAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);
    // The dialog is lazy-loaded, so we need to wait for it to appear.
    expect(await screen.findByText('Loading...')).toBeInTheDocument();
  });
});
