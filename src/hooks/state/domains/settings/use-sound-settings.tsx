"use client";

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SettingsState } from './settings-state-types';
import type { SoundSettings } from '@/lib/types';
import { loadJSON, saveJSON } from '../../core/use-state-persistence';

const DEFAULT_SETTINGS: SoundSettings = { alarm: 'alarm_clock', tick: 'none', notificationInterval: 15 };
const STORAGE_KEY = 'state:settings';

type Ctx = {
  state: SettingsState;
  setSoundSettings: (s: Partial<SoundSettings>) => void;
  toggleMute: () => void;
};

const SettingsContext = createContext<Ctx | undefined>(undefined);

export function SoundSettingsProvider({ children }: { children: ReactNode }) {
  const initial = loadJSON<SettingsState>(STORAGE_KEY) ?? { soundSettings: DEFAULT_SETTINGS, isMuted: false };
  const [state, setState] = useState<SettingsState>(initial);

  const setSoundSettings = (s: Partial<SoundSettings>) => {
    setState(prev => {
      const next = { ...prev, soundSettings: { ...prev.soundSettings, ...s } };
      saveJSON(STORAGE_KEY, next);
      return next;
    });
  };

  const toggleMute = () => {
    setState(prev => {
      const next = { ...prev, isMuted: !prev.isMuted };
      saveJSON(STORAGE_KEY, next);
      return next;
    });
  };

  const value = useMemo<Ctx>(() => ({ state, setSoundSettings, toggleMute }), [state]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSoundSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  /* istanbul ignore next */
  if (!ctx) throw new Error('useSoundSettings must be used within SettingsProvider');
  return ctx;
}
