'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type ProfileContextType, type ProfileState, defaultProfileState } from './profile-state-types';
import { useProfileState } from './use-profile-state';

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
  initialState?: Partial<ProfileState>;
}

export function ProfileProvider({ children, initialState }: ProfileProviderProps) {
  const [state, setState] = useState<ProfileState>(() => ({
    ...defaultProfileState,
    ...initialState
  }));

  const actions = useProfileState({ state, setState });

  // Load profile data on mount
  useEffect(() => {
    actions.loadProfile();
  }, [actions.loadProfile]);

  const contextValue: ProfileContextType = {
    state,
    actions
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
}

// Hook to use profile context
export function useProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

// Convenience hooks for specific profile operations
export function useProfileData() {
  const { state } = useProfile();
  return {
    profile: state.profile,
    isLoading: state.isLoading,
    error: state.error
  };
}

export function useProfileActions() {
  const { actions } = useProfile();
  return actions;
}