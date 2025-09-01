"use client";

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BaseAppState } from './state-types';
import { loadJSON, saveJSON } from './use-state-persistence';

type AppStateContextType = {
  state: BaseAppState;
  setLoaded: (loaded: boolean) => void;
};

const DEFAULT_STATE: BaseAppState = { isLoaded: false };
const STORAGE_KEY = 'appState:core';

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const initial = loadJSON<BaseAppState>(STORAGE_KEY) ?? DEFAULT_STATE;
  const [state, setState] = useState<BaseAppState>(initial);

  const setLoaded = (loaded: boolean) => {
    setState(prev => {
      const next = { ...prev, isLoaded: loaded };
      saveJSON(STORAGE_KEY, next);
      return next;
    });
  };

  const value = useMemo<AppStateContextType>(() => ({ state, setLoaded }), [state]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextType {
  const ctx = useContext(AppStateContext);
  /* istanbul ignore next */
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
