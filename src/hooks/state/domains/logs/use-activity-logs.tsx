"use client";

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { LogEvent, LogState } from './log-state-types';
import { loadJSON, saveJSON } from '../../core/use-state-persistence';

const STORAGE_KEY = 'state:logs';

type Ctx = {
  state: LogState;
  addLog: (type: string, payload?: any) => string;
  updateLog: (id: string, patch: Partial<LogEvent>) => void;
  removeLog: (id: string) => void;
};

const LogContext = createContext<Ctx | undefined>(undefined);

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const initial = loadJSON<LogState>(STORAGE_KEY) ?? { logs: [] };
  const [state, setState] = useState<LogState>(initial);

  const persist = (next: LogState) => saveJSON(STORAGE_KEY, next);

  const addLog = (type: string, payload?: any) => {
    const id = `${Date.now()}-${Math.random()}`;
    const ev: LogEvent = { id, type, timestamp: new Date().toISOString(), payload };
    setState(prev => {
      const next = { logs: [...prev.logs, ev] };
      persist(next);
      return next;
    });
    return id;
  };
  const updateLog = (id: string, patch: Partial<LogEvent>) => {
    setState(prev => {
      const next = { logs: prev.logs.map(l => (l.id === id ? { ...l, ...patch } : l)) };
      persist(next);
      return next;
    });
  };
  const removeLog = (id: string) => {
    setState(prev => {
      const next = { logs: prev.logs.filter(l => l.id !== id) };
      persist(next);
      return next;
    });
  };

  const value = useMemo<Ctx>(() => ({ state, addLog, updateLog, removeLog }), [state]);
  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

export function useActivityLogs(): Ctx {
  const ctx = useContext(LogContext);
  /* istanbul ignore next */
  if (!ctx) throw new Error('useActivityLogs must be used within ActivityLogProvider');
  return ctx;
}
