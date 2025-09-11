import { renderHook, act, waitFor } from '@testing-library/react';
import { GlobalStateProvider, useGlobalState } from '../use-global-state';
import { StudyTask } from '@/lib/types';
import React, { ReactNode } from 'react';
import { checkBadge } from '@/lib/badges';

// Mocking fetch
global.fetch = jest.fn();

// JSDOM doesn't implement audio playback, so we mock it.
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  currentTime: 0,
};

// @ts-ignore
global.Audio = jest.fn(() => mockAudio);

// Define constants used in tests
const TASKS_KEY = 'studySentinelTasks_v3';
const ROUTINES_KEY = 'studySentinelRoutines_v3';
const PROFILE_KEY = 'studySentinelProfile_v3';
const LOG_PREFIX = 'studySentinelLogs_v3_';
const SOUND_SETTINGS_KEY = 'studySentinelSoundSettings_v1';
const EARNED_BADGES_KEY = 'studySentinelEarnedBadges_v3';
const CUSTOM_BADGES_KEY = 'studySentinelCustomBadges_v3';
const SYSTEM_BADGES_CONFIG_KEY = 'studySentinelSystemBadgesConfig_v3';
const TIMER_KEY = 'studySentinelActiveTimer_v3';

// Mocking localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Confetti
jest.mock('@/components/providers/confetti-provider', () => ({
    useConfetti: () => ({ fire: jest.fn() }),
}));

// Mock badge checking logic to isolate component
jest.mock('@/lib/badges', () => ({
    ...jest.requireActual('@/lib/badges'),
    checkBadge: jest.fn().mockReturnValue(false),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <GlobalStateProvider>{children}</GlobalStateProvider>
);
describe('useGlobalState - Initialization & Error Handling', () => {
  it('should handle errors when loading from localStorage and reset to default state', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Set corrupted JSON in localStorage
    localStorageMock.setItem(TASKS_KEY, 'not a valid json');
    localStorageMock.setItem(PROFILE_KEY, '{"name": "test"'); // Malformed

    const { result } = renderHook(() => useGlobalState(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.isLoaded).toBe(true);
    });

    // Should log an error
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load state from localStorage', expect.any(Error));

    // State should be reset to initial defaults, not empty or broken
    expect(result.current.state.tasks).toEqual([]);
    expect(result.current.state.profile.name).toBe('');
    expect(result.current.state.routines).toEqual([]);

    consoleErrorSpy.mockRestore();
  });
});

