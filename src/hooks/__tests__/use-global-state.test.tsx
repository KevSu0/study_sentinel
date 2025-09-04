import React from 'react';
import { renderHook, act, render, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useGlobalState, GlobalStateProvider } from '../use-global-state';
import { format } from 'date-fns';

// Mock all external dependencies

jest.mock('react-confetti', () => {
  const MockConfetti = (props: { onConfettiComplete?: () => void }) => {
    if (props.onConfettiComplete) {
      setTimeout(props.onConfettiComplete, 100);
    }
    return null;
  };
  MockConfetti.displayName = 'MockConfetti';
  return MockConfetti;
});

jest.mock('@/components/providers/confetti-provider', () => ({
  useConfetti: () => ({ fire: jest.fn() }),
}));

jest.mock('@/lib/badges', () => ({
  awardBadges: jest.fn(() => []),
  SYSTEM_BADGES: [
    { name: 'Test Badge', description: 'Test description', icon: 'test-icon' },
  ],
}));

jest.mock('@/lib/utils', () => ({
  getSessionDate: jest.fn(() => '2024-01-15'),
  getStudyDateForTimestamp: jest.fn(() => '2024-01-15'),
  getStudyDay: jest.fn(() => 1),
  cn: jest.fn((...args) => args.join(' ')),
  formatDuration: jest.fn((minutes) => `${minutes}m`),
  generateShortId: jest.fn((prefix) => `${prefix}123`),
}));

jest.mock('@/lib/motivation', () => ({
  getRandomQuote: jest.fn(() => ({ text: 'Test quote', author: 'Test Author' })),
  motivationalQuotes: ['Test quote 1', 'Test quote 2'],
}));

jest.mock('@/lib/repositories', () => ({
  createTaskRepository: jest.fn(() => ({
    getAll: jest.fn(() => Promise.resolve([])),
    add: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    getById: jest.fn(() => Promise.resolve(null)),
  })),
  createRoutineRepository: jest.fn(() => ({
    getAll: jest.fn(() => Promise.resolve([])),
    add: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    getById: jest.fn(() => Promise.resolve(null)),
  })),
  createLogRepository: jest.fn(() => ({
    getAll: jest.fn(() => Promise.resolve([])),
    add: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    getById: jest.fn(() => Promise.resolve(null)),
    getLogsByDate: jest.fn(() => Promise.resolve([])),
  })),
  createBadgeRepository: jest.fn(() => ({
    getAll: jest.fn(() => Promise.resolve([])),
    add: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    getById: jest.fn(() => Promise.resolve(null)),
  })),
  createProfileRepository: jest.fn(() => ({
    getAll: jest.fn(() => Promise.resolve([])),
    add: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    getById: jest.fn(() => Promise.resolve(null)),
  })),
}));

jest.mock('@/utils/sync-engine', () => ({
  SyncEngine: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => jest.fn()),
    sync: jest.fn(),
    clear: jest.fn(),
  })),
  syncEngine: {
    addListener: jest.fn(() => jest.fn()),
    sync: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15';
    if (formatStr === 'HH:mm') return '10:00';
    return '2024-01-15';
  }),
  formatISO: jest.fn(() => '2024-01-15T10:00:00.000Z'),
  addDays: jest.fn((date, days) => new Date(2024, 0, 15 + days)),
  subDays: jest.fn((date, days) => new Date(2024, 0, 15 - days)),
  parseISO: jest.fn((dateStr) => new Date(dateStr)),
  set: jest.fn(() => new Date(2024, 0, 15)),
  parse: jest.fn(() => new Date(2024, 0, 15)),
  isToday: jest.fn(() => true),
  startOfDay: jest.fn(() => new Date('2024-01-15T00:00:00')),
  endOfDay: jest.fn(() => new Date('2024-01-15T23:59:59')),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => {
  const mockToast = jest.fn();
  return {
    __esModule: true,
    default: Object.assign(mockToast, {
      success: jest.fn(),
      error: jest.fn(),
    }),
  };
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock HTMLAudioElement
const mockAudio = {
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(),
  load: jest.fn(),
  currentTime: 0,
  volume: 1,
};
Object.defineProperty(window, 'HTMLAudioElement', {
  value: jest.fn().mockImplementation(() => mockAudio),
});

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  value: jest.fn((cb) => setTimeout(cb, 16)),
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: jest.fn(),
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <GlobalStateProvider>{children}</GlobalStateProvider>
);

