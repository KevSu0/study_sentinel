'use client';

import {useState, useEffect, useCallback} from 'react';

export type TaskViewMode = 'card' | 'list';

const VIEW_MODE_KEY = 'studySentinelTaskViewMode';

export function useViewMode() {
  const [viewMode, setViewMode] = useState<TaskViewMode>('card');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(VIEW_MODE_KEY);
      if (savedMode === 'card' || savedMode === 'list') {
        setViewMode(savedMode);
      }
    } catch (error) {
      console.error('Failed to load view mode from localStorage', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const setMode = useCallback((mode: TaskViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch (error) {
      console.error('Failed to save view mode to localStorage', error);
    }
  }, []);

  return {viewMode, setViewMode: setMode, isLoaded};
}
