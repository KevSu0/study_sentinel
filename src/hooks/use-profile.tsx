
'use client';

import {useState, useEffect, useCallback, createContext, useContext, ReactNode} from 'react';

export type UserProfile = {
  name: string;
  email: string;
  phone: string;
  passion: string;
  dream: string;
  education: string;
  reasonForUsing: string;
};

const PROFILE_KEY = 'studySentinelProfile';

const defaultProfile: UserProfile = {
  name: '',
  email: '',
  phone: '',
  passion: '',
  dream: '',
  education: '',
  reasonForUsing: '',
};

interface ProfileContextType {
    profile: UserProfile;
    updateProfile: (newProfileData: Partial<UserProfile>) => void;
    isLoaded: boolean;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    try {
      const savedProfile = localStorage.getItem(PROFILE_KEY);
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      } else {
        setProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Failed to load profile from localStorage', error);
      localStorage.removeItem(PROFILE_KEY);
      setProfile(defaultProfile);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const updateProfile = useCallback((newProfileData: Partial<UserProfile>) => {
    setProfile(prevProfile => {
      const updatedProfile = {...prevProfile, ...newProfileData};
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
      } catch (error) {
        console.error('Failed to save profile to localStorage', error);
      }
      return updatedProfile;
    });
  }, []);
  
  const value = { profile, updateProfile, isLoaded };

  return (
    <ProfileContext.Provider value={value}>
        {children}
    </ProfileContext.Provider>
  )
}


export function useProfile() {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error("useProfile must be used within a ProfileProvider");
    }
  return context;
}
