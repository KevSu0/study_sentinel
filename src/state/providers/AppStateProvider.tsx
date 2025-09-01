import React, { createContext, useContext, ReactNode } from 'react';
import { useAppState } from '../core/use-app-state';
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
  ManualLogFormData,
} from '../types/state-types';

// Context type definition
interface AppStateContextType {
  // Core state
  state: AppState;
  
  // Derived state
  derivedState: {
    todaysLogs: LogEvent[];
    allCompletedWork: CompletedWork[];
    todaysCompletedWork: CompletedWork[];
    todaysPoints: number;
    todaysBadges: Badge[];
    activityFeed: ActivityFeedItem[];
  };
  
  // Actions
  actions: {
    // Task actions
    addTask: (task: Omit<StudyTask, 'id' | 'createdAt' | 'updatedAt'>) => string;
    updateTask: (id: string, updates: Partial<StudyTask>) => void;
    deleteTask: (id: string) => void;
    archiveTask: (id: string) => void;
    unarchiveTask: (id: string) => void;
    pushTaskToNextDay: (id: string) => void;
    manuallyCompleteTask: (id: string, data: ManualLogFormData) => void;
    
    // Routine actions
    addRoutine: (routine: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>) => string;
    updateRoutine: (id: string, updates: Partial<Routine>) => void;
    deleteRoutine: (id: string) => void;
    
    // Timer actions
    startTimer: (id: string, type: 'task' | 'routine', duration: number) => void;
    stopTimer: () => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    completeTimer: () => void;
    
    // Profile actions
    updateProfile: (updates: Partial<UserProfile>) => void;
    
    // Badge actions
    addBadge: (badge: Omit<Badge, 'id' | 'createdAt' | 'updatedAt'>) => string;
    updateBadge: (id: string, updates: Partial<Badge>) => void;
    deleteBadge: (id: string) => void;
    awardBadge: (badgeId: string, reason?: string) => void;
    
    // Settings actions
    updateSoundSettings: (settings: Partial<SoundSettings>) => void;
    toggleMute: () => void;
    
    // Log actions
    addLog: (logData: Omit<LogEvent, 'id' | 'timestamp'>) => LogEvent;
    removeLog: (id: string) => void;
    updateLog: (id: string, updates: Partial<LogEvent>) => void;
    
    // UI actions
    setActiveView: (view: string) => void;
    toggleSidebar: () => void;
    openModal: (modalName: string, data?: any) => void;
    closeModal: (modalName: string) => void;
    addNotification: (notification: { id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string; duration?: number }) => void;
    removeNotification: (id: string) => void;
    
    // Utility actions
    retryItem: (id: string, type: 'task' | 'routine') => void;
    playSound: (soundType: string) => void;
    stopSound: () => void;
    showNewQuote: () => void;
  };
  
  // Core dispatch function
  dispatch: (action: StateAction) => void;
}

// Create context with undefined default (will be provided by provider)
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Provider props
interface AppStateProviderProps {
  children: ReactNode;
}

/**
 * Main application state provider that wraps the entire app
 * Provides centralized state management with domain separation
 */
