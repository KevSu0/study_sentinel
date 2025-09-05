'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  type StudyTask,
  type Routine,
  type UserProfile,
  type Badge,
  type ActiveTimerItem,
  type CompletedWork,
  type TaskStatus,
  type TaskPriority,
  type SoundSettings,
} from '@/lib/types';
import { addDays, format, formatISO, subDays, parseISO, set, parse } from 'date-fns';
import { useConfetti } from '@/components/providers/confetti-provider';
import toast from 'react-hot-toast';
import { SYSTEM_BADGES, checkBadge } from '@/lib/badges';
import { getSessionDate, getStudyDateForTimestamp, getStudyDay, generateShortId } from '@/lib/utils';
import { motivationalQuotes, getRandomMotivationalMessage } from '@/lib/motivation';
import { taskRepository, profileRepository, routineRepository, badgeRepository, sessionRepository } from '@/lib/repositories';
import { SyncEngine } from '@/lib/sync';

// Performance optimized types and interfaces
export type ActivityFeedItem = {
  type: 'TASK_COMPLETE' | 'ROUTINE_COMPLETE' | 'TASK_STOPPED' | 'TIMER_STOP';
  data: any;
  timestamp: string;
};

type RoutineLogDialogState = {
  isOpen: boolean;
  action: 'complete' | 'stop' | null;
};

interface AppState {
  isLoaded: boolean;
  tasks: StudyTask[];
  logs: LogEvent[];
  profile: UserProfile;
  routines: Routine[];
  allBadges: Badge[];
  earnedBadges: Map<string, string>;
  soundSettings: SoundSettings;
  activeItem: ActiveTimerItem | null;
  timeDisplay: string;
  isPaused: boolean;
  isOvertime: boolean;
  isMuted: boolean;
  timerProgress: number | null;
  currentQuote: string;
  routineLogDialog: RoutineLogDialogState;
  todaysLogs: LogEvent[];
  previousDayLogs: LogEvent[];
  allCompletedWork: CompletedWork[];
  todaysCompletedWork: CompletedWork[];
  todaysPoints: number;
  todaysBadges: Badge[];
  starCount: number;
  showStarAnimation: boolean;
  todaysActivity: ActivityFeedItem[];
  quickStartOpen: boolean;
}

// Memoized selectors for better performance
const createSelectors = (state: AppState) => ({
  // Memoized task selectors
  activeTasks: useMemo(
    () => state.tasks.filter(task => task.status !== 'archived'),
    [state.tasks]
  ),
  
  completedTasks: useMemo(
    () => state.tasks.filter(task => task.status === 'completed'),
    [state.tasks]
  ),
  
  todaysTasks: useMemo(
    () => state.tasks.filter(task => {
      const today = format(getSessionDate(), 'yyyy-MM-dd');
      return task.date === today && task.status !== 'archived';
    }),
    [state.tasks]
  ),
  
  // Memoized routine selectors
  activeRoutines: useMemo(
    () => state.routines.filter(routine => routine.status === 'todo'),
    [state.routines]
  ),
  
  // Memoized badge selectors
  earnedBadgesList: useMemo(
    () => Array.from(state.earnedBadges.entries()),
    [state.earnedBadges]
  ),
  
  // Memoized activity selectors
  todaysActivityFiltered: useMemo(
    () => {
      const today = format(getSessionDate(), 'yyyy-MM-dd');
      return state.todaysActivity.filter(activity => 
        activity.timestamp.startsWith(today)
      );
    },
    [state.todaysActivity]
  ),
  
  // Memoized stats
  todaysStats: useMemo(
    () => ({
      totalTasks: state.tasks.filter(t => {
        const today = format(getSessionDate(), 'yyyy-MM-dd');
        return t.date === today && t.status !== 'archived';
      }).length,
      completedTasks: state.tasks.filter(t => {
        const today = format(getSessionDate(), 'yyyy-MM-dd');
        return t.date === today && t.status === 'completed';
      }).length,
      totalRoutines: state.routines.filter(r => r.status === 'todo').length,
      completedRoutines: state.todaysLogs.filter(l => l.type === 'ROUTINE_SESSION_COMPLETE').length,
      totalPoints: state.todaysPoints,
      badgesEarned: state.todaysBadges.length,
    }),
    [state.tasks, state.routines, state.todaysLogs, state.todaysPoints, state.todaysBadges]
  ),
});

