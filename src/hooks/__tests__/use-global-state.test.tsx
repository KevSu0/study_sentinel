import React, { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { GlobalStateProvider, useGlobalState } from '../use-global-state';
import { ConfettiProvider } from '@/components/providers/confetti-provider';
import { StudyTask, Routine, Badge, LogEvent, UserProfile, TaskPriority } from '@/lib/types';
import * as badgesLib from '@/lib/badges';
import toast from 'react-hot-toast';
import { SYSTEM_BADGES } from '@/lib/badges';

// --- Mocks ---

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockFire = jest.fn();
jest.mock('@/components/providers/confetti-provider', () => ({
  ...jest.requireActual('@/components/providers/confetti-provider'),
  useConfetti: () => ({ fire: mockFire }),
}));

jest.mock('@/lib/badges', () => ({
  ...jest.requireActual('@/lib/badges'),
  checkBadge: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/motivation', () => ({
  ...jest.requireActual('@/lib/motivation'),
  getRandomMotivationalMessage: jest.fn().mockReturnValue('You can do it!'),
}));

jest.mock('@/lib/utils', () => ({
    ...jest.requireActual('@/lib/utils'),
    generateShortId: jest.fn((prefix) => `${prefix}-short-id`),
}));

const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  currentTime: 0,
};
global.Audio = jest.fn().mockImplementation(() => mockAudio) as any;

let uuidCounter = 0;
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => `mock-uuid-${++uuidCounter}`);

jest.mock('@/lib/sync', () => ({
    SyncEngine: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
    })),
}));

// --- Test Setup ---

const wrapper = ({ children }: { children: ReactNode }) => (
    <ConfettiProvider>
        <GlobalStateProvider disableSync>{children}</GlobalStateProvider>
    </ConfettiProvider>
);

const renderHookWithProvider = () => {
    return renderHook(() => useGlobalState(), { wrapper });
}

const task: StudyTask = { id: 'task-1', shortId: 'T-1234', title: 'Timer Task', status: 'todo', date: '2024-07-27', time: '12:00', priority: 'high', points: 20, timerType: 'countdown', duration: 1, description: '' };
const routine: Routine = { id: 'routine-1', shortId: 'R-5678', title: 'Timer Routine', days: [1,2,3,4,5], startTime: '09:00', endTime: '10:00', priority: 'medium', description: '', status: 'todo', createdAt: Date.now() };

