// Settings domain exports
export * from './settings-state-types';
export * from './use-sound-settings';
export * from './use-app-settings';
export * from './SettingsProvider';

// Re-export commonly used items for convenience
export { useSettings, useSoundSettings, useMuteSettings } from './SettingsProvider';
export { defaultSoundSettings, defaultSettingsState } from './settings-state-types';
export type { SettingsState, SettingsActions, SettingsContextType } from './settings-state-types';