describe('useGlobalState - Optimistic Updates & Offline', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-07-30T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    localStorageMock.clear();
    // Seed local storage with empty arrays to avoid initialization errors
    localStorageMock.setItem(TASKS_KEY, '[]');
    localStorageMock.setItem(ROUTINES_KEY, '[]');
    localStorageMock.setItem(`${LOG_PREFIX}2025-07-30`, '[]');
  });

  describe('addTask', () => {
    const taskToAdd: Omit<StudyTask, 'id' | 'status' | 'shortId'> = {
      title: 'Test Task',
      date: '2025-07-30',
      time: '10:00',
      points: 10,
      priority: 'medium',
      timerType: 'countdown',
      duration: 30,
    };

    it('should optimistically add a task and then confirm with server response', async () => {
      const serverTask = { ...taskToAdd, id: 'server-id-123', shortId: 'T-123', status: 'todo' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => serverTask,
      });

      const { result } = renderHook(() => useGlobalState(), { wrapper });

      act(() => {
        result.current.addTask(taskToAdd);
      });

      // 1. Check for immediate optimistic update
      expect(result.current.state.tasks).toHaveLength(1);
      const optimisticTask = result.current.state.tasks[0];
      expect(optimisticTask.title).toBe('Test Task');
      expect(optimisticTask.id).toMatch(/^temp_/);

      // 2. Wait for the state to be confirmed with the server response
      await waitFor(() => {
        const confirmedTask = result.current.state.tasks[0];
        expect(confirmedTask.id).toBe('server-id-123');
      });

      // 3. Check the final state
      const confirmedTask = result.current.state.tasks[0];
      expect(confirmedTask.title).toBe('Test Task');

      // 3. Verify fetch was called correctly
      expect(fetch).toHaveBeenCalledWith('/api/tasks', expect.any(Object));
      
      // 4. Verify localStorage was updated
      const storedTasks = JSON.parse(localStorageMock.getItem('studySentinelTasks_v3') || '[]');
      expect(storedTasks).toHaveLength(1);
      expect(storedTasks[0].id).toBe('server-id-123');
    });

    it('should optimistically add a task and persist it for background sync on network failure', async () => {
      // Suppress console.error for this test as the error is expected
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => useGlobalState(), { wrapper });

      act(() => {
        result.current.addTask(taskToAdd);
      });

      // 1. Check for immediate optimistic update
      expect(result.current.state.tasks).toHaveLength(1);
      const optimisticTask = result.current.state.tasks[0];
      expect(optimisticTask.title).toBe('Test Task');
      expect(optimisticTask.id).toMatch(/^temp_/);

      // 2. Wait for the catch block to run by checking for the offline log
      await waitFor(() => {
        const todaysLogs = result.current.state.todaysLogs;
        expect(todaysLogs.some(log => log.type === 'TASK_ADD_OFFLINE')).toBe(true);
      });

      // 3. Check that the optimistic state is still present
      expect(result.current.state.tasks).toHaveLength(1);
      expect(result.current.state.tasks[0].id).toBe(optimisticTask.id);

      // 4. Verify localStorage was updated with the optimistic data
      const storedTasks = JSON.parse(localStorageMock.getItem('studySentinelTasks_v3') || '[]');
      expect(storedTasks).toHaveLength(1);
      expect(storedTasks[0].id).toBe(optimisticTask.id);

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateTask', () => {
    const initialTask: StudyTask = {
      id: 'task-1',
      shortId: 'T-1',
      title: 'Initial Task',
      date: '2025-07-30',
      time: '11:00',
      points: 5,
      priority: 'low',
      timerType: 'infinity',
      status: 'todo',
    };

    const updatedTaskData: StudyTask = {
      ...initialTask,
      title: 'Updated Task Title',
      priority: 'high',
    };


    beforeEach(() => {
      localStorageMock.setItem(TASKS_KEY, JSON.stringify([initialTask]));
    });

    it('should optimistically update a task and confirm on success', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTaskData,
      });

      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Wait for initial state to be loaded from mock localStorage
      await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));

      act(() => {
        result.current.updateTask(updatedTaskData);
      });

      // 1. Check for immediate optimistic update
      expect(result.current.state.tasks[0].title).toBe('Updated Task Title');
      expect(result.current.state.tasks[0].priority).toBe('high');

      // 2. Wait for the server confirmation by checking for the log
      await waitFor(() => {
        expect(result.current.state.todaysLogs.some(log => log.type === 'TASK_UPDATE')).toBe(true);
      });

      // 3. Verify final state and persistence
      const finalTasks = result.current.state.tasks;
      expect(finalTasks[0].title).toBe('Updated Task Title');
      const storedTasks = JSON.parse(localStorageMock.getItem(TASKS_KEY) || '[]');
      expect(storedTasks[0].title).toBe('Updated Task Title');
    });

    it('should revert the optimistic update on network failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Wait for initial state to be loaded
      await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));
      
      act(() => {
        result.current.updateTask(updatedTaskData);
      });

      // 1. Check for immediate optimistic update
      expect(result.current.state.tasks[0].title).toBe('Updated Task Title');

      // 2. Wait for the state to revert after network failure
      await waitFor(() => {
        expect(result.current.state.tasks[0].title).toBe('Initial Task');
      });

      // 3. Verify the state is reverted and localStorage is correct
      expect(result.current.state.tasks[0].priority).toBe('low');
      const storedTasks = JSON.parse(localStorageMock.getItem(TASKS_KEY) || '[]');
      expect(storedTasks[0].title).toBe('Initial Task');

      // 4. Verify the offline log was created
      expect(result.current.state.todaysLogs.some(log => log.type === 'TASK_UPDATE_OFFLINE')).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('archiveTask', () => {
    const initialTask: StudyTask = {
      id: 'task-to-archive',
      shortId: 'T-ARC',
      title: 'Archive Me',
      date: '2025-07-30',
      time: '12:00',
      points: 10,
      priority: 'medium',
      timerType: 'countdown',
      status: 'todo',
    };


    beforeEach(() => {
      localStorageMock.setItem(TASKS_KEY, JSON.stringify([initialTask]));
    });

    it('should optimistically archive a task and confirm on success', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useGlobalState(), { wrapper });
      await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));

      act(() => {
        result.current.archiveTask('task-to-archive');
      });

      // Optimistic check
      expect(result.current.state.tasks[0].status).toBe('archived');

      // Wait for confirmation
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/tasks/task-to-archive/archive', expect.any(Object));
        expect(result.current.state.todaysLogs.some(log => log.type === 'TASK_ARCHIVE')).toBe(true);
      });

      const storedTasks = JSON.parse(localStorageMock.getItem(TASKS_KEY) || '[]');
      expect(storedTasks[0].status).toBe('archived');
    });

    it('should revert the optimistic archive on network failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => useGlobalState(), { wrapper });
      await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));

      act(() => {
        result.current.archiveTask('task-to-archive');
      });

      // Optimistic check
      expect(result.current.state.tasks[0].status).toBe('archived');

      // Wait for revert
      await waitFor(() => {
        expect(result.current.state.tasks[0].status).toBe('todo');
      });

      const storedTasks = JSON.parse(localStorageMock.getItem(TASKS_KEY) || '[]');
      expect(storedTasks[0].status).toBe('todo');
      expect(result.current.state.todaysLogs.some(log => log.type === 'TASK_ARCHIVE_OFFLINE')).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('unarchiveTask', () => {
    const initialTask: StudyTask = {
      id: 'task-to-unarchive',
      shortId: 'T-UNARC',
      title: 'Unarchive Me',
      date: '2025-07-30',
      time: '13:00',
      points: 5,
      priority: 'low',
      timerType: 'infinity',
      status: 'archived',
    };


    beforeEach(() => {
      localStorageMock.setItem(TASKS_KEY, JSON.stringify([initialTask]));
    });

    it('should revert the optimistic unarchive on network failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => useGlobalState(), { wrapper });
      await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));

      act(() => {
        result.current.unarchiveTask('task-to-unarchive');
      });

      // Optimistic check
      expect(result.current.state.tasks[0].status).toBe('todo');

      // Wait for revert
      await waitFor(() => {
        expect(result.current.state.tasks[0].status).toBe('archived');
      });

      const storedTasks = JSON.parse(localStorageMock.getItem(TASKS_KEY) || '[]');
      expect(storedTasks[0].status).toBe('archived');
      expect(result.current.state.todaysLogs.some(log => log.type === 'TASK_UNARCHIVE_OFFLINE')).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('pushTaskToNextDay', () => {
    const initialTask: StudyTask = {
      id: 'task-to-push',
      shortId: 'T-PUSH',
      title: 'Push Me',
      date: '2025-07-30',
      time: '14:00',
      points: 15,
      priority: 'high',
      timerType: 'countdown',
      status: 'todo',
    };


    beforeEach(() => {
      localStorageMock.setItem(TASKS_KEY, JSON.stringify([initialTask]));
    });

    it('should revert the optimistic push on network failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => useGlobalState(), { wrapper });
      await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));

      act(() => {
        result.current.pushTaskToNextDay('task-to-push');
      });

      // Optimistic check
      expect(result.current.state.tasks[0].date).toBe('2025-07-31');

      // Wait for revert
      await waitFor(() => {
        expect(result.current.state.tasks[0].date).toBe('2025-07-30');
      });

      const storedTasks = JSON.parse(localStorageMock.getItem(TASKS_KEY) || '[]');
      expect(storedTasks[0].date).toBe('2025-07-30');
      expect(result.current.state.todaysLogs.some(log => log.type === 'TASK_PUSH_NEXT_DAY_OFFLINE')).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('addRoutine', () => {
    const routineToAdd = {
        title: 'Evening Routine',
        days: [1, 2, 3, 4, 5],
        startTime: '20:00',
        endTime: '21:00',
        priority: 'medium' as const,
    };

    it('should optimistically add a routine and persist for background sync on network failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => useGlobalState(), { wrapper });

      act(() => {
        result.current.addRoutine(routineToAdd);
      });

      // Optimistic check
      expect(result.current.state.routines).toHaveLength(1);
      const optimisticRoutine = result.current.state.routines[0];
      expect(optimisticRoutine.title).toBe('Evening Routine');
      expect(optimisticRoutine.id).toMatch(/^temp_/);

      // Wait for offline log
      await waitFor(() => {
        expect(result.current.state.todaysLogs.some(log => log.type === 'ROUTINE_ADD_OFFLINE')).toBe(true);
      });

      const storedRoutines = JSON.parse(localStorageMock.getItem('studySentinelRoutines_v3') || '[]');
      expect(storedRoutines).toHaveLength(1);
      expect(storedRoutines[0].id).toBe(optimisticRoutine.id);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateRoutine', () => {
    const initialRoutine = {
        id: 'routine-to-update',
        shortId: 'R-UPD',
        title: 'Initial Routine',
        days: [1, 2, 3],
        startTime: '07:00',
        endTime: '07:30',
        priority: 'medium' as const,
    };

    const updatedRoutineData = {
        ...initialRoutine,
        title: 'Updated Routine Title',
        priority: 'high' as const,
    };

    beforeEach(() => {
      localStorageMock.setItem(ROUTINES_KEY, JSON.stringify([initialRoutine]));
    });

    it('should optimistically update a routine and confirm on success', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => updatedRoutineData,
        });
  
        const { result } = renderHook(() => useGlobalState(), { wrapper });
        await waitFor(() => expect(result.current.state.routines).toHaveLength(1));
  
        act(() => {
          result.current.updateRoutine(updatedRoutineData);
        });
  
        // Optimistic check
        expect(result.current.state.routines[0].title).toBe('Updated Routine Title');
  
        // Wait for confirmation
        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith('/api/routines/routine-to-update', expect.any(Object));
        });
  
        await waitFor(() => {
            const storedRoutines = JSON.parse(localStorageMock.getItem(ROUTINES_KEY) || '[]');
            expect(storedRoutines[0].title).toBe('Updated Routine Title');
        });
      });

    it('should optimistically update a routine and revert on failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => useGlobalState(), { wrapper });
      await waitFor(() => expect(result.current.state.routines).toHaveLength(1));

      act(() => {
        result.current.updateRoutine(updatedRoutineData);
      });

      // Optimistic check
      expect(result.current.state.routines[0].title).toBe('Updated Routine Title');

      // Wait for revert
      await waitFor(() => {
        expect(result.current.state.routines[0].title).toBe('Initial Routine');
      });

      const storedRoutines = JSON.parse(localStorageMock.getItem(ROUTINES_KEY) || '[]');
      expect(storedRoutines[0].title).toBe('Initial Routine');
      expect(result.current.state.todaysLogs.some(log => log.type === 'ROUTINE_UPDATE_OFFLINE')).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteRoutine', () => {
    const initialRoutine = {
        id: 'routine-1',
        shortId: 'R-1',
        title: 'Morning Routine',
        days: [1, 2, 3, 4, 5],
        startTime: '08:00',
        endTime: '09:00',
        priority: 'high' as const,
    };
    beforeEach(() => {
      localStorageMock.setItem(ROUTINES_KEY, JSON.stringify([initialRoutine]));
    });

    it('should optimistically delete a routine and confirm on success', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
        const { result } = renderHook(() => useGlobalState(), { wrapper });
        await waitFor(() => expect(result.current.state.routines).toHaveLength(1));

        act(() => {
            result.current.deleteRoutine('routine-1');
        });

        // Optimistic check
        expect(result.current.state.routines).toHaveLength(0);

        // Wait for confirmation and for the .then() block to execute, updating localStorage
        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/api/routines/routine-1', expect.any(Object));
            const storedRoutines = JSON.parse(localStorageMock.getItem(ROUTINES_KEY) || '[]');
            expect(storedRoutines).toHaveLength(0);
        });
    });

    it('should revert the optimistic delete on network failure', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));

        const { result } = renderHook(() => useGlobalState(), { wrapper });
        await waitFor(() => expect(result.current.state.routines).toHaveLength(1));

        act(() => {
            result.current.deleteRoutine('routine-1');
        });

        // Optimistic check
        expect(result.current.state.routines).toHaveLength(0);

        // Wait for revert
        await waitFor(() => {
            expect(result.current.state.routines).toHaveLength(1);
        });

        expect(result.current.state.routines[0].title).toBe('Morning Routine');
        const storedRoutines = JSON.parse(localStorageMock.getItem(ROUTINES_KEY) || '[]');
        expect(storedRoutines).toHaveLength(1);
        expect(result.current.state.todaysLogs.some(log => log.type === 'ROUTINE_DELETE_OFFLINE')).toBe(true);

        consoleErrorSpy.mockRestore();
    });
  });
});