describe('useGlobalState', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    uuidCounter = 0;
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-07-27T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should throw an error if used outside of a provider', () => {
      const originalError = console.error;
      console.error = jest.fn();
      expect(() => renderHook(() => useGlobalState())).toThrow('useGlobalState must be used within a GlobalStateProvider');
      console.error = originalError;
    });

    it('should load initial data on mount', async () => {
      const { result } = renderHookWithProvider();
      await waitFor(() => expect(result.current.state.isLoaded).toBe(true));
    });
  });

  describe('Task Management', () => {
    it('should add a task with default description', async () => {
      const { result } = renderHookWithProvider();
      await waitFor(() => expect(result.current.state.isLoaded).toBe(true));
      await act(async () => {
        result.current.addTask({ title: 'New Task', date: '2024-01-01', time: '10:00', priority: 'medium', points: 10, timerType: 'infinity' });
      });
      await waitFor(() => {
        expect(result.current.state.tasks.length).toBe(1);
        expect(result.current.state.tasks[0].description).toBe('');
      });
    });

    it('should update a task and log completion', async () => {
      const { result } = renderHookWithProvider();
      await act(async () => { result.current.addTask({ ...task }); });
      
      const addedTask = await waitFor(() => result.current.state.tasks[0]);
      await act(async () => { result.current.updateTask({ ...addedTask, status: 'completed' }); });
      
      await waitFor(() => {
        expect(result.current.state.tasks[0].status).toBe('completed');
        expect(result.current.state.logs.some((l: LogEvent) => l.type === 'TASK_COMPLETE')).toBe(true);
      });
    });

    it('should not archive/unarchive/push task if ID is not found', async () => {
        const { result } = renderHookWithProvider();
        await waitFor(() => expect(result.current.state.isLoaded).toBe(true));
        
        const initialTasks = result.current.state.tasks;
        await act(async () => { result.current.archiveTask('non-existent-id'); });
        await act(async () => { result.current.unarchiveTask('non-existent-id'); });
        await act(async () => { result.current.pushTaskToNextDay('non-existent-id'); });

        expect(result.current.state.tasks).toEqual(initialTasks);
    });
  });

  describe('Timer Management', () => {
    it('should start and complete a countdown task timer', async () => {
      const { result } = renderHookWithProvider();
      await act(async () => { result.current.addTask(task); });
      
      const addedTask = await waitFor(() => {
        const task = result.current.state.tasks.find(t => t.id === 'task-1');
        expect(task).toBeDefined();
        return task;
      });

      await act(async () => { result.current.startTimer(addedTask as StudyTask); });
      expect(result.current.state.activeItem?.item.title).toBe(task.title);
      
      await act(async () => { jest.advanceTimersByTime(61 * 1000); });
      expect(result.current.state.isOvertime).toBe(true);
      
      await act(async () => { result.current.completeTimer('Test log'); });
      
      await act(async () => { jest.runOnlyPendingTimers(); });

      expect(result.current.state.activeItem).toBe(null);
      expect(toast.success).toHaveBeenCalledWith(`Task Completed! You've earned ${task.points} points!`);
      expect(mockFire).toHaveBeenCalled();
    });

    it('should start, pause, resume, and stop an infinity task timer', async () => {
      const infinityTask: StudyTask = { ...task, timerType: 'infinity' };
      const { result } = renderHookWithProvider();
      await act(async () => { result.current.addTask(infinityTask); });
      const addedTask = await waitFor(() => result.current.state.tasks[0]);

      await act(async () => { result.current.startTimer(addedTask); });
      expect(result.current.state.isPaused).toBe(false);
      
      await act(async () => { result.current.togglePause(); });
      expect(result.current.state.isPaused).toBe(true);
      
      await act(async () => { result.current.togglePause(); });
      expect(result.current.state.isPaused).toBe(false);
      
      await act(async () => { result.current.stopTimer('Test reason'); });
      expect(result.current.state.activeItem).toBe(null);
      await waitFor(() => expect(result.current.state.tasks[0].status).toBe('todo'));
    });

    it('should not do anything if togglePause or stopTimer is called with no active timer', async () => {
        const { result } = renderHookWithProvider();
        await waitFor(() => expect(result.current.state.isLoaded).toBe(true));

        await act(async () => { result.current.togglePause(); });
        expect(result.current.state.isPaused).toBe(true);

        await act(async () => { result.current.stopTimer('No timer'); });
        expect(result.current.state.activeItem).toBe(null);
    });
  });

  describe('Routine Management', () => {
    it('should add a routine with default priority and description', async () => {
        const { result } = renderHookWithProvider();
        await waitFor(() => expect(result.current.state.isLoaded).toBe(true));
        await act(async () => {
            await result.current.addRoutine({ title: 'New Routine', days: [1], startTime: '09:00', endTime: '10:00', priority: 'medium' });
        });
        await waitFor(() => {
            expect(result.current.state.routines.length).toBe(1);
            expect(result.current.state.routines[0].priority).toBe('medium');
            expect(result.current.state.routines[0].description).toBe('');
        });
    });
  });

  describe('Badge Management', () => {
    it('should delete a badge and remove it from earned badges', async () => {
        const { result } = renderHookWithProvider();
        const badgeData = { name: 'Custom Badge', description: 'A test badge', category: 'daily' as const, isCustom: true, isEnabled: true, icon: 'star', requiredCount: 1, conditions: [] };
        
        await waitFor(() => expect(result.current.state.allBadges.length).toBe(SYSTEM_BADGES.length));
        await act(async () => { result.current.addBadge(badgeData); });
        await waitFor(() => expect(result.current.state.allBadges.length).toBe(SYSTEM_BADGES.length + 1));
        const newBadgeId = result.current.state.allBadges.find(b => b.isCustom)!.id;

        (badgesLib.checkBadge as jest.Mock).mockImplementation((badge) => badge.id === newBadgeId);
        await act(async () => { result.current.addTask(task); });
        const addedTask = await waitFor(() => result.current.state.tasks[0]);
        await act(async () => { result.current.updateTask({ ...addedTask, status: 'completed' }); });
        
        await waitFor(() => expect(result.current.state.earnedBadges.has(newBadgeId)).toBe(true));

        await act(async () => { result.current.deleteBadge(newBadgeId); });
        await waitFor(() => {
            expect(result.current.state.earnedBadges.has(newBadgeId)).toBe(false);
            expect(result.current.state.allBadges.some(b => b.id === newBadgeId)).toBe(false);
        });
    });
  });

  describe('Derived State and Activity Feed', () => {
    it('should correctly generate todaysActivity for mixed completion types', async () => {
        const { result } = renderHookWithProvider();
        await waitFor(() => expect(result.current.state.isLoaded).toBe(true));

        // Add a task and complete it
        await act(async () => { result.current.addTask(task); });
        const addedTask = await waitFor(() => result.current.state.tasks.find(t => t.id === task.id));
        await act(async () => { result.current.updateTask({ ...(addedTask as StudyTask), status: 'completed' }); });

        // Add a routine and log it
        await act(async () => { await result.current.addRoutine(routine); });
        const addedRoutine = await waitFor(() => result.current.state.routines.find(r => r.id === routine.id));
        if (!addedRoutine) throw new Error('Routine not found');
        await act(async () => {
            result.current.manuallyCompleteItem(addedRoutine, {
                logDate: '2024-07-27',
                startTime: '10:00',
                endTime: '10:45',
                productiveDuration: 45,
                breaks: 0
            });
        });

        await waitFor(() => {
            const todaysActivity = result.current.state.todaysActivity;
            expect(todaysActivity.length).toBe(3);
            const taskActivity = todaysActivity.find(a => a.type === 'TASK_COMPLETE' && a.data.task?.id === task.id);
            const routineActivity = todaysActivity.find(a => a.type === 'ROUTINE_COMPLETE' && a.data.routine?.id === routine.id);
            expect(taskActivity).toBeDefined();
            expect(routineActivity).toBeDefined();
        });
    });
  });
});