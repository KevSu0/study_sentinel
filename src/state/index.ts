// Core state management
export { useAppState } from './core/use-app-state';

// State providers
export { AppStateProvider, useAppStateContext, GlobalStateProvider } from './providers/AppStateProvider';
export { BackwardCompatibilityProvider, useLegacyGlobalState, useGlobalState } from './providers/BackwardCompatibilityProvider';

// Persistence utilities
export { 
  useStatePersistence, 
  useStateHydration,
  STORAGE_KEYS,
  persistenceUtils,
  migrationUtils 
} from './utils/use-state-persistence';

// Type definitions
export type {
  // Core types
  AppState,
  StateAction,
  DomainEvent,
  
  // Entity types
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
  
  // Domain state types
  TasksState,
  RoutinesState,
  ProfileState,
  BadgesState,

  UIState,
  SettingsState,
  
  // Repository types
  IRepository,
  
  // Persistence types
  PersistenceConfig,
  StatePersistence,
} from './types/state-types';

// Re-export for backward compatibility
export { useGlobalState as useGlobalStateCompat } from './providers/BackwardCompatibilityProvider';