describe('useGlobalState - State Logic and Derived State', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    localStorageMock.clear();
    (checkBadge as jest.Mock).mockClear();
    // Seed with empty data
    localStorageMock.setItem(TASKS_KEY, '[]');
    localStorageMock.setItem(ROUTINES_KEY, '[]');
    localStorageMock.setItem(PROFILE_KEY, '{}');
    localStorageMock.setItem(`${LOG_PREFIX}2025-07-30`, '[]');
  });

  it('should update profile settings', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    
    const newProfileData = { name: 'John Doe', dailyStudyGoal: 5 };
    
    act(() => {
      result.current.updateProfile(newProfileData);
    });

    await waitFor(() => {
      expect(result.current.state.profile.name).toBe('John Doe');
      expect(result.current.state.profile.dailyStudyGoal).toBe(5);
    });

    const storedProfile = JSON.parse(localStorageMock.getItem('studySentinelProfile_v3') || '{}');
    expect(storedProfile.name).toBe('John Doe');
  });

  it('should update sound settings', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });

    const newSoundSettings = { alarm: 'bell', tick: 'digital_tick' };

    act(() => {
      result.current.setSoundSettings(newSoundSettings);
    });

    await waitFor(() => {
      expect(result.current.state.soundSettings.alarm).toBe('bell');
      expect(result.current.state.soundSettings.tick).toBe('digital_tick');
    });

    const storedSettings = JSON.parse(localStorageMock.getItem(SOUND_SETTINGS_KEY) || '{}');
    expect(storedSettings.alarm).toBe('bell');
  });

  it('should toggle mute state', () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    
    expect(result.current.state.isMuted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.state.isMuted).toBe(true);

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.state.isMuted).toBe(false);
  });

  it('should correctly derive todaysActivity from logs', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });

    const task: StudyTask = {
      id: 'task-1',
      shortId: 'T-1',
      title: 'Completed Task',
      date: '2025-07-30',
      time: '10:00',
      duration: 30,
      points: 10,
      status: 'completed',
      priority: 'medium',
      timerType: 'countdown',
    };
    const routineLog = { routineId: 'routine-1', title: 'Morning Routine', duration: 600, points: 20 };
    const stoppedTaskLog = { taskId: 'task-2', title: 'Stopped Task', reason: 'Interrupted' };

    act(() => {
      // Manually set tasks for the activity feed to find
      result.current.state.tasks.push(task);
    });
    
    act(() => {
      result.current.addLog('TIMER_SESSION_COMPLETE', { taskId: 'task-1', ...task });
      result.current.addLog('ROUTINE_SESSION_COMPLETE', routineLog);
      result.current.addLog('TIMER_STOP', stoppedTaskLog);
    });

    await waitFor(() => {
      expect(result.current.state.todaysActivity).toHaveLength(3);
    });
    
    const { todaysActivity } = result.current.state;

    const completedTaskActivity = todaysActivity.find(a => a.type === 'TASK_COMPLETE');
    expect(completedTaskActivity).toBeDefined();
    expect(completedTaskActivity?.data.task.title).toBe('Completed Task');

    const completedRoutineActivity = todaysActivity.find(a => a.type === 'ROUTINE_COMPLETE');
    expect(completedRoutineActivity).toBeDefined();
    expect(completedRoutineActivity?.data.payload.title).toBe('Morning Routine');

    const stoppedTaskActivity = todaysActivity.find(a => a.type === 'TASK_STOPPED');
    expect(stoppedTaskActivity).toBeDefined();
    expect(stoppedTaskActivity?.data.payload.title).toBe('Stopped Task');
  });

  it('should handle manually completed tasks in todaysActivity', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });

    const manualTask: StudyTask = {
      id: 'manual-task-1',
      shortId: 'T-MAN',
      title: 'Manually Completed',
      date: '2025-07-30',
      time: '15:00',
      points: 15,
      priority: 'high',
      timerType: 'infinity',
      status: 'todo',
    };
    
    // Mock fetch for the updateTask call inside manuallyCompleteItem
    (fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...manualTask, status: 'completed' }),
      })
    );

    act(() => {
      result.current.state.tasks.push(manualTask);
    });

    act(() => {
      result.current.manuallyCompleteItem(manualTask, 45, 'Did some research');
    });

    await waitFor(() => {
      const activity = result.current.state.todaysActivity.find((a: any) => a.type === 'TASK_COMPLETE' && a.data.task.id === 'manual-task-1');
      expect(activity).toBeDefined();
      // Note: The log structure for manual completion is different in the implementation
      // We check the log that *triggers* the completion.
      const log = result.current.state.todaysLogs.find((l: any) => l.payload.taskId === 'manual-task-1');
      expect(log?.payload.manual).toBe(true);
      expect(log?.payload.notes).toBe('Did some research');
      expect(result.current.state.tasks.find((t: any) => t.id === 'manual-task-1')?.status).toBe('completed');
    });
  });

  it('should handle manually completing a routine', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });

    const manualRoutine = {
        id: 'manual-routine-1',
        shortId: 'R-MAN',
        title: 'Manually Completed Routine',
        days: [0,1,2,3,4,5,6],
        startTime: '16:00',
        endTime: '17:00',
        priority: 'low' as const, // 1x multiplier
    };
    
    act(() => {
      result.current.manuallyCompleteItem(manualRoutine, 30, 'Completed my afternoon routine.');
    });

    await waitFor(() => {
      const log = result.current.state.todaysLogs.find((l: any) => l.payload.routineId === 'manual-routine-1');
      expect(log).toBeDefined();
      expect(log?.type).toBe('ROUTINE_SESSION_COMPLETE');
      expect(log?.payload.manual).toBe(true);
      expect(log?.payload.studyLog).toBe('Completed my afternoon routine.');
      // 30 minutes * 1 (low priority) = 30 points
      expect(log?.payload.points).toBe(30);
    });
  });
});