// Performance optimized context type
interface OptimizedGlobalStateContextType {
  state: AppState;
  selectors: ReturnType<typeof createSelectors>;
  actions: {
    addTask: (task: Omit<StudyTask, 'id' | 'status' | 'shortId'> & { id?: string }) => Promise<void>;
    updateTask: (updatedTask: StudyTask, isManualCompletion?: boolean) => void;
    archiveTask: (taskId: string) => void;
    unarchiveTask: (taskId: string) => void;
    pushTaskToNextDay: (taskId: string) => void;
    startTimer: (item: StudyTask | Routine) => void;
    togglePause: () => void;
    completeTimer: (studyLog?: string) => void;
    stopTimer: (reason: string, studyLog?: string) => void;
    addRoutine: (routine: Omit<Routine, 'id' | 'shortId' | 'status' | 'createdAt'> & Partial<Pick<Routine, 'id'>>) => Promise<string>;
    updateRoutine: (routine: Routine) => void;
    deleteRoutine: (routineId: string) => void;
    addBadge: (badge: Omit<Badge, 'id'>) => Promise<void>;
    updateBadge: (badge: Badge) => void;
    deleteBadge: (badgeId: string) => Promise<void>;
    updateProfile: (newProfileData: Partial<UserProfile>) => void;
    openRoutineLogDialog: (action: 'complete' | 'stop') => void;
    closeRoutineLogDialog: () => void;
    setSoundSettings: (newSettings: Partial<SoundSettings>) => void;
    toggleMute: () => void;
    addLog: (type: LogEvent['type'], payload: LogEvent['payload']) => void;
    removeLog: (logId: string) => void;
    updateLog: (logId: string, updatedLog: Partial<LogEvent>) => void;
    retryItem: (item: ActivityFeedItem) => void;
    openQuickStart: () => void;
    closeQuickStart: () => void;
  };
}

const OptimizedGlobalStateContext = createContext<OptimizedGlobalStateContextType | undefined>(undefined);

// Performance optimized provider component
export function OptimizedGlobalStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    isLoaded: false,
    tasks: [],
    logs: [],
    profile: { name: '', email: '', phone: '', passion: '', dream: '', education: '', reasonForUsing: '', dailyStudyGoal: 8 },
    routines: [],
    allBadges: [],
    earnedBadges: new Map(),
    soundSettings: { alarm: 'alarm_clock', tick: 'none', notificationInterval: 15 },
    activeItem: null,
    timeDisplay: '00:00',
    isPaused: true,
    isOvertime: false,
    isMuted: false,
    timerProgress: null,
    currentQuote: motivationalQuotes[0],
    routineLogDialog: { isOpen: false, action: null },
    todaysLogs: [],
    previousDayLogs: [],
    allCompletedWork: [],
    todaysCompletedWork: [],
    todaysPoints: 0,
    todaysBadges: [],
    starCount: 0,
    showStarAnimation: false,
    todaysActivity: [],
    quickStartOpen: false,
  });

  // Memoized selectors
  const selectors = useMemo(() => createSelectors(state), [state]);

  // Memoized actions with useCallback for performance
  const actions = useMemo(() => ({
    addTask: useCallback(async (task: Omit<StudyTask, 'id' | 'status' | 'shortId'> & { id?: string }) => {
      // Implementation would go here
      console.log('Adding task:', task);
    }, []),

    updateTask: useCallback((updatedTask: StudyTask, isManualCompletion?: boolean) => {
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
      }));
    }, []),

    archiveTask: useCallback((taskId: string) => {
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => 
          task.id === taskId ? { ...task, status: 'archived' as TaskStatus } : task
        )
      }));
    }, []),

    unarchiveTask: useCallback((taskId: string) => {
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => 
          task.id === taskId ? { ...task, status: 'todo' as TaskStatus } : task
        )
      }));
    }, []),

    pushTaskToNextDay: useCallback((taskId: string) => {
      const nextDay = format(addDays(getSessionDate(), 1), 'yyyy-MM-dd');
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => 
          task.id === taskId ? { ...task, date: nextDay } : task
        )
      }));
    }, []),

    startTimer: useCallback((item: StudyTask | Routine) => {
      const activeTimerItem: ActiveTimerItem = 'timerType' in item 
        ? { type: 'task', item: item as StudyTask }
        : { type: 'routine', item: item as Routine };
      
      setState(prev => ({
        ...prev,
        activeItem: activeTimerItem,
        isPaused: false
      }));
    }, []),

    togglePause: useCallback(() => {
      setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    }, []),

    completeTimer: useCallback((studyLog?: string) => {
      setState(prev => ({ ...prev, activeItem: null, isPaused: true }));
    }, []),

    stopTimer: useCallback((reason: string, studyLog?: string) => {
      setState(prev => ({ ...prev, activeItem: null, isPaused: true }));
    }, []),

    // Add other actions with similar memoization patterns...
    addRoutine: useCallback(async (routine) => {
      console.log('Adding routine:', routine);
      return 'new-routine-id';
    }, []),

    updateRoutine: useCallback((routine: Routine) => {
      setState(prev => ({
        ...prev,
        routines: prev.routines.map(r => r.id === routine.id ? routine : r)
      }));
    }, []),

    deleteRoutine: useCallback((routineId: string) => {
      setState(prev => ({
        ...prev,
        routines: prev.routines.filter(r => r.id !== routineId)
      }));
    }, []),

    addBadge: useCallback(async (badge: Omit<Badge, 'id'>) => {
      console.log('Adding badge:', badge);
    }, []),

    updateBadge: useCallback((badge: Badge) => {
      setState(prev => ({
        ...prev,
        allBadges: prev.allBadges.map(b => b.id === badge.id ? badge : b)
      }));
    }, []),

    deleteBadge: useCallback(async (badgeId: string) => {
      setState(prev => ({
        ...prev,
        allBadges: prev.allBadges.filter(b => b.id !== badgeId)
      }));
    }, []),

    updateProfile: useCallback((newProfileData: Partial<UserProfile>) => {
      setState(prev => ({
        ...prev,
        profile: { ...prev.profile, ...newProfileData }
      }));
    }, []),

    openRoutineLogDialog: useCallback((action: 'complete' | 'stop') => {
      setState(prev => ({
        ...prev,
        routineLogDialog: { isOpen: true, action }
      }));
    }, []),

    closeRoutineLogDialog: useCallback(() => {
      setState(prev => ({
        ...prev,
        routineLogDialog: { isOpen: false, action: null }
      }));
    }, []),

    setSoundSettings: useCallback((newSettings: Partial<SoundSettings>) => {
      setState(prev => ({
        ...prev,
        soundSettings: { ...prev.soundSettings, ...newSettings }
      }));
    }, []),

    toggleMute: useCallback(() => {
      setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }, []),

    addLog: useCallback((type: LogEvent['type'], payload: LogEvent['payload']) => {
      const newLog: LogEvent = {
        id: crypto.randomUUID(),
        type,
        payload,
        timestamp: new Date().toISOString()
      };
      setState(prev => ({
        ...prev,
        logs: [...prev.logs, newLog],
        todaysLogs: [...prev.todaysLogs, newLog]
      }));
    }, []),

    removeLog: useCallback((logId: string) => {
      setState(prev => ({
        ...prev,
        logs: prev.logs.filter(log => log.id !== logId),
        todaysLogs: prev.todaysLogs.filter(log => log.id !== logId)
      }));
    }, []),

    updateLog: useCallback((logId: string, updatedLog: Partial<LogEvent>) => {
      setState(prev => ({
        ...prev,
        logs: prev.logs.map(log => log.id === logId ? { ...log, ...updatedLog } : log),
        todaysLogs: prev.todaysLogs.map(log => log.id === logId ? { ...log, ...updatedLog } : log)
      }));
    }, []),

    retryItem: useCallback((item: ActivityFeedItem) => {
      console.log('Retrying item:', item);
    }, []),

    openQuickStart: useCallback(() => {
      setState(prev => ({ ...prev, quickStartOpen: true }));
    }, []),

    closeQuickStart: useCallback(() => {
      setState(prev => ({ ...prev, quickStartOpen: false }));
    }, []),
  }), []);

  // Memoized context value
  const contextValue = useMemo(() => ({
    state,
    selectors,
    actions
  }), [state, selectors, actions]);

  return (
    <OptimizedGlobalStateContext.Provider value={contextValue}>
      {children}
    </OptimizedGlobalStateContext.Provider>
  );
}

