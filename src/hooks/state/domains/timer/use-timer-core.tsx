"use client";

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ActiveTimerItem, TimerState } from './timer-state-types';

type Ctx = {
  state: TimerState;
  startTimer: (item: ActiveTimerItem) => void;
  togglePause: () => void;
  stopTimer: () => void;
  completeTimer: () => void;
};

const TimerContext = createContext<Ctx | undefined>(undefined);

export function TimerStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>({ activeItem: null, isPaused: true, timeDisplay: '00:00', timerProgress: null });

  const startTimer = (item: ActiveTimerItem) => {
    setState({ activeItem: item, isPaused: false, timeDisplay: item.duration ? `${item.duration.toString().padStart(2, '0')}:00` : '00:00', timerProgress: item.duration ? 0 : null });
  };
  const togglePause = () => setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  const stopTimer = () => setState({ activeItem: null, isPaused: false, timeDisplay: '00:00', timerProgress: null });
  const completeTimer = () => setState({ activeItem: null, isPaused: false, timeDisplay: '00:00', timerProgress: null });

  const value = useMemo<Ctx>(() => ({ state, startTimer, togglePause, stopTimer, completeTimer }), [state]);
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimerState(): Ctx {
  const ctx = useContext(TimerContext);
  /* istanbul ignore next */
  if (!ctx) throw new Error('useTimerState must be used within TimerStateProvider');
  return ctx;
}