describe('useGlobalState - Timer Logic', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const timerTask: StudyTask = {
    id: 'timer-task-1',
    shortId: 'T-TIMER',
    title: 'Task with Timer',
    date: '2025-07-30',
    time: '16:00',
    points: 25,
    priority: 'high',
    timerType: 'countdown',
    duration: 25,
    status: 'todo',
  };

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    localStorageMock.clear();
    localStorageMock.setItem(TASKS_KEY, JSON.stringify([timerTask]));
    localStorageMock.setItem(`${LOG_PREFIX}2025-07-30`, '[]');
    // Mock fetch for the updateTask call that happens inside startTimer
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...timerTask, status: 'in_progress' }),
    });
  });

  it('should start the timer for a task', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));

    act(() => {
      result.current.startTimer(timerTask);
    });

    await waitFor(() => {
      expect(result.current.state.activeItem).not.toBeNull();
      expect(result.current.state.activeItem?.item.id).toBe('timer-task-1');
      expect(result.current.state.isPaused).toBe(false);
    });

    // Check task status update
    expect(result.current.state.tasks.find(t => t.id === 'timer-task-1')?.status).toBe('in_progress');

    // Check log
    expect(result.current.state.todaysLogs.some(log => log.type === 'TIMER_START')).toBe(true);

    // Check localStorage
    const storedTimer = JSON.parse(localStorageMock.getItem(TIMER_KEY) || '{}');
    expect(storedTimer.item.item.id).toBe('timer-task-1');
  });

  it('should pause and resume the timer', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));

    act(() => {
      result.current.startTimer(timerTask);
    });

    await waitFor(() => expect(result.current.state.isPaused).toBe(false));

    // Pause the timer
    act(() => {
      result.current.togglePause();
    });

    expect(result.current.state.isPaused).toBe(true);
    let storedTimer = JSON.parse(localStorageMock.getItem(TIMER_KEY) || '{}');
    expect(storedTimer.isPaused).toBe(true);
    expect(result.current.state.todaysLogs.some(log => log.type === 'TIMER_PAUSE')).toBe(true);

    // Resume the timer
    act(() => {
      result.current.togglePause();
    });

    expect(result.current.state.isPaused).toBe(false);
    storedTimer = JSON.parse(localStorageMock.getItem(TIMER_KEY) || '{}');
    expect(storedTimer.isPaused).toBe(false);
    // A new 'TIMER_START' log is created on resume
    expect(result.current.state.todaysLogs.filter(log => log.type === 'TIMER_START').length).toBe(2);
  });

  it('should complete the timer for a task', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));
    
    // Mock fetch for the final updateTask call
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...timerTask, status: 'completed' }),
    });

    act(() => {
      result.current.startTimer(timerTask);
    });

    await waitFor(() => expect(result.current.state.activeItem).not.toBeNull());

    act(() => {
      result.current.completeTimer('Finished my study session.');
    });

    await waitFor(() => {
      expect(result.current.state.activeItem).toBeNull();
      expect(result.current.state.tasks.find(t => t.id === 'timer-task-1')?.status).toBe('completed');
    });

    const completeLog = result.current.state.todaysLogs.find(log => log.type === 'TIMER_SESSION_COMPLETE');
    expect(completeLog).toBeDefined();
    expect(completeLog?.payload.taskId).toBe('timer-task-1');
    
    expect(localStorageMock.getItem(TIMER_KEY)).toBeNull();
  });

  it('should correctly calculate points for an infinity timer task upon completion', async () => {
    const infinityTask: StudyTask = {
      ...timerTask,
      id: 'infinity-task-1',
      timerType: 'infinity',
      priority: 'medium', // 2x multiplier
    };
    localStorageMock.setItem(TASKS_KEY, JSON.stringify([infinityTask]));
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...infinityTask, status: 'in_progress' }),
    });

    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));

    act(() => {
      result.current.startTimer(infinityTask);
    });

    await waitFor(() => expect(result.current.state.activeItem).not.toBeNull());

    // Advance time by 10 minutes (600 seconds)
    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });
    
    (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...infinityTask, status: 'completed' }),
    });

    act(() => {
      result.current.completeTimer();
    });

    await waitFor(() => {
      expect(result.current.state.activeItem).toBeNull();
    });

    const completeLog = result.current.state.todaysLogs.find(log => log.type === 'TIMER_SESSION_COMPLETE');
    expect(completeLog).toBeDefined();
    // 10 minutes * 2 (medium priority) = 20 points
    expect(completeLog?.payload.points).toBe(20);
  });

  it('should stop the timer for a routine', async () => {
    const routine = {
        id: 'routine-stop-1',
        shortId: 'R-STP',
        title: 'Routine to Stop',
        days: [0,1,2,3,4,5,6],
        startTime: '12:00',
        endTime: '13:00',
        priority: 'high' as const, // 3x multiplier
    };
    localStorageMock.setItem(ROUTINES_KEY, JSON.stringify([routine]));

    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.routines).toHaveLength(1));

    act(() => {
      result.current.startTimer(routine);
    });

    await waitFor(() => expect(result.current.state.activeItem).not.toBeNull());

    // Advance time by 5 minutes
    act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
    });

    act(() => {
      result.current.stopTimer('Interrupted by user');
    });

    await waitFor(() => {
      expect(result.current.state.activeItem).toBeNull();
    });

    const stopLog = result.current.state.todaysLogs.find(log => log.type === 'ROUTINE_SESSION_COMPLETE');
    expect(stopLog).toBeDefined();
    expect(stopLog?.payload.routineId).toBe('routine-stop-1');
    expect(stopLog?.payload.stopped).toBe(true);
    // 5 minutes * 3 (high priority) = 15 points
    expect(stopLog?.payload.points).toBe(15);

    expect(localStorageMock.getItem(TIMER_KEY)).toBeNull();
  });

  it('should complete the timer for a routine', async () => {
    const routine = {
        id: 'routine-complete-1',
        shortId: 'R-CMP',
        title: 'Routine to Complete',
        days: [0,1,2,3,4,5,6],
        startTime: '14:00',
        endTime: '15:00',
        priority: 'medium' as const, // 2x multiplier
    };
    localStorageMock.setItem(ROUTINES_KEY, JSON.stringify([routine]));

    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.routines).toHaveLength(1));

    act(() => {
      result.current.startTimer(routine);
    });

    await waitFor(() => expect(result.current.state.activeItem).not.toBeNull());

    // Advance time by 20 minutes
    act(() => {
        jest.advanceTimersByTime(20 * 60 * 1000);
    });

    act(() => {
      result.current.completeTimer('Finished the routine successfully.');
    });

    await waitFor(() => {
      expect(result.current.state.activeItem).toBeNull();
    });

    const completeLog = result.current.state.todaysLogs.find(log => log.type === 'ROUTINE_SESSION_COMPLETE');
    expect(completeLog).toBeDefined();
    expect(completeLog?.payload.routineId).toBe('routine-complete-1');
    expect(completeLog?.payload.stopped).toBeUndefined();
    expect(completeLog?.payload.studyLog).toBe('Finished the routine successfully.');
    // 20 minutes * 2 (medium priority) = 40 points
    expect(completeLog?.payload.points).toBe(40);

    expect(localStorageMock.getItem(TIMER_KEY)).toBeNull();
  });

  it('should stop the timer for a task', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));

    // Mock fetch for the final updateTask call
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...timerTask, status: 'todo' }),
    });

    act(() => {
      result.current.startTimer(timerTask);
    });

    await waitFor(() => expect(result.current.state.activeItem).not.toBeNull());

    act(() => {
      result.current.stopTimer('Interrupted');
    });

    await waitFor(() => {
      expect(result.current.state.activeItem).toBeNull();
      expect(result.current.state.tasks.find(t => t.id === 'timer-task-1')?.status).toBe('todo');
    });

    const stopLog = result.current.state.todaysLogs.find(log => log.type === 'TIMER_STOP');
    expect(stopLog).toBeDefined();
    expect(stopLog?.payload.reason).toBe('Interrupted');

    expect(localStorageMock.getItem(TIMER_KEY)).toBeNull();
  });

  it('should not start a new timer if one is already active', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.tasks).toHaveLength(1));

    const toastSpy = jest.spyOn(require('react-hot-toast').default, 'error');

    // Start the first timer
    act(() => {
      result.current.startTimer(timerTask);
    });

    await waitFor(() => expect(result.current.state.activeItem).not.toBeNull());

    // Attempt to start another timer
    const anotherTask = { ...timerTask, id: 'another-task' };
    act(() => {
      result.current.startTimer(anotherTask);
    });

    // Verify that the active item has not changed
    expect(result.current.state.activeItem?.item.id).toBe('timer-task-1');
    
    // Verify that an error toast was shown
    expect(toastSpy).toHaveBeenCalledWith('Please stop or complete the timer for "Task with Timer" first.');

    toastSpy.mockRestore();
  });

   it('should start the timer for a routine', async () => {
    const routine = {
        id: 'routine-timer-1',
        shortId: 'R-TMR',
        title: 'Routine with Timer',
        days: [0,1,2,3,4,5,6],
        startTime: '10:00',
        endTime: '11:00',
        priority: 'medium' as const,
    };
    localStorageMock.setItem(ROUTINES_KEY, JSON.stringify([routine]));

    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.routines).toHaveLength(1));

    act(() => {
      result.current.startTimer(routine);
    });

    await waitFor(() => {
      expect(result.current.state.activeItem).not.toBeNull();
      expect(result.current.state.activeItem?.item.id).toBe('routine-timer-1');
      expect(result.current.state.isPaused).toBe(false);
    });

    // Check log
    expect(result.current.state.todaysLogs.some(log => log.type === 'TIMER_START' && log.payload.routineId === 'routine-timer-1')).toBe(true);

    // Check localStorage
    const storedTimer = JSON.parse(localStorageMock.getItem(TIMER_KEY) || '{}');
    expect(storedTimer.item.item.id).toBe('routine-timer-1');
  });
});

