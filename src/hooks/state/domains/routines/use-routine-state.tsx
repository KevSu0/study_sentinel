"use client";

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Routine, RoutineState } from './routine-state-types';
import { loadJSON, saveJSON } from '../../core/use-state-persistence';

const STORAGE_KEY = 'state:routines';

type Ctx = {
  state: RoutineState;
  addRoutine: (r: Omit<Routine, 'id' | 'status'> & Partial<Pick<Routine, 'status'>>) => string;
  updateRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
};

const RoutineContext = createContext<Ctx | undefined>(undefined);

export function RoutineStateProvider({ children }: { children: React.ReactNode }) {
  const initial = loadJSON<RoutineState>(STORAGE_KEY) ?? { routines: [] };
  const [state, setState] = useState<RoutineState>(initial);
  const persist = (next: RoutineState) => saveJSON(STORAGE_KEY, next);

  const addRoutine = (r: Omit<Routine, 'id' | 'status'> & Partial<Pick<Routine, 'status'>>) => {
    const id = `${Date.now()}-${Math.random()}`;
    const routine: Routine = { id, status: r.status ?? 'todo', ...r } as Routine;
    setState(prev => {
      const next = { routines: [...prev.routines, routine] };
      persist(next);
      return next;
    });
    return id;
  };
  const updateRoutine = (u: Routine) => {
    setState(prev => {
      const next = { routines: prev.routines.map(x => (x.id === u.id ? u : x)) };
      persist(next);
      return next;
    });
  };
  const deleteRoutine = (id: string) => {
    setState(prev => {
      const next = { routines: prev.routines.filter(x => x.id !== id) };
      persist(next);
      return next;
    });
  };

  const value = useMemo<Ctx>(() => ({ state, addRoutine, updateRoutine, deleteRoutine }), [state]);
  return <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>;
}

export function useRoutineState(): Ctx {
  const ctx = useContext(RoutineContext);
  /* istanbul ignore next */
  if (!ctx) throw new Error('useRoutineState must be used within RoutineStateProvider');
  return ctx;
}
