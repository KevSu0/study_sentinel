import { useState, useCallback, useMemo, useEffect } from 'react';
import { format, isToday, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import type {
  AppState,
  StateAction,
  StudyTask,
  Routine,
  UserProfile,
  Badge,
  SoundSettings,
  LogEvent,
  CompletedWork,
  ActivityFeedItem,
  ActiveTimerItem,
  StoredTimer,
  ManualLogFormData,
  DomainEvent,
} from '../types/state-types';
import { useStatePersistence, STORAGE_KEYS, persistenceUtils } from '../utils/use-state-persistence';
import { syncEngine } from '../../utils/sync-engine';
import { QuoteProvider } from '../../providers/quote-provider';
import { SoundProvider } from '../../providers/sound-provider';
import { generateId } from '../../utils/id-generator';
import { calculatePoints } from '../../utils/point-calculator';
import { getBadgeAwardingCriteria } from '../../utils/badge-utils';

// Initial state structure
const createInitialState = (): AppState => ({
  tasks: {
    tasks: [],
    items: new Map<string, StudyTask>(),
    activeTimer: null,
    isLoaded: false,
    isLoading: false,
    error: null,
  },
  routines: {
    routines: [],
    items: new Map<string, Routine>(),
    activeTimer: null,
    isLoaded: false,
    isLoading: false,
    error: null,
  },
  profile: {
    profile: {
      id: 'default-profile',
      name: 'Study Sentinel User',
      avatar: '',
      level: 1,
      totalPoints: 0,
      streak: 0,
      joinDate: new Date().toISOString(),
    },
    data: {
      id: 'default-profile',
      name: 'Study Sentinel User',
      avatar: '',
      level: 1,
      totalPoints: 0,
      streak: 0,
      joinDate: new Date().toISOString(),
    },
    isLoaded: false,
    isLoading: false,
    error: null,
  },
  badges: {
    allBadges: [],
    available: new Map<string, Badge>(),
    custom: new Map<string, Badge>(),
    earned: new Map<string, string>(),
    earnedBadges: new Map<string, string>(),
    isLoaded: false,
    isLoading: false,
    error: null,
  },
  logs: {
    items: new Map(),
    isLoading: false,
    error: null,
  },
  sessions: {
    items: new Map(),
    current: null,
    isLoading: false,
    error: null,
  },
  ui: {
    quickStartOpen: false,
    routineLogDialog: {
      isOpen: false,
      action: null,
    },
    activeView: 'dashboard',
    sidebarOpen: true,
    modals: {
      quickStart: { isOpen: false, data: null },
      routineLog: { isOpen: false, data: null },
      taskEdit: { isOpen: false, data: null },
      routineEdit: { isOpen: false, data: null },
      badgeEdit: { isOpen: false, data: null },
      settings: { isOpen: false },
    },
    notifications: [],
  },
  settings: {
    soundSettings: {
      tick: 'default',
      alarm: 'default',
      notificationInterval: 25,
      enabled: true,
      volume: 0.5,
      notificationSound: 'default',
      backgroundMusic: false,
      backgroundMusicVolume: 0.3,
    },
    sound: {
      tick: 'default',
      alarm: 'default',
      notificationInterval: 25,
      enabled: true,
      volume: 0.5,
      notificationSound: 'default',
      backgroundMusic: false,
      backgroundMusicVolume: 0.3,
    },
    isMuted: false,
    isLoaded: false,
    isLoading: false,
    error: null,
  },
  activity: {
    logs: [],
    todaysLogs: [],
    allCompletedWork: [],
    todaysCompletedWork: [],
    todaysPoints: 0,
    todaysBadges: [],
    todaysActivity: [],
    isLoaded: false,
  },
  timer: {
    activeItem: null,
    isPaused: false,
    isOvertime: false,
    timeDisplay: '00:00',
    timerProgress: null,
    starCount: 0,
    showStarAnimation: false,
    isLoaded: false,
  },
  isLoaded: false,
});

/**
 * Core state management hook that coordinates all domain states
 * Provides centralized state management with cross-domain synchronization
 */
export const useAppState = () => {
  const [state, setState] = useState<AppState>(createInitialState);
  const persistence = useStatePersistence();

  // Initialize state from localStorage on mount
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Load persisted data
        const tasks = persistenceUtils.loadMap<string, StudyTask>(STORAGE_KEYS.TASKS);
        const routines = persistenceUtils.loadMap<string, Routine>(STORAGE_KEYS.ROUTINES);
        const profile = persistence.load<UserProfile>(STORAGE_KEYS.PROFILE, state.profile.data);
        const badges = persistenceUtils.loadMap<string, Badge>(STORAGE_KEYS.BADGES);
        const customBadges = persistenceUtils.loadMap<string, Badge>(STORAGE_KEYS.CUSTOM_BADGES);
        const earnedBadges = persistenceUtils.loadMap<string, Badge>(STORAGE_KEYS.EARNED_BADGES);
        const soundSettings = persistence.load<SoundSettings>(STORAGE_KEYS.SOUND_SETTINGS, state.settings.sound);
        const logs = persistenceUtils.loadMap<string, LogEvent>(STORAGE_KEYS.LOGS);
        const sessions = persistenceUtils.loadMap<string, any>(STORAGE_KEYS.SESSIONS);
        const timerData = persistence.load<StoredTimer | null>(STORAGE_KEYS.TIMER, null);

        // Update state with loaded data
        setState(prevState => ({
          ...prevState,
          tasks: {
            ...prevState.tasks,
            items: tasks,
            activeTimer: timerData?.item?.type === 'task' ? {
              id: timerData.item.id,
              type: 'task',
              startTime: new Date(timerData.item.startTime),
              duration: timerData.item.duration,
              isPaused: timerData.isPaused,
              pausedTime: timerData.pausedTime,
              totalPausedDuration: timerData.item.totalPausedDuration,
            } : null,
          },
          routines: {
            ...prevState.routines,
            items: routines,
            activeTimer: timerData?.item?.type === 'routine' ? {
              id: timerData.item.id,
              type: 'routine',
              startTime: new Date(timerData.item.startTime),
              duration: timerData.item.duration,
              isPaused: timerData.isPaused,
              pausedTime: timerData.pausedTime,
              totalPausedDuration: timerData.item.totalPausedDuration,
            } : null,
          },
          profile: {
            ...prevState.profile,
            data: profile,
          },
          badges: {
            ...prevState.badges,
            available: badges,
            custom: customBadges,
            earned: new Map(Array.from(earnedBadges.entries()).map(([id, badge]) => [id, badge.id])),
          },
          logs: {
            ...prevState.logs,
            items: logs,
          },
          sessions: {
            ...prevState.sessions,
            items: sessions,
          },
          settings: {
            ...prevState.settings,
            sound: soundSettings,
          },
        }));

        // Sync engine is ready to use as singleton instance

      } catch (error) {
        console.error('Failed to initialize app state:', error);
        toast.error('Failed to load saved data');
      }
    };

    initializeState();
  }, []);

  // Persist state changes to localStorage
  useEffect(() => {
    const persistState = () => {
      try {
        persistenceUtils.saveMap(STORAGE_KEYS.TASKS, state.tasks.items);
        persistenceUtils.saveMap(STORAGE_KEYS.ROUTINES, state.routines.items);
        persistence.save(STORAGE_KEYS.PROFILE, state.profile.data);
        persistenceUtils.saveMap(STORAGE_KEYS.BADGES, state.badges.available);
        persistenceUtils.saveMap(STORAGE_KEYS.CUSTOM_BADGES, state.badges.custom);
        persistenceUtils.saveMap(STORAGE_KEYS.EARNED_BADGES, state.badges.earned);
        persistence.save(STORAGE_KEYS.SOUND_SETTINGS, state.settings.sound);
        persistenceUtils.saveMap(STORAGE_KEYS.LOGS, state.logs.items);
        persistenceUtils.saveMap(STORAGE_KEYS.SESSIONS, state.sessions.items);

        // Save active timer data
        const activeTimer = state.tasks.activeTimer || state.routines.activeTimer;
        if (activeTimer) {
          persistence.save(STORAGE_KEYS.TIMER, activeTimer);
        } else {
          persistence.remove(STORAGE_KEYS.TIMER);
        }
      } catch (error) {
        console.error('Failed to persist state:', error);
      }
    };

    // Debounce persistence to avoid excessive writes
    const timeoutId = setTimeout(persistState, 500);
    return () => clearTimeout(timeoutId);
  }, [state, persistence]);

  // Derived state calculations
  const derivedState = useMemo(() => {
    const today = startOfDay(new Date());
    const todaysLogs = Array.from(state.logs.items.values())
      .filter(log => isToday(new Date(log.timestamp)));

    const allCompletedWork = Array.from(state.logs.items.values())
      .filter(log => log.type === 'TASK_COMPLETE' || log.type === 'ROUTINE_SESSION_COMPLETE')
      .map(log => log.payload as CompletedWork);

    const todaysCompletedWork = allCompletedWork
      .filter(work => isToday(new Date(work.timestamp)));

    const todaysPoints = todaysCompletedWork
      .reduce((total, work) => total + work.pointsEarned, 0);

    const todaysBadges = Array.from(state.badges.earnedBadges.entries())
      .map(([badgeId, earnedTimestamp]) => {
        const badge = state.badges.available.get(badgeId) || state.badges.custom.get(badgeId);
        return badge && isToday(new Date(earnedTimestamp)) ? badge : null;
      })
      .filter((badge): badge is Badge => badge !== null);

    const activityFeed: ActivityFeedItem[] = todaysLogs
      .map(log => ({
        type: log.type,
        timestamp: log.timestamp,
        data: log.payload,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      todaysLogs,
      allCompletedWork,
      todaysCompletedWork,
      todaysPoints,
      todaysBadges,
      activityFeed,
    };
  }, [state.logs.items, state.badges.earned]);

  // Action dispatchers
  const dispatch = useCallback((action: StateAction) => {
    setState(prevState => {
      switch (action.type) {
        case 'SET_LOADING':
          const loadingDomain = action.domain as keyof AppState;
          return {
            ...prevState,
            [loadingDomain]: {
              ...(prevState[loadingDomain] as any),
              isLoading: action.payload,
            },
          };

        case 'SET_ERROR':
          const errorDomain = action.domain as keyof AppState;
          return {
            ...prevState,
            [errorDomain]: {
              ...(prevState[errorDomain] as any),
              error: action.payload,
              isLoading: false,
            },
          };

        case 'CLEAR_ERROR':
          const clearDomain = action.domain as keyof AppState;
          return {
            ...prevState,
            [clearDomain]: {
              ...(prevState[clearDomain] as any),
              error: null,
            },
          };

        default:
          return prevState;
      }
    });
  }, []);

  // Domain-specific action creators
  const actions = useMemo(() => ({
    // Task actions
    addTask: (task: Omit<StudyTask, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newTask: StudyTask = {
        ...task,
        id: generateId(),
      };

      setState(prevState => {
        const newItems = new Map(prevState.tasks.items);
        newItems.set(newTask.id, newTask);
        return {
          ...prevState,
          tasks: {
            ...prevState.tasks,
            items: newItems,
          },
        };
      });

      // Emit domain event
      emitDomainEvent({
        type: 'TASK_ADDED',
        payload: { task: newTask },

      });

      return newTask.id;
    },

    updateTask: (id: string, updates: Partial<StudyTask>) => {
      setState(prevState => {
        const existingTask = prevState.tasks.items.get(id);
        if (!existingTask) return prevState;

        const updatedTask = {
          ...existingTask,
          ...updates,
        };

        const newItems = new Map(prevState.tasks.items);
        newItems.set(id, updatedTask);

        // Emit domain event
        emitDomainEvent({
          type: 'TASK_UPDATED',
          payload: { task: updatedTask },
        });

        return {
          ...prevState,
          tasks: {
            ...prevState.tasks,
            items: newItems,
          },
        };
      });
      },

      deleteTask: (id: string) => {
      setState(prevState => {
        const newItems = new Map(prevState.tasks.items);
        newItems.delete(id);

        return {
          ...prevState,
          tasks: {
            ...prevState.tasks,
            items: newItems,
          },
        };
      });

      // Emit domain event
      emitDomainEvent({
        type: 'TASK_DELETED',
        payload: { taskId: id },
      });
    },

    // Timer actions
    startTimer: (id: string, type: 'task' | 'routine', duration: number) => {
      const startTime = new Date();
      const activeTimer: ActiveTimerItem = {
        id,
        type: type as 'task' | 'routine',
        startTime,
        duration,
        isPaused: false,
        pausedTime: 0,
        totalPausedDuration: 0,
      };

      setState(prevState => ({
        ...prevState,
        [type === 'task' ? 'tasks' : 'routines']: {
          ...prevState[type === 'task' ? 'tasks' : 'routines'],
          activeTimer,
        },
      }));

      // Add log entry
      addLog({
        type: type === 'task' ? 'TIMER_START' : 'ROUTINE_START',
        payload: { id, startTime: startTime.getTime(), duration },
      });

      // Emit domain event
      emitDomainEvent({
        type: 'TIMER_STARTED',
        payload: { item: activeTimer },
      });
    },

    stopTimer: () => {
      setState(prevState => {
        const activeTimer = prevState.tasks.activeTimer || prevState.routines.activeTimer;
        if (!activeTimer) return prevState;

        const endTime = new Date();
        const domain = activeTimer.type === 'task' ? 'tasks' : 'routines';

        // Add log entry
        addLog({
          type: activeTimer.type === 'task' ? 'TIMER_STOP' : 'ROUTINE_STOP',
          payload: {
            id: activeTimer.id,
            startTime: activeTimer.startTime.getTime(),
            endTime: endTime.getTime(),
            duration: endTime.getTime() - activeTimer.startTime.getTime(),
            actualDuration: endTime.getTime() - activeTimer.startTime.getTime() - activeTimer.totalPausedDuration,
          },
        });

        return {
          ...prevState,
          [domain]: {
            ...prevState[domain],
            activeTimer: null,
          },
        };
      });
    },

    pauseTimer: () => {
      setState(prevState => {
        const activeTimer = prevState.tasks.activeTimer || prevState.routines.activeTimer;
        if (!activeTimer || activeTimer.isPaused) return prevState;

        const pauseTime = Date.now();
        const domain = activeTimer.type === 'task' ? 'tasks' : 'routines';

        const updatedTimer = {
          ...activeTimer,
          isPaused: true,
          pausedTime: pauseTime,
        };

        // Add log entry
        addLog({
          type: activeTimer.type === 'task' ? 'TIMER_PAUSE' : 'ROUTINE_PAUSE',
          payload: {
            id: activeTimer.id,
            pauseTime,
          },
        });

        return {
          ...prevState,
          [domain]: {
            ...prevState[domain],
            activeTimer: updatedTimer,
          },
        };
      });
    },

    resumeTimer: () => {
      setState(prevState => {
        const activeTimer = prevState.tasks.activeTimer || prevState.routines.activeTimer;
        if (!activeTimer || !activeTimer.isPaused) return prevState;

        const resumeTime = Date.now();
        const pauseDuration = resumeTime - (activeTimer.pausedTime || 0);
        const domain = activeTimer.type === 'task' ? 'tasks' : 'routines';

        const updatedTimer = {
          ...activeTimer,
          isPaused: false,
          pausedTime: 0,
          totalPausedDuration: activeTimer.totalPausedDuration + pauseDuration,
        };

        // Add log entry
        addLog({
          type: activeTimer.type === 'task' ? 'TIMER_RESUME' : 'ROUTINE_RESUME',
          payload: {
            id: activeTimer.id,
            resumeTime,
            pauseDuration,
          },
        });

        return {
          ...prevState,
          [domain]: {
            ...prevState[domain],
            activeTimer: updatedTimer,
          },
        };
      });
    },

    // Routine actions
    addRoutine: (routine: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newRoutine: Routine = {
        ...routine,
        id: generateId(),
        createdAt: Date.now(),

      };

      setState(prevState => {
        const newItems = new Map(prevState.routines.items);
        newItems.set(newRoutine.id, newRoutine);
        return {
          ...prevState,
          routines: {
            ...prevState.routines,
            items: newItems,
          },
        };
      });

      emitDomainEvent({
        type: 'ROUTINE_ADDED',
        payload: { routine: newRoutine },
      });

      return newRoutine.id;
    },

    updateRoutine: (id: string, updates: Partial<Routine>) => {
      setState(prevState => {
        const existingRoutine = prevState.routines.items.get(id);
        if (!existingRoutine) return prevState;

        const updatedRoutine = {
          ...existingRoutine,
          ...updates,
        };

        const newItems = new Map(prevState.routines.items);
        newItems.set(id, updatedRoutine);

        emitDomainEvent({
          type: 'ROUTINE_UPDATED',
          payload: { routine: updatedRoutine },
        });

        return {
          ...prevState,
          routines: {
            ...prevState.routines,
            items: newItems,
          },
        };
      });
    },

    deleteRoutine: (id: string) => {
      setState(prevState => {
        const newItems = new Map(prevState.routines.items);
        newItems.delete(id);

        return {
          ...prevState,
          routines: {
            ...prevState.routines,
            items: newItems,
          },
        };
      });

      emitDomainEvent({
        type: 'ROUTINE_DELETED',
        payload: { routineId: id },
      });
    },

    // Profile actions
    updateProfile: (updates: Partial<UserProfile>) => {
      setState(prevState => ({
        ...prevState,
        profile: {
          ...prevState.profile,
          data: {
            ...prevState.profile.data,
            ...updates,
          },
        },
      }));
    },

    // Badge actions
    addBadge: (badge: Omit<Badge, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newBadge: Badge = {
        ...badge,
        id: generateId(),
      };

      setState(prevState => {
        const newAvailable = new Map(prevState.badges.available);
        newAvailable.set(newBadge.id, newBadge);
        return {
          ...prevState,
          badges: {
            ...prevState.badges,
            available: newAvailable,
          },
        };
      });

      return newBadge.id;
    },

    updateBadge: (id: string, updates: Partial<Badge>) => {
      setState(prevState => {
        const existingBadge = prevState.badges.available.get(id);
        if (!existingBadge) return prevState;

        const updatedBadge = {
          ...existingBadge,
          ...updates,
        };

        const newAvailable = new Map(prevState.badges.available);
        newAvailable.set(id, updatedBadge);

        return {
          ...prevState,
          badges: {
            ...prevState.badges,
            available: newAvailable,
          },
        };
      });
    },

    deleteBadge: (id: string) => {
      setState(prevState => {
        const newAvailable = new Map(prevState.badges.available);
        newAvailable.delete(id);

        return {
          ...prevState,
          badges: {
            ...prevState.badges,
            available: newAvailable,
          },
        };
      });
    },

    awardBadge: (badgeId: string, reason?: string) => {
      setState(prevState => ({
        ...prevState,
        badges: {
          ...prevState.badges,
          earned: new Map(prevState.badges.earned).set(badgeId, reason || 'Achievement unlocked'),
        },
      }));
    },

    // Settings actions
    updateSoundSettings: (settings: Partial<SoundSettings>) => {
      setState(prevState => ({
        ...prevState,
        settings: {
          ...prevState.settings,
          sound: {
            ...prevState.settings.sound,
            ...settings,
          },
        },
      }));
    },

    toggleMute: () => {
      setState(prevState => ({
        ...prevState,
        settings: {
          ...prevState.settings,
          isMuted: !prevState.settings.isMuted,
        },
      }));
    },

    // Log actions
    removeLog: (id: string) => {
      setState(prevState => {
        const newItems = new Map(prevState.logs.items);
        newItems.delete(id);

        return {
          ...prevState,
          logs: {
            ...prevState.logs,
            items: newItems,
          },
        };
      });
    },

    updateLog: (id: string, updates: Partial<LogEvent>) => {
      setState(prevState => {
        const existingLog = prevState.logs.items.get(id);
        if (!existingLog) return prevState;

        const updatedLog = {
          ...existingLog,
          ...updates,
        };

        const newItems = new Map(prevState.logs.items);
        newItems.set(id, updatedLog);

        return {
          ...prevState,
          logs: {
            ...prevState.logs,
            items: newItems,
          },
        };
      });
    },

    // UI actions
    setActiveView: (view: string) => {
      setState(prevState => ({
        ...prevState,
        ui: {
          ...prevState.ui,
          activeView: view,
        },
      }));
    },

    toggleSidebar: () => {
      setState(prevState => ({
        ...prevState,
        ui: {
          ...prevState.ui,
          sidebarOpen: !prevState.ui.sidebarOpen,
        },
      }));
    },

    openModal: (modalName: string, data?: any) => {
      setState(prevState => ({
        ...prevState,
        ui: {
          ...prevState.ui,
          modals: {
            ...prevState.ui.modals,
            [modalName]: { isOpen: true, data },
          },
        },
      }));
    },

    closeModal: (modalName: string) => {
      setState(prevState => ({
        ...prevState,
        ui: {
          ...prevState.ui,
          modals: {
            ...prevState.ui.modals,
            [modalName]: { isOpen: false, data: null },
          },
        },
      }));
    },

    addNotification: (notification: { id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string; duration?: number }) => {
      setState(prevState => ({
        ...prevState,
        ui: {
          ...prevState.ui,
          notifications: [...prevState.ui.notifications, notification],
        },
      }));
    },

    removeNotification: (id: string) => {
      setState(prevState => ({
        ...prevState,
        ui: {
          ...prevState.ui,
          notifications: prevState.ui.notifications.filter(n => n.id !== id),
        },
      }));
    },

    // Utility actions
    retryItem: (id: string, type: 'task' | 'routine') => {
      if (type === 'task') {
        setState(prevState => {
          const task = prevState.tasks.items.get(id);
          if (task) {
            const updatedTask = {
              ...task,
              status: 'todo' as const,
              updatedAt: new Date(),
            };
            const newItems = new Map(prevState.tasks.items);
            newItems.set(id, updatedTask);
            return {
              ...prevState,
              tasks: {
                ...prevState.tasks,
                items: newItems,
              },
            };
          }
          return prevState;
        });
      }
    },

    playSound: (soundType: string) => {
      // Implementation would depend on sound system
      console.log('Playing sound:', soundType);
    },

    stopSound: () => {
      // Implementation would depend on sound system
      console.log('Stopping sound');
    },

    showNewQuote: () => {
      // Implementation would show a motivational quote
      console.log('Showing new quote');
    }

  }), []);

  // Helper functions
  const addLog = useCallback((logData: Omit<LogEvent, 'id' | 'timestamp'>) => {
    const newLog: LogEvent = {
      ...logData,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };

    setState(prevState => {
      const newItems = new Map(prevState.logs.items);
      newItems.set(newLog.id, newLog);
      return {
        ...prevState,
        logs: {
          ...prevState.logs,
          items: newItems,
        },
      };
    });

    return newLog;
  }, []);

  const emitDomainEvent = useCallback((event: DomainEvent) => {
    // Emit event for cross-domain coordination
    console.log('Domain event:', event);
    // Here you could implement event bus or other coordination mechanisms
  }, []);

  const generateActivityMessage = (log: LogEvent): string => {
    switch (log.type) {
      case 'TASK_COMPLETE':
        return `Completed task: ${(log.payload as any).name}`;
      case 'ROUTINE_SESSION_COMPLETE':
        return `Completed routine session: ${(log.payload as any).name}`;
      case 'TIMER_START':
        return 'Started timer';
      case 'TIMER_STOP':
        return 'Stopped timer';
      default:
        return 'Activity logged';
    }
  };

  return {
    state,
    derivedState,
    actions,
    dispatch,
    addLog,
  };
};