describe('useGlobalState - Badge Management', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    localStorageMock.clear();
    (checkBadge as jest.Mock).mockClear();
    // Seed with empty data and default system badges
    localStorageMock.setItem(TASKS_KEY, '[]');
    localStorageMock.setItem(ROUTINES_KEY, '[]');
    localStorageMock.setItem(PROFILE_KEY, '{}');
    localStorageMock.setItem(`${LOG_PREFIX}2025-07-30`, '[]');
    localStorageMock.setItem(EARNED_BADGES_KEY, '[]');
  });

  it('should add a new custom badge', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.isLoaded).toBe(true));

    const newBadgeData = {
      name: 'Test Badge',
      description: 'A badge for testing',
      isCustom: true,
      isEnabled: true,
      category: 'daily' as const,
      icon: 'test-icon',
      requiredCount: 1,
      conditions: [{ type: 'TASKS_COMPLETED' as const, target: 1, timeframe: 'DAY' as const }]
    };

    act(() => {
      result.current.addBadge(newBadgeData);
    });

    await waitFor(() => {
      expect(result.current.state.allBadges.some(b => b.name === 'Test Badge')).toBe(true);
    });

    const customBadges = JSON.parse(localStorageMock.getItem(CUSTOM_BADGES_KEY) || '[]');
    expect(customBadges).toHaveLength(1);
    expect(customBadges[0].name).toBe('Test Badge');
  });

  it('should update a badge', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.isLoaded).toBe(true));

    const systemBadgeToUpdate = result.current.state.allBadges.find(b => !b.isCustom);
    expect(systemBadgeToUpdate).toBeDefined();

    const updatedBadge = { ...systemBadgeToUpdate!, isEnabled: false };

    act(() => {
      result.current.updateBadge(updatedBadge);
    });

    await waitFor(() => {
      const badgeInState = result.current.state.allBadges.find(b => b.id === updatedBadge.id);
      expect(badgeInState?.isEnabled).toBe(false);
    });

    const systemBadgeConfigs = JSON.parse(localStorageMock.getItem(SYSTEM_BADGES_CONFIG_KEY) || '[]');
    expect(systemBadgeConfigs.find((b: any) => b.id === updatedBadge.id).isEnabled).toBe(false);
  });

  it('should update a custom badge', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.isLoaded).toBe(true));

    const newBadgeData = {
      name: 'Custom Badge to Update',
      description: 'Initial Description',
      isCustom: true,
      isEnabled: true,
      category: 'daily' as const,
      icon: 'custom-icon',
      requiredCount: 1,
      conditions: [{ type: 'TASKS_COMPLETED' as const, target: 1, timeframe: 'DAY' as const }]
    };

    act(() => {
      result.current.addBadge(newBadgeData);
    });

    let customBadgeId: string | undefined;
    await waitFor(() => {
      const customBadge = result.current.state.allBadges.find(b => b.name === 'Custom Badge to Update');
      expect(customBadge).toBeDefined();
      customBadgeId = customBadge!.id;
    });

    const updatedBadge = { 
        ...result.current.state.allBadges.find(b => b.id === customBadgeId)!, 
        description: 'Updated Description' 
    };

    act(() => {
      result.current.updateBadge(updatedBadge);
    });

    await waitFor(() => {
      const badgeInState = result.current.state.allBadges.find(b => b.id === customBadgeId);
      expect(badgeInState?.description).toBe('Updated Description');
    });

    const customBadges = JSON.parse(localStorageMock.getItem(CUSTOM_BADGES_KEY) || '[]');
    expect(customBadges.find((b: any) => b.id === customBadgeId).description).toBe('Updated Description');
  });

  it('should delete a custom badge', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.isLoaded).toBe(true));

    const newBadgeData = {
      name: 'To Delete',
      description: '...',
      isCustom: true,
      isEnabled: true,
      category: 'weekly' as const,
      icon: 'delete-icon',
      requiredCount: 5,
      conditions: [{ type: 'TASKS_COMPLETED' as const, target: 5, timeframe: 'WEEK' as const }]
    };
    
    act(() => {
      result.current.addBadge(newBadgeData);
    });

    let customBadgeId: string | undefined;
    await waitFor(() => {
      const customBadge = result.current.state.allBadges.find(b => b.name === 'To Delete');
      expect(customBadge).toBeDefined();
      customBadgeId = customBadge!.id;
    });

    act(() => {
      result.current.deleteBadge(customBadgeId!);
    });

    await waitFor(() => {
      expect(result.current.state.allBadges.some(b => b.id === customBadgeId)).toBe(false);
    });
    
    const customBadges = JSON.parse(localStorageMock.getItem(CUSTOM_BADGES_KEY) || '[]');
    expect(customBadges).toHaveLength(0);
  });

  it('should remove an earned badge when a badge is deleted', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.isLoaded).toBe(true));

    const badgeToEarnThenDelete = result.current.state.allBadges.find(b => !b.isCustom);
    expect(badgeToEarnThenDelete).toBeDefined();
    
    // Manually earn the badge
    act(() => {
        const newEarnedMap = new Map(result.current.state.earnedBadges);
        newEarnedMap.set(badgeToEarnThenDelete!.id, '2025-07-30');
        result.current.state.earnedBadges = newEarnedMap;
    });

    expect(result.current.state.earnedBadges.has(badgeToEarnThenDelete!.id)).toBe(true);

    act(() => {
      result.current.deleteBadge(badgeToEarnThenDelete!.id);
    });

    await waitFor(() => {
      expect(result.current.state.allBadges.some(b => b.id === badgeToEarnThenDelete!.id)).toBe(false);
      expect(result.current.state.earnedBadges.has(badgeToEarnThenDelete!.id)).toBe(false);
    });

    const earnedBadges = JSON.parse(localStorageMock.getItem(EARNED_BADGES_KEY) || '[]');
    expect(earnedBadges.find((b: any) => b[0] === badgeToEarnThenDelete!.id)).toBeUndefined();
  });

  it('should award a badge when its criteria are met', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.isLoaded).toBe(true));

    // Find a specific, existing system badge to test against
    const badgeToEarn = result.current.state.allBadges.find(b => b.name === 'First Step');
    expect(badgeToEarn).toBeDefined();

    // Mock checkBadge to return true only for our target badge
    (checkBadge as jest.Mock).mockImplementation((badge) => {
      return badge.id === badgeToEarn!.id;
    });

    // Complete a task to trigger the badge check effect
    const task: StudyTask = { id: 'task-1', shortId: 'T-1', title: 'First Task', date: '2025-07-30', time: '10:00', duration: 30, points: 10, status: 'todo', priority: 'medium', timerType: 'countdown' };
    act(() => {
      result.current.state.tasks.push(task);
      result.current.addLog('TIMER_SESSION_COMPLETE', { taskId: 'task-1', ...task });
    });

    await waitFor(() => {
      expect(result.current.state.earnedBadges.has(badgeToEarn!.id)).toBe(true);
    });

    const earnedBadges = JSON.parse(localStorageMock.getItem(EARNED_BADGES_KEY) || '[]');
    expect(earnedBadges[0][0]).toBe(badgeToEarn!.id);
  });
});

