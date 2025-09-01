"use client";

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BadgeState, BadgeActions } from './badge-state-types';
import type { Badge } from '@/lib/types';
import { loadJSON, saveJSON } from '../../core/use-state-persistence';

const STORAGE_KEY = 'state:badges';

type Ctx = {
  state: BadgeState;
  actions: BadgeActions;
};

const BadgeContext = createContext<Ctx | undefined>(undefined);

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const initial = loadJSON<{ allBadges: Badge[]; earnedBadges: [string, number][] }>(STORAGE_KEY);
  const [state, setState] = useState<BadgeState>({
    allBadges: initial?.allBadges ?? [],
    earnedBadges: new Map(initial?.earnedBadges ?? []),
  });

  const persist = (next: BadgeState) => {
    saveJSON(STORAGE_KEY, { allBadges: next.allBadges, earnedBadges: Array.from(next.earnedBadges.entries()) });
  };

  const addBadge = (b: Omit<Badge, 'id'>) => {
    setState(prev => {
      const badge: Badge = { id: `${Date.now()}`, ...b };
      const next = { ...prev, allBadges: [...prev.allBadges, badge] };
      persist(next);
      return next;
    });
  };
  const updateBadge = (b: Badge) => {
    setState(prev => {
      const next = { ...prev, allBadges: prev.allBadges.map(x => (x.id === b.id ? b : x)) };
      persist(next);
      return next;
    });
  };
  const deleteBadge = (id: string) => {
    setState(prev => {
      const next = { ...prev, allBadges: prev.allBadges.filter(x => x.id !== id) };
      persist(next);
      return next;
    });
  };

  const actions: BadgeActions = {
    addBadge,
    updateBadge,
    deleteBadge,
    checkAndAwardBadges: () => {},
    resetBadges: () => {
      const next: BadgeState = { allBadges: [], earnedBadges: new Map(), isLoading: false, error: null };
      persist(next);
      setState(next);
      try { localStorage.removeItem('badges'); } catch {}
    },
  };
  const value = useMemo<Ctx>(() => ({ state, actions }), [state]);
  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

export function useBadgeState(): Ctx & BadgeActions {
  const ctx = useContext(BadgeContext);
  if (ctx) return { ...ctx, ...ctx.actions } as any;

  // Fallback: provide local state when no provider is present (used by higher-level BadgeProvider)
  const initial = loadJSON<{ allBadges: Badge[]; earnedBadges: [string, number][] }>(STORAGE_KEY);
  const [state, setState] = useState<BadgeState>({
    allBadges: initial?.allBadges ?? [],
    earnedBadges: new Map(initial?.earnedBadges ?? []),
    isLoading: false,
    error: null,
  });

  const persist = (next: BadgeState) => {
    saveJSON(STORAGE_KEY, { allBadges: next.allBadges, earnedBadges: Array.from(next.earnedBadges.entries()) });
  };

  const addBadge = (b: Omit<Badge, 'id'>) => {
    setState(prev => {
      const badge: Badge = { id: `${Date.now()}`, ...b } as Badge;
      const next = { ...prev, allBadges: [...prev.allBadges, badge] };
      persist(next);
      return next;
    });
  };
  const updateBadge = (b: Badge) => {
    setState(prev => {
      const next = { ...prev, allBadges: prev.allBadges.map(x => (x.id === b.id ? b : x)) };
      persist(next);
      return next;
    });
  };
  const deleteBadge = (id: string) => {
    setState(prev => {
      const next = { ...prev, allBadges: prev.allBadges.filter(x => x.id !== id) };
      persist(next);
      return next;
    });
  };

  const actions: BadgeActions = {
    addBadge,
    updateBadge,
    deleteBadge,
    checkAndAwardBadges: () => {},
    resetBadges: () => {
      const next: BadgeState = { allBadges: [], earnedBadges: new Map(), isLoading: false, error: null };
      persist(next);
      setState(next);
      try { localStorage.removeItem('badges'); } catch {}
    },
  };

  return { state, actions, ...actions } as any;
}

// Provide a stub to satisfy index.ts re-export expectations
export function useBadgeStats() {
  return {} as any;
}

export function checkBadgeUnlocked(badge: Badge): boolean {
  return !!badge.isEnabled;
}