export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const { state, derivedState, actions, dispatch, addLog } = useAppState();

  // Extended actions that build on core actions
  const extendedActions = {
    ...actions,
    addLog,
    
    // Task management
    archiveTask: (id: string) => {
      actions.updateTask(id, { status: 'archived' });
      addLog({
          type: 'TASK_ARCHIVED',
          payload: { taskId: id },
        });
    },
    
    unarchiveTask: (id: string) => {
      actions.updateTask(id, { status: 'todo' });
      addLog({
          type: 'TASK_UNARCHIVED',
          payload: { taskId: id },
        });
    },
    
    pushTaskToNextDay: (id: string) => {
      const task = state.tasks.items.get(id);
      if (task) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        actions.updateTask(id, {});
        addLog({
          type: 'TASK_RESCHEDULED',
          payload: { taskId: id, newDate: tomorrow },
        });
      }
    },
    
    manuallyCompleteTask: (id: string, data: ManualLogFormData) => {
      const task = state.tasks.items.get(id);
      if (task) {
        actions.updateTask(id, { status: 'completed' });
        addLog({
          type: 'TASK_COMPLETE',
          payload: {
            id: task.id,
            name: task.title,
            type: 'task',
            duration: 0,
            pointsEarned: 0,
            timestamp: new Date().getTime(),
            isManual: true,
            notes: data.notes,
          },
        });
      }
    },
    
    // Timer management
    pauseTimer: () => {
      const activeTimer = state.tasks.activeTimer || state.routines.activeTimer;
      if (activeTimer && !activeTimer.isPaused) {
        const pauseTime = Date.now();
        
        dispatch({
          type: 'UPDATE_TIMER',
          payload: {
            isPaused: true,
          },
        });
        
        addLog({
            type: activeTimer.type === 'task' ? 'TIMER_PAUSE' : 'ROUTINE_PAUSE',
            payload: { id: activeTimer.id, pauseTime },
          });
      }
    },
    
    resumeTimer: () => {
      const activeTimer = state.tasks.activeTimer || state.routines.activeTimer;
      if (activeTimer && activeTimer.isPaused) {
        const resumeTime = Date.now();
        const pauseDuration = resumeTime - (activeTimer.pausedTime || 0);
        
        dispatch({
          type: 'UPDATE_TIMER',
          payload: {
            isPaused: false,
          },
        });
        
        addLog({
            type: activeTimer.type === 'task' ? 'TIMER_RESUME' : 'ROUTINE_RESUME',
            payload: { id: activeTimer.id, resumeTime, pauseDuration },
          });
      }
    },
    
    completeTimer: () => {
      const activeTimer = state.tasks.activeTimer || state.routines.activeTimer;
      if (activeTimer) {
        const completionTime = new Date();
        const actualDuration = completionTime.getTime() - activeTimer.startTime.getTime() - activeTimer.totalPausedDuration;
        
        if (activeTimer.type === 'task') {
          const task = state.tasks.items.get(activeTimer.id);
          if (task) {
            actions.updateTask(activeTimer.id, { status: 'completed' });
            addLog({
              type: 'TASK_COMPLETE',
              payload: {
                id: activeTimer.id,
                name: task.title,
                type: 'task',
                duration: actualDuration,
                pointsEarned: calculateTaskPoints(task, actualDuration),
                timestamp: completionTime.getTime(),
                isManual: false,
              },
            });
          }
        } else {
          const routine = state.routines.items.get(activeTimer.id);
          if (routine) {
            addLog({
              type: 'ROUTINE_SESSION_COMPLETE',
              payload: {
                id: routine.id,
                name: routine.title,
                type: 'routine',
                duration: actualDuration,
                pointsEarned: calculateRoutinePoints(routine, actualDuration),
                timestamp: completionTime.getTime(),
                isManual: false,
              },
            });
          }
        }
        
        actions.stopTimer();
      }
    },
    
    // Profile management
    updateProfile: (updates: Partial<UserProfile>) => {
      dispatch({
        type: 'UPDATE_PROFILE',
        payload: {
          data: {
            ...state.profile.data,
            ...updates,
          },
        },
      });
    },
    
    // Badge management
    awardBadge: (badgeId: string, reason?: string) => {
      const badge = state.badges.available.get(badgeId) || state.badges.custom.get(badgeId);
      if (badge && !state.badges.earned.has(badgeId)) {
        const earnedBadge = {
          ...badge,
          earnedAt: new Date(),
          reason,
        };
        
        dispatch({
          type: 'AWARD_BADGE',
          payload: { badgeId, reason },
        });
        
        addLog({
          type: 'BADGE_EARNED',
          payload: { badgeId, badgeName: badge.name, reason },
        });
      }
    },
    
    // Settings management
    updateSoundSettings: (settings: Partial<SoundSettings>) => {
      dispatch({
        type: 'UPDATE_SOUND_SETTINGS',
        payload: {
          ...state.settings.sound,
          ...settings,
        },
      });
    },
    
    toggleMute: () => {
       dispatch({
         type: 'UPDATE_SETTINGS',
         payload: {
           isMuted: !state.settings.isMuted,
         },
       });
     },
    
    // Log management
    removeLog: (id: string) => {
      dispatch({
        type: 'REMOVE_LOG',
        payload: id,
      });
    },
    
    updateLog: (id: string, updates: Partial<LogEvent>) => {
      const existingLog = state.logs.items.get(id);
      if (existingLog) {
        dispatch({
          type: 'UPDATE_LOG',
          payload: { id, updates },
        });
      }
    },
    
    // UI management
    setActiveView: (view: string) => {
      dispatch({
        type: 'SET_ACTIVE_VIEW',
        payload: view,
      });
    },
    
    toggleSidebar: () => {
      dispatch({
        type: 'TOGGLE_SIDEBAR',
        payload: !state.ui.sidebarOpen,
      });
    },
    
    openModal: (modalName: string, data?: any) => {
      dispatch({
        type: 'OPEN_MODAL',
        payload: { modalName, data },
      });
    },
    
    closeModal: (modalName: string) => {
      dispatch({
        type: 'CLOSE_MODAL',
        payload: modalName,
      });
    },
    
    addNotification: (notification: { id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string; duration?: number }) => {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: notification,
      });
      
      // Auto-remove notification after duration
      if (notification.duration !== 0) {
        setTimeout(() => {
          extendedActions.removeNotification(notification.id);
        }, notification.duration || 5000);
      }
    },
    
    removeNotification: (id: string) => {
      dispatch({
        type: 'REMOVE_NOTIFICATION',
        payload: id,
      });
    },
    
    // Utility actions
    retryItem: (id: string, type: 'task' | 'routine') => {
      if (type === 'task') {
        actions.updateTask(id, { status: 'todo' });
      }
      addLog({
        type: 'ITEM_RETRY',
        payload: { id, type },
      });
    },
    
    playSound: (soundType: string) => {
      if (!state.settings.isMuted) {
        // Integrate with SoundProvider
        console.log(`Playing sound: ${soundType}`);
      }
    },
    
    stopSound: () => {
      console.log('Stopping sound');
    },
    
    showNewQuote: () => {
      // Integrate with QuoteProvider
      console.log('Showing new quote');
    },
  };
  
  // Context value
  const contextValue: AppStateContextType = {
    state,
    derivedState,
    actions: extendedActions,
    dispatch,
  };
  
  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};

/**
 * Hook to consume the app state context
 * Provides type-safe access to the global state and actions
 */
export const useAppStateContext = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppStateContext must be used within an AppStateProvider');
  }
  return context;
};

// Helper functions for point calculation
function calculateTaskPoints(task: StudyTask, duration: number): number {
  // Basic point calculation - can be enhanced based on task priority, difficulty, etc.
  const basePoints = Math.floor(duration / (1000 * 60)); // 1 point per minute
  const priorityMultiplier = task.priority === 'high' ? 1.5 : task.priority === 'medium' ? 1.2 : 1;
  return Math.floor(basePoints * priorityMultiplier);
}

function calculateRoutinePoints(routine: Routine, duration: number): number {
  // Basic point calculation for routines
  const basePoints = Math.floor(duration / (1000 * 60)); // 1 point per minute
  return Math.floor(basePoints * 1.1); // Slight bonus for routine completion
}

// Export context for advanced usage
export { AppStateContext };

// Backward compatibility export
export const GlobalStateProvider = AppStateProvider;
export const useGlobalState = useAppStateContext;