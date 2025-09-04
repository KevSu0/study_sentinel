'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type SettingsContextType, type SettingsState, defaultSettingsState } from './settings-state-types';
import { useAppSettings, loadSoundSettingsFromStorage } from './use-app-settings';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
  initialState?: Partial<SettingsState>;
}

export function SettingsProvider({ children, initialState }: SettingsProviderProps) {
  const [state, setState] = useState<SettingsState>(() => {
    // Load sound settings from localStorage if available
    const savedSoundSettings = loadSoundSettingsFromStorage();
    
    return {
      ...defaultSettingsState,
      ...initialState,
      soundSettings: savedSoundSettings || initialState?.soundSettings || defaultSettingsState.soundSettings
    };
  });

  // Initialize settings from localStorage on mount
  useEffect(() => {
    const savedSoundSettings = loadSoundSettingsFromStorage();
    if (savedSoundSettings) {
      setState(prev => ({
        ...prev,
        soundSettings: savedSoundSettings
      }));
    }
  }, []);

  const actions = useAppSettings({ state, setState });

  const contextValue: SettingsContextType = {
    state,
    actions
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

// Hook to use settings context
export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Convenience hooks for specific parts of settings
export function useSoundSettings() {
  const { state, actions } = useSettings();
  return {
    soundSettings: state.soundSettings,
    setSoundSettings: actions.setSoundSettings
  };
}

export function useMuteSettings() {
  const { state, actions } = useSettings();
  return {
    isMuted: state.isMuted,
    toggleMute: actions.toggleMute
  };
}