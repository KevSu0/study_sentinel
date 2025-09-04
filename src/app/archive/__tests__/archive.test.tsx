import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ArchivePage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import { type StudyTask } from '@/lib/types';
import { ConfettiProvider } from '@/components/providers/confetti-provider';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';

// Mock dependencies
jest.mock('@/hooks/use-global-state');
const mockUseGlobalState = useGlobalState as jest.Mock;

const mockTasks: StudyTask[] = [
  { id: '1', shortId: 'T1', title: 'Archived Task 1', status: 'archived', date: '2024-01-01', time: '10:00', duration: 60, priority: 'medium', timerType: 'countdown', points: 10 },
  { id: '2', shortId: 'T2', title: 'Archived Task 2', status: 'archived', date: '2024-01-02', time: '12:00', duration: 45, priority: 'high', timerType: 'countdown', points: 15 },
  { id: '3', shortId: 'T3', title: 'Active Task', status: 'todo', date: '2024-01-03', time: '14:00', duration: 30, priority: 'low', timerType: 'countdown', points: 5 },
];

// Mock child components to test props
jest.mock('@/components/tasks/task-list', () => ({
  TaskList: jest.fn(() => <div data-testid="task-list"></div>),
}));
import { TaskList } from '@/components/tasks/task-list';
const mockTaskList = TaskList as jest.Mock;

jest.mock('@/components/tasks/empty-state', () => ({
  EmptyState: ({ onAddTask, children, title, message }: { onAddTask: () => void; children: React.ReactNode, title: string, message: string }) => (
    <div data-testid="empty-state">
      <h1>{title}</h1>
      <p>{message}</p>
      <button onClick={onAddTask}>Add Task</button>
      {children}
    </div>
  ),
}));

describe('ArchivePage', () => {
  const mockUnarchiveTask = jest.fn();
  const mockPushTaskToNextDay = jest.fn();
  const mockUpdateTask = jest.fn();
  const mockArchiveTask = jest.fn();

  const setup = (state: Partial<ReturnType<typeof useGlobalState>['state']>) => {
    mockUseGlobalState.mockReturnValue({
      state: {
        tasks: mockTasks,
        isLoaded: true,
        ...state,
      },
      unarchiveTask: mockUnarchiveTask,
      pushTaskToNextDay: mockPushTaskToNextDay,
      updateTask: mockUpdateTask,
      archiveTask: mockArchiveTask,
    });

    return render(
      <MemoryRouterProvider>
        <ConfettiProvider>
          <ArchivePage />
        </ConfettiProvider>
      </MemoryRouterProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the header with title and description', () => {
    setup({});
    expect(screen.getByRole('heading', { name: /Archived Tasks/i })).toBeInTheDocument();
    expect(screen.getByText('A record of your completed and stored tasks.')).toBeInTheDocument();
  });

  it('should render the list of archived tasks and filter out others', () => {
    setup({});
    expect(screen.getByTestId('task-list')).toBeInTheDocument();
    expect(mockTaskList).toHaveBeenCalledWith(
      expect.objectContaining({
        tasks: mockTasks.filter(t => t.status === 'archived'),
      }),
      {}
    );
  });

  it('should render the empty state when there are no archived tasks', () => {
    setup({ tasks: [mockTasks[2]] }); // only non-archived tasks
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Archive is Empty')).toBeInTheDocument();
    expect(screen.getByText('Tasks you archive will appear here.')).toBeInTheDocument();
  });

  it('should show a loading skeleton when data is not loaded', () => {
    setup({ isLoaded: false });
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(skeletons[0]).toHaveClass('animate-pulse');
  });

  it('should pass the correct functions to TaskList', () => {
    setup({});
    expect(mockTaskList).toHaveBeenCalledWith(
      expect.objectContaining({
        onUpdate: mockUpdateTask,
        onArchive: mockArchiveTask,
        onUnarchive: mockUnarchiveTask,
        onPushToNextDay: mockPushTaskToNextDay,
      }),
      {}
    );
  });

  it('should cover the onEdit function passed to TaskList', () => {
    setup({});
    const onEditProp = mockTaskList.mock.calls[0][0].onEdit;
    expect(onEditProp).toBeInstanceOf(Function);
    // Calling it should not throw an error and covers the empty function
    expect(() => onEditProp('1')).not.toThrow();
  });

  it('should cover the onAddTask function passed to EmptyState', () => {
    setup({ tasks: [mockTasks[2]] }); // Render empty state
    const addTaskButton = screen.getByRole('button', { name: /add task/i });
    // Clicking the button in our mocked EmptyState calls the onAddTask prop
    fireEvent.click(addTaskButton);
    // The test passes if no error is thrown, covering the empty function
  });
});