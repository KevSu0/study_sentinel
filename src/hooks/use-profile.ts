'use client';

import {useState, useEffect, useCallback} from 'react';

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

export function useProfile() {
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

  return {
    profile,
    updateProfile,
    isLoaded,
  };
}