describe('useGlobalState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Provider and Context', () => {
    it('should throw error when used outside provider', () => {
      const renderOutside = () =>
        renderHook(() => useGlobalState()); // no wrapper on purpose

      expect(renderOutside).toThrow('useGlobalState must be used within a GlobalStateProvider');
    });

    it('should provide context when used within provider', () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('object');
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state structure', () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      expect(result.current.state).toMatchObject({
        tasks: expect.any(Array),
        routines: expect.any(Array),
        logs: expect.any(Array),
        allBadges: expect.any(Array),
        earnedBadges: expect.any(Map),
        profile: expect.any(Object),
        soundSettings: expect.any(Object),
        activeItem: null,
        isPaused: true,
        isMuted: false,
        routineLogDialog: expect.objectContaining({
          isOpen: false,
          action: null,
        }),
        quickStartOpen: false,
      });
    });

    it('should have correct profile structure', () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });
      const { profile } = result.current.state;

      expect(profile).toMatchObject({
        id: 'user_profile',
        name: expect.any(String),
        avatar: expect.any(String),
        level: expect.any(Number),
        totalPoints: expect.any(Number),
        studyStreak: expect.any(Number),
        joinedAt: expect.any(Number),
      });
    });

    it('should have correct sound settings structure', () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });
      const { soundSettings } = result.current.state;

      expect(soundSettings).toMatchObject({
        alarm: expect.any(String),
        tick: expect.any(String),
        notificationInterval: expect.any(Number),
      });
    });
  });

  // Helper function to create valid task objects
  const createValidTask = (overrides: Partial<any> = {}) => ({
    title: 'Test Task',
    description: 'Test Description',
    date: '2024-01-15',
    time: '10:00',
    points: 10,
    priority: 'medium' as const,
    timerType: 'countdown' as const,
    duration: 30,
    ...overrides,
  });

  describe('Task Management', () => {
    it('should add a new task', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      const newTask = createValidTask({
        title: 'Test Task',
        description: 'Test Description',
      });

      await act(async () => {
        await result.current.addTask(newTask);
      });

      expect(result.current.state.tasks).toHaveLength(1);
      expect(result.current.state.tasks[0].title).toBe('Test Task');
    });

    it('should update an existing task', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a task first
      await act(async () => {
        await result.current.addTask(createValidTask({
          title: 'Original Task',
        }));
      });

      const taskId = result.current.state.tasks[0].id;
      const updatedTask = {
        ...result.current.state.tasks[0],
        title: 'Updated Task',
        priority: 'high' as const,
      };

      await act(async () => {
        await result.current.updateTask(updatedTask);
      });

      expect(result.current.state.tasks[0]).toMatchObject({
        title: 'Updated Task',
        priority: 'high',
      });
    });

    it('should archive a task', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a task first
      await act(async () => {
        await result.current.addTask(createValidTask({
          title: 'Task to Archive',
        }));
      });

      const taskId = result.current.state.tasks[0].id;

      await act(async () => {
        await result.current.archiveTask(taskId);
      });

      expect(result.current.state.tasks[0].status).toBe('archived');
    });

    it('should unarchive a task', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add and archive a task first
      await act(async () => {
        await result.current.addTask(createValidTask({
          title: 'Task to Unarchive',
        }));
      });

      const taskId = result.current.state.tasks[0].id;

      await act(async () => {
        await result.current.archiveTask(taskId);
        await result.current.unarchiveTask(taskId);
      });

      expect(result.current.state.tasks[0].status).toBe('todo');
    });

    it('should push task to next day', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a task first
      await act(async () => {
        await result.current.addTask(createValidTask({
          title: 'Task to Push',
          date: '2024-01-15',
        }));
      });

      const taskId = result.current.state.tasks[0].id;

      await act(async () => {
        await result.current.pushTaskToNextDay(taskId);
      });

      const updatedTask = result.current.state.tasks.find(t => t.id === taskId);
      expect(updatedTask?.date).toBe('2024-01-16');
    });
  });

  describe('Timer Functionality', () => {
    it('should start timer for a task', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a task first
      await act(async () => {
        await result.current.addTask(createValidTask({
          title: 'Timer Task',
          duration: 25,
        }));
      });

      const task = result.current.state.tasks[0];

      await act(async () => {
        await result.current.startTimer(task);
      });

      expect(result.current.state.activeItem).toMatchObject({
        id: task.id,
        title: task.title,
      });
    });

    it('should toggle pause timer', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a task and start timer
      await act(async () => {
        await result.current.addTask(createValidTask({
          title: 'Timer Task',
          duration: 25,
        }));
      });

      const task = result.current.state.tasks[0];

      await act(async () => {
        await result.current.startTimer(task);
        result.current.togglePause();
      });

      expect(result.current.state.isPaused).toBe(true);

      await act(async () => {
        result.current.togglePause();
      });

      expect(result.current.state.isPaused).toBe(false);
    });

    it('should stop timer', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a task and start timer
      await act(async () => {
        await result.current.addTask(createValidTask({
          title: 'Timer Task',
          duration: 25,
        }));
      });

      const task = result.current.state.tasks[0];

      await act(async () => {
        await result.current.startTimer(task);
        await result.current.stopTimer('test');
      });

      expect(result.current.state.activeItem).toBe(null);
    });

    it('should complete timer', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a task and start timer
      await act(async () => {
        await result.current.addTask(createValidTask({
          title: 'Timer Task',
          estimatedDuration: 25,
        }));
      });

      const task = result.current.state.tasks[0];

      await act(async () => {
        await result.current.startTimer(task);
        await result.current.completeTimer();
      });

      expect(result.current.state.activeItem).toBe(null);
      expect(result.current.state.tasks[0].status).toBe('completed');
    });
  });

  describe('Routine Management', () => {
    it('should add a new routine', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      const newRoutine = {
        title: 'Morning Routine',
        description: 'Daily morning routine',
        startTime: '08:00',
        endTime: '09:00',
        days: [1, 2, 3, 4, 5],
        priority: 'high' as const,
      };

      await act(async () => {
        await result.current.addRoutine(newRoutine);
      });

      expect(result.current.state.routines).toHaveLength(1);
      expect(result.current.state.routines[0]).toMatchObject({
        title: 'Morning Routine',
        description: 'Daily morning routine',
        startTime: '08:00',
        endTime: '09:00',
        days: [1, 2, 3, 4, 5],
        priority: 'high',
        status: 'todo',
      });
    });

    it('should update an existing routine', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a routine first
      await act(async () => {
        await result.current.addRoutine({
          title: 'Original Routine',
          startTime: '08:00',
          endTime: '09:00',
          days: [1, 2, 3],
          priority: 'medium' as const,
        });
      });

      const updatedRoutine = {
        ...result.current.state.routines[0],
        title: 'Updated Routine',
        priority: 'high' as const,
      };

      await act(async () => {
        await result.current.updateRoutine(updatedRoutine);
      });

      expect(result.current.state.routines[0]).toMatchObject({
        title: 'Updated Routine',
        priority: 'high',
      });
    });

    it('should delete a routine', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a routine first
      await act(async () => {
        await result.current.addRoutine({
          title: 'Routine to Delete',
          startTime: '08:00',
          endTime: '09:00',
          days: [1, 2, 3],
          priority: 'medium' as const,
        });
      });

      const routineId = result.current.state.routines[0].id;

      await act(async () => {
        result.current.deleteRoutine(routineId);
      });

      expect(result.current.state.routines).toHaveLength(0);
    });
  });

  describe('Dialog Management', () => {
    it('should open and close routine log dialog', () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      act(() => {
        result.current.openRoutineLogDialog('complete');
      });

      expect(result.current.state.routineLogDialog).toMatchObject({
        isOpen: true,
        action: 'complete',
      });

      act(() => {
        result.current.closeRoutineLogDialog();
      });

      expect(result.current.state.routineLogDialog).toMatchObject({
        isOpen: false,
        action: null,
      });
    });

    it('should open and close quick start dialog', () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      act(() => {
        result.current.openQuickStart();
      });

      expect(result.current.state.quickStartOpen).toBe(true);

      act(() => {
        result.current.closeQuickStart();
      });

      expect(result.current.state.quickStartOpen).toBe(false);
    });
  });

  describe('Sound Settings', () => {
    it('should update sound settings', () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      act(() => {
        result.current.setSoundSettings({
          alarm: 'bell',
          notificationInterval: 30,
        });
      });

      expect(result.current.state.soundSettings).toMatchObject({
        alarm: 'bell',
        notificationInterval: 30,
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'soundSettings',
        expect.stringContaining('bell')
      );
    });

    it('should toggle mute', () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.state.isMuted).toBe(true);

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.state.isMuted).toBe(false);
    });
  });

  describe('Badge Management', () => {
    it('should add a new badge', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      const newBadge = {
        name: 'Test Badge',
        description: 'Test Description',
        icon: 'test-icon',
        color: '#ff0000',
        isCustom: true,
        category: 'daily' as const,
        isEnabled: true,
        requiredCount: 1,
        conditions: [],
      };

      await act(async () => {
        await result.current.addBadge(newBadge);
      });

      // Badge should be added to allBadges
      expect(result.current.state.allBadges).toContainEqual(
        expect.objectContaining({
          name: 'Test Badge',
          description: 'Test Description',
          isCustom: true,
        })
      );
    });

    it('should update a badge', () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Mock initial badge
      const initialBadge = {
        id: 'test-badge-1',
        name: 'Original Badge',
        description: 'Original Description',
        icon: 'original-icon',
        color: '#000000',
        isCustom: true,
        category: 'daily' as const,
        isEnabled: true,
        requiredCount: 1,
        conditions: [],
      };

      // Manually set initial state with badge
      act(() => {
        result.current.updateBadge({
          ...initialBadge,
          name: 'Updated Badge',
          description: 'Updated Description',
        });
      });

      // Should update localStorage for custom badges
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'customBadges',
        expect.any(String)
      );
    });

    it('should delete a badge', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      await act(async () => {
        await result.current.deleteBadge('test-badge-id');
      });

      // Should update localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'customBadges',
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'earnedBadges',
        expect.any(String)
      );
    });
  });

  describe('Profile Management', () => {
    it('should update profile', () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      act(() => {
        result.current.updateProfile({
          name: 'Updated Name',
          email: 'test@example.com',
        });
      });

      expect(result.current.state.profile).toMatchObject({
        name: 'Updated Name',
        email: 'test@example.com',
      });
    });
  });

  describe('Log Management', () => {
    it('should add a log entry', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      await act(async () => {
        await result.current.addLog('TASK_COMPLETE', {
          task: { id: 'test-task', title: 'Test Task' },
          duration: 1500000,
          points: 25,
        });
      });

      expect(result.current.state.logs).toHaveLength(1);
      expect(result.current.state.logs[0]).toMatchObject({
        type: 'TASK_COMPLETE',
        payload: expect.objectContaining({
          task: expect.objectContaining({ id: 'test-task' }),
          duration: 1500000,
          points: 25,
        }),
      });
    });

    it('should remove a log entry', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a log first
      await act(async () => {
        await result.current.addLog('TASK_COMPLETE', {
          task: { id: 'test-task', title: 'Test Task' },
        });
      });

      const logId = result.current.state.logs[0].id;

      await act(async () => {
        await result.current.removeLog(logId);
      });

      expect(result.current.state.logs).toHaveLength(0);
    });

    it('should update a log entry', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a log first
      await act(async () => {
        await result.current.addLog('TASK_COMPLETE', {
          task: { id: 'test-task', title: 'Original Task' },
        });
      });

      const log = result.current.state.logs[0];
      const updatedLog = {
        ...log,
        payload: {
          ...log.payload,
          task: { ...log.payload.task, title: 'Updated Task' },
        },
      };

      await act(async () => {
        await result.current.updateLog(log.id, updatedLog);
      });

      expect(result.current.state.logs[0].payload.task.title).toBe('Updated Task');
    });
  });

  describe('Manual Completion', () => {
    it('should manually complete a task', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a task first
      await act(async () => {
        await result.current.addTask(createValidTask({
          title: 'Manual Task',
        }));
      });

      const task = result.current.state.tasks[0];
      const formData = {
        logDate: '2024-01-15',
        startTime: '09:00',
        endTime: '09:30',
        productiveDuration: 30,
        breaks: 0,
        notes: 'Completed manually',
      };

      await act(async () => {
        await result.current.manuallyCompleteItem(task, formData);
      });

      expect(result.current.state.tasks[0].status).toBe('completed');
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('completed')
      );
    });

    it('should manually complete a routine', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a routine first
      await act(async () => {
        await result.current.addRoutine({
          title: 'Manual Routine',
          startTime: '08:00',
          endTime: '09:00',
          days: [1, 2, 3, 4, 5],
          priority: 'medium' as const,
        });
      });

      const routine = result.current.state.routines[0];
      const formData = {
        logDate: '2024-01-15',
        startTime: '08:00',
        endTime: '09:00',
        productiveDuration: 60,
        breaks: 0,
        notes: 'Routine completed manually',
      };

      await act(async () => {
        await result.current.manuallyCompleteItem(routine, formData);
      });

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('completed')
      );
    });
  });

  describe('Retry Functionality', () => {
    it('should retry a completed task', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Add a task first
      await act(async () => {
        await result.current.addTask(createValidTask({
          title: 'Test Task',
          description: 'Test Description',
          duration: 30,
          tags: ['test'],
        }));
      });

      // Wait for task to be added
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.state.tasks.length).toBeGreaterThan(0);
      const task = result.current.state.tasks[0];
      
      // Archive the task to remove it from active tasks
      await act(async () => {
        await result.current.archiveTask(task.id);
      });

      // Verify task is archived (status changed but still in array)
      expect(result.current.state.tasks[0].status).toBe('archived');

      await act(async () => {
        await result.current.retryItem({
          type: 'TASK_COMPLETE',
          data: { task: task },
          timestamp: '2024-01-15T10:00:00.000Z'
        });
      });

      // For tasks, retry should unarchive the task (change status back to todo)
      expect(result.current.state.tasks.length).toBe(1); // Same task, status changed
      expect(result.current.state.tasks[0].status).toBe('todo');
      expect(result.current.state.logs.some(log => log.type === 'TASK_RETRY')).toBe(true);
    });

    it('should retry a completed routine', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Get current day to ensure routine is scheduled for today
      const today = new Date();
      const todayNum = today.getDay();
      
      // Add a routine scheduled for today
      await act(async () => {
        await result.current.addRoutine({
          title: 'Test Routine',
          description: 'Test Description',
          priority: 'medium' as const,
          days: [todayNum], // Schedule for today
          startTime: '08:00',
          endTime: '09:00',
        });
      });

      // Wait for routine to be added
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.state.routines.length).toBeGreaterThan(0);
      const routine = result.current.state.routines[0];
      
      // Add a completion log for today to simulate the routine being completed
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const completionTimestamp = `${todayStr}T10:00:00.000Z`;
      
      await act(async () => {
        await result.current.addLog('ROUTINE_SESSION_COMPLETE', {
          routineId: routine.id,
          title: routine.title,
          duration: 30 * 60, // 30 minutes in seconds
          points: 5,
          priority: routine.priority,
          studyLog: 'Completed routine',
          timestamp: completionTimestamp
        });
      });

      // Wait for activity to be processed
      await waitFor(() => {
        const routineActivity = result.current.state.todaysActivity.find(
          activity => activity.type === 'ROUTINE_COMPLETE' && 
          activity.data?.routine?.id === routine.id &&
          !activity.data?.isUndone
        );
        expect(routineActivity).toBeDefined();
      });

      // Find the routine completion activity from today's activity
      const routineActivity = result.current.state.todaysActivity.find(
        activity => activity.type === 'ROUTINE_COMPLETE' && 
        activity.data?.routine?.id === routine.id &&
        !activity.data?.isUndone
      );

      expect(routineActivity).toBeDefined();
      expect(routineActivity!.data.isUndone).toBe(false);

      await act(async () => {
        await result.current.retryItem(routineActivity!);
      });

      // Wait for retry log to be added
      await waitFor(() => {
        const retryLog = result.current.state.logs.find(
          log => log.type === 'ROUTINE_RETRY' && log.payload.routineId === routine.id
        );
        expect(retryLog).toBeDefined();
      });

      // For routines, retry doesn't add a new routine, just logs the retry
      expect(result.current.state.routines.length).toBe(1);
    });
  });

  describe('LocalStorage Integration', () => {
    it('should save sound settings to localStorage', () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      act(() => {
        result.current.setSoundSettings({ alarm: 'chime' });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'studySentinelSoundSettings_v1',
        expect.stringContaining('chime')
      );
    });

    it('should load initial data from localStorage', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'studySentinelSoundSettings_v1') {
          return JSON.stringify({ alarm: 'bell', tick: 'soft' });
        }
        return null;
      });

      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Verify the state is loaded synchronously (provider initializes on first render)
      expect(result.current.state.isLoaded).toBe(true);

      // Verify localStorage was called during initialization
      expect(localStorageMock.getItem).toHaveBeenCalledWith('studySentinelSoundSettings_v1');
      
      // Verify the sound settings were loaded correctly
      expect(result.current.state.soundSettings).toMatchObject({
        alarm: 'bell',
        tick: 'soft'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Mock repository to throw error
      const mockError = new Error('Repository error');
      const mockTaskRepo = require('@/lib/repositories').createTaskRepository();
      mockTaskRepo.add.mockRejectedValueOnce(mockError);

      await act(async () => {
        try {
          await result.current.addTask(createValidTask({
            title: 'Error Task',
          }));
        } catch (error) {
          expect(error).toBe(mockError);
        }
      });
    });

    it('should handle timer completion errors', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Try to complete timer when no timer is running
      await act(async () => {
        await result.current.completeTimer();
      });

      // Should not crash and state should remain consistent
      expect(result.current.state.activeItem).toBe(null);
      expect(result.current.state.isPaused).toBe(true);
    });
  });

  describe('Performance and Memoization', () => {
    it('should provide stable context value structure', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Wait for the provider to initialize if needed
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Context value should have consistent structure
      expect(result.current).toBeDefined();
      expect(typeof result.current.addTask).toBe('function');
      expect(typeof result.current.updateTask).toBe('function');
    });

    it('should have all required methods in context', async () => {
      const { result } = renderHook(() => useGlobalState(), { wrapper });

      // Wait for the provider to initialize if needed
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const expectedMethods = [
        'addTask',
        'updateTask',
        'archiveTask',
        'unarchiveTask',
        'pushTaskToNextDay',
        'startTimer',
        'togglePause',
        'completeTimer',
        'stopTimer',
        'manuallyCompleteItem',
        'addRoutine',
        'updateRoutine',
        'deleteRoutine',
        'addBadge',
        'updateBadge',
        'deleteBadge',
        'updateProfile',
        'openRoutineLogDialog',
        'closeRoutineLogDialog',
        'setSoundSettings',
        'toggleMute',
        'addLog',
        'removeLog',
        'updateLog',
        'retryItem',
        'openQuickStart',
        'closeQuickStart',
      ];

      // Ensure context is properly provided
      expect(result.current).not.toBeNull();
      expect(result.current).toBeDefined();

      expectedMethods.forEach((method) => {
        expect(typeof result.current[method]).toBe('function');
      });
    });
  });
});
