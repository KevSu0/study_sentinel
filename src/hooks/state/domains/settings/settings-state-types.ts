import type { SoundSettings } from '@/lib/types';

export type SettingsState = {
  soundSettings: SoundSettings;
  isMuted: boolean;
};

export type SettingsActions = {
  setSoundSettings: (s: Partial<SoundSettings>) => void;
  toggleMute: () => void;
};

export type SettingsContextType = {
  state: SettingsState;
  actions: SettingsActions;
};

export const defaultSoundSettings: SoundSettings = {
  alarm: 'alarm_clock',
  tick: 'none',
  notificationInterval: 15,
};

export const defaultSettingsState: SettingsState = {
  soundSettings: defaultSoundSettings,
  isMuted: false,
};
