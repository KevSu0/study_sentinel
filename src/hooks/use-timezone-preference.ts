import { useState, useEffect } from 'react';

// Simple hook to get/set timezone preference with a default of IST
// Stores the preference in localStorage under 'timezone-preference'
export function useTimezonePreference() {
  const [timezone, setTimezone] = useState<'IST' | 'UTC'>(() => {
    if (typeof window === 'undefined') return 'IST';
    const stored = window.localStorage.getItem('timezone-preference');
    return stored === 'UTC' ? 'UTC' : 'IST';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('timezone-preference', timezone);
    } catch {
      // ignore storage errors
    }
  }, [timezone]);

  return { timezone, setTimezone } as const;
}