describe('useGlobalState - Timer Milestones and Notifications', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const timerTask: StudyTask = {
    id: 'timer-task-1',
    shortId: 'T-TIMER',
    title: 'Long Study Session',
    date: '2025-07-30',
    time: '18:00',
    points: 50,
    priority: 'high',
    timerType: 'infinity',
    status: 'todo',
  };

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    localStorageMock.clear();
    localStorageMock.setItem(TASKS_KEY, JSON.stringify([timerTask]));
    localStorageMock.setItem(`${LOG_PREFIX}2025-07-30`, '[]');
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...timerTask, status: 'in_progress' }),
    });
  });

  it('should show a new quote and award a star after 30 minutes', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.isLoaded).toBe(true));
    
    const initialQuote = result.current.state.currentQuote;

    act(() => {
      result.current.startTimer(timerTask);
    });

    await waitFor(() => expect(result.current.state.activeItem).not.toBeNull());

    // Advance time by 30 minutes and 1 second to trigger the milestone
    act(() => {
      jest.advanceTimersByTime(30 * 60 * 1000 + 1000);
    });

    await waitFor(() => {
      // Check for new quote
      expect(result.current.state.currentQuote).not.toBe(initialQuote);
      // Check for star
      expect(result.current.state.starCount).toBe(1);
      expect(result.current.state.showStarAnimation).toBe(true);
    });
    
    // Check that the animation state resets
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() => {
        expect(result.current.state.showStarAnimation).toBe(false);
    });
  });

  it('should play a notification sound at the configured interval', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.state.isLoaded).toBe(true));

    // Set a 15-minute notification interval
    act(() => {
      result.current.setSoundSettings({ notificationInterval: 15 });
    });

    act(() => {
      result.current.startTimer(timerTask);
    });

    await waitFor(() => expect(result.current.state.activeItem).not.toBeNull());

    const toastSpy = jest.spyOn(require('react-hot-toast').default, 'success');

    // Advance time by 15 minutes and 1 second
    act(() => {
      jest.advanceTimersByTime(15 * 60 * 1000 + 1000);
    });

    await waitFor(() => {
      // A toast is shown when the notification sound plays
      expect(toastSpy).toHaveBeenCalled();
    });

    toastSpy.mockRestore();
  });
});