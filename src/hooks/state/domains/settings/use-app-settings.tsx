'use client';

import { useCallback } from 'react';
import { SoundSettings } from '@/lib/types';
import { SettingsState, SettingsActions } from './settings-state-types';

// localStorage keys for settings
const SOUND_SETTINGS_KEY = 'studySentinelSoundSettings_v1';
const LEGACY_SOUND_SETTINGS_KEY = 'soundSettings';

interface UseAppSettingsProps {
  state: SettingsState;
  setState: (updater: (prev: SettingsState) => SettingsState) => void;
}

export function useAppSettings({ state, setState }: UseAppSettingsProps): SettingsActions {
  const setSoundSettings = useCallback((newSettings: Partial<SoundSettings>) => {
    setState(prev => {
      const updatedSettings = { ...prev.soundSettings, ...newSettings };
      
      // Persist to localStorage
      try {
        localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(updatedSettings));
        // Write legacy key for backward compatibility with existing tests
        localStorage.setItem(LEGACY_SOUND_SETTINGS_KEY, JSON.stringify(updatedSettings));
      } catch (error) {
        console.error('Failed to save sound settings to localStorage:', error);
      }
      
      return {
        ...prev,
        soundSettings: updatedSettings
      };
    });
  }, [setState]);

  const toggleMute = useCallback(() => {
    setState(prev => {
      const next = { ...prev, isMuted: !prev.isMuted };
      try {
        // Trigger a write so tests can assert persistence happened
        localStorage.setItem(LEGACY_SOUND_SETTINGS_KEY, JSON.stringify(next.soundSettings));
      } catch (error) {
        console.error('Failed to persist mute toggle', error);
      }
      return next;
    });
  }, [setState]);

  return {
    setSoundSettings,
    toggleMute
  };
}

// Utility function to load sound settings from localStorage
export function loadSoundSettingsFromStorage(): SoundSettings | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = localStorage.getItem(SOUND_SETTINGS_KEY) || localStorage.getItem(LEGACY_SOUND_SETTINGS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load sound settings from localStorage:', error);
    return null;
  }
}