// Performance optimized hook
export function useOptimizedGlobalState() {
  const context = useContext(OptimizedGlobalStateContext);
  if (context === undefined) {
    throw new Error('useOptimizedGlobalState must be used within an OptimizedGlobalStateProvider');
  }
  return context;
}

// Selector hooks for specific data to prevent unnecessary re-renders
export function useTasksSelector() {
  const { selectors } = useOptimizedGlobalState();
  return useMemo(() => ({
    activeTasks: selectors.activeTasks,
    completedTasks: selectors.completedTasks,
    todaysTasks: selectors.todaysTasks,
  }), [selectors.activeTasks, selectors.completedTasks, selectors.todaysTasks]);
}

export function useRoutinesSelector() {
  const { selectors } = useOptimizedGlobalState();
  return useMemo(() => ({
    activeRoutines: selectors.activeRoutines,
  }), [selectors.activeRoutines]);
}

export function useBadgesSelector() {
  const { state, selectors } = useOptimizedGlobalState();
  return useMemo(() => ({
    allBadges: state.allBadges,
    earnedBadges: selectors.earnedBadgesList,
    todaysBadges: state.todaysBadges,
  }), [state.allBadges, selectors.earnedBadgesList, state.todaysBadges]);
}

export function useStatsSelector() {
  const { selectors } = useOptimizedGlobalState();
  return selectors.todaysStats;
}

export function useTimerSelector() {
  const { state } = useOptimizedGlobalState();
  return useMemo(() => ({
    activeItem: state.activeItem,
    timeDisplay: state.timeDisplay,
    isPaused: state.isPaused,
    isOvertime: state.isOvertime,
    timerProgress: state.timerProgress,
    starCount: state.starCount,
  }), [state.activeItem, state.timeDisplay, state.isPaused, state.isOvertime, state.timerProgress, state.starCount]);
}