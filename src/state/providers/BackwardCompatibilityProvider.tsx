import React, { createContext, useContext, type ReactNode } from 'react';
import { useAppStateContext } from './AppStateProvider';
import type {
  StudyTask,
  Routine,
  UserProfile,
  Badge,
  SoundSettings,
  LogEvent,
  CompletedWork,
  ActivityFeedItem,
  ActiveTimerItem,
  ManualLogFormData,
} from '../types/state-types';

// Legacy context type that matches the original useGlobalState interface
interface LegacyGlobalStateContextType {
  // Direct state access (flattened for backward compatibility)
  tasks: Map<string, StudyTask>;
  routines: Map<string, Routine>;
  profile: UserProfile;
  badges: Map<string, Badge>;
  customBadges: Map<string, Badge>;
  earnedBadges: Map<string, Badge>;
  logs: Map<string, LogEvent>;
  sessions: Map<string, any>;
  soundSettings: SoundSettings;
  activeTimer: ActiveTimerItem | null;
  
  // Derived state (computed values)
  todaysLogs: LogEvent[];
  allCompletedWork: CompletedWork[];
  todaysCompletedWork: CompletedWork[];
  todaysPoints: number;
  todaysBadges: Badge[];
  derivedTodaysActivity: ActivityFeedItem[];
  
  // UI state
  quickStartDialogOpen: boolean;
  quickStartDialogData: any;
  routineLogDialogOpen: boolean;
  routineLogDialogData: any;
  
  // Legacy action functions (maintaining original signatures)
  _addTask: (task: Omit<StudyTask, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTask: (id: string, updates: Partial<StudyTask>) => void;
  archiveTask: (id: string) => void;
  unarchiveTask: (id: string) => void;
  pushTaskToNextDay: (id: string) => void;
  manuallyCompleteItem: (id: string, data: ManualLogFormData) => void;
  
  addRoutine: (routine: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateRoutine: (id: string, updates: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  
  startTimer: (id: string, type: 'task' | 'routine', duration: number) => void;
  togglePause: () => void;
  stopTimer: () => void;
  completeTimer: () => void;
  
  updateProfile: (updates: Partial<UserProfile>) => void;
  
  addBadge: (badge: Omit<Badge, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateBadge: (id: string, updates: Partial<Badge>) => void;
  deleteBadge: (id: string) => void;
  
  setSoundSettings: (settings: Partial<SoundSettings>) => void;
  toggleMute: () => void;
  
  _addLog: (logData: Omit<LogEvent, 'id' | 'timestamp'>) => LogEvent;
  removeLog: (id: string) => void;
  updateLog: (id: string, updates: Partial<LogEvent>) => void;
  
  retryItem: (id: string, type: 'task' | 'routine') => void;
  playSound: (soundType: string) => void;
  stopSound: () => void;
  showNewQuote: () => void;
  
  // Dialog management
  setQuickStartDialogOpen: (open: boolean) => void;
  setQuickStartDialogData: (data: any) => void;
  setRoutineLogDialogOpen: (open: boolean) => void;
  setRoutineLogDialogData: (data: any) => void;
}

// Create legacy context
const LegacyGlobalStateContext = createContext<LegacyGlobalStateContextType | undefined>(undefined);

// Provider props
interface BackwardCompatibilityProviderProps {
  children: ReactNode;
}

/**
 * Backward compatibility provider that wraps the new state system
 * and provides the old useGlobalState interface
 */
export const BackwardCompatibilityProvider: React.FC<BackwardCompatibilityProviderProps> = ({ children }) => {
  const { state, derivedState, actions } = useAppStateContext();
  
  // Map new state structure to legacy format
  const legacyContextValue: LegacyGlobalStateContextType = {
    // Direct state access (flattened)
    tasks: new Map(state.tasks.items),
    routines: new Map(state.routines.items),
    profile: state.profile.data,
    badges: new Map(state.badges.available),
    customBadges: new Map(state.badges.custom),
    earnedBadges: new Map(Array.from(state.badges.available.entries()).filter(([id]) => 
      state.badges.earned.has(id)
    )),
    logs: new Map(state.logs.items),
    sessions: new Map(state.sessions.items),
    soundSettings: state.settings.sound,
    activeTimer: state.tasks.activeTimer || state.routines.activeTimer,
    
    // Derived state
    todaysLogs: derivedState.todaysLogs,
    allCompletedWork: derivedState.allCompletedWork,
    todaysCompletedWork: derivedState.todaysCompletedWork,
    todaysPoints: derivedState.todaysPoints,
    todaysBadges: derivedState.todaysBadges,
    derivedTodaysActivity: derivedState.activityFeed,
    
    // UI state (mapped from new structure)
    quickStartDialogOpen: state.ui.modals.quickStart.isOpen,
    quickStartDialogData: state.ui.modals.quickStart.data,
    routineLogDialogOpen: state.ui.modals.routineLog.isOpen,
    routineLogDialogData: state.ui.modals.routineLog.data,
    
    // Legacy action functions (mapped to new actions)
    _addTask: actions.addTask,
    updateTask: actions.updateTask,
    archiveTask: actions.archiveTask,
    unarchiveTask: actions.unarchiveTask,
    pushTaskToNextDay: actions.pushTaskToNextDay,
    manuallyCompleteItem: actions.manuallyCompleteTask,
    
    addRoutine: actions.addRoutine,
    updateRoutine: actions.updateRoutine,
    deleteRoutine: actions.deleteRoutine,
    
    startTimer: actions.startTimer,
    togglePause: () => {
      const activeTimer = state.tasks.activeTimer || state.routines.activeTimer;
      if (activeTimer) {
        if (activeTimer.isPaused) {
          actions.resumeTimer?.();
        } else {
          actions.pauseTimer?.();
        }
      }
    },
    stopTimer: actions.stopTimer,
    completeTimer: actions.completeTimer,
    
    updateProfile: actions.updateProfile,
    
    addBadge: actions.addBadge,
    updateBadge: actions.updateBadge,
    deleteBadge: actions.deleteBadge,
    
    setSoundSettings: actions.updateSoundSettings,
    toggleMute: actions.toggleMute,
    
    _addLog: actions.addLog,
    removeLog: actions.removeLog,
    updateLog: actions.updateLog,
    
    retryItem: actions.retryItem,
    playSound: actions.playSound,
    stopSound: actions.stopSound,
    showNewQuote: actions.showNewQuote,
    
    // Dialog management (mapped to modal actions)
    setQuickStartDialogOpen: (open: boolean) => {
      if (open) {
        actions.openModal('quickStart');
      } else {
        actions.closeModal('quickStart');
      }
    },
    setQuickStartDialogData: (data: any) => {
      actions.openModal('quickStart', data);
    },
    setRoutineLogDialogOpen: (open: boolean) => {
      if (open) {
        actions.openModal('routineLog');
      } else {
        actions.closeModal('routineLog');
      }
    },
    setRoutineLogDialogData: (data: any) => {
      actions.openModal('routineLog', data);
    },
  };
  
  return (
    <LegacyGlobalStateContext.Provider value={legacyContextValue}>
      {children}
    </LegacyGlobalStateContext.Provider>
  );
};

/**
 * Legacy hook that provides the old useGlobalState interface
 * This allows existing components to work without modification
 */
export const useLegacyGlobalState = (): LegacyGlobalStateContextType => {
  const context = useContext(LegacyGlobalStateContext);
  if (context === undefined) {
    throw new Error('useLegacyGlobalState must be used within a BackwardCompatibilityProvider');
  }
  return context;
};

// Export for backward compatibility
export const useGlobalState = useLegacyGlobalState;