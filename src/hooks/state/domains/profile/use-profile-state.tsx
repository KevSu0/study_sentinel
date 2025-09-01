"use client";

import { useCallback } from 'react';
import type { ProfileState, ProfileActions, UserProfile } from './profile-state-types';

interface UseProfileStateProps {
  state: ProfileState;
  setState: (updater: (prev: ProfileState) => ProfileState) => void;
}

export function useProfileState(): ProfileActions & { state: ProfileState };
export function useProfileState(props: UseProfileStateProps): ProfileActions;
export function useProfileState(props?: UseProfileStateProps): any {
  if (!props) {
    // No props: use context-backed provider values for tests
    const { state, actions } = require('./ProfileProvider');
    const ctx = (require('./ProfileProvider') as typeof import('./ProfileProvider')).useProfile();
    return { ...ctx.actions, state: ctx.state };
  }
  const { setState } = props;
  const loadProfile = useCallback(() => {
    setState(prev => ({ ...prev }));
  }, [setState]);

  const updateProfile = useCallback((data: Partial<UserProfile>) => {
    setState(prev => ({ ...prev, profile: { ...prev.profile, ...data } }));
  }, [setState]);

  return { loadProfile, updateProfile };
}

// Re-export provider for backward-compat with tests that import from this module
export { ProfileProvider } from './ProfileProvider';
