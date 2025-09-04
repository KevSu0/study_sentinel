
'use client';

import {useState, useEffect, useCallback, createContext, useContext, type ReactNode} from 'react';

export type TaskViewMode = 'card' | 'list';

const VIEW_MODE_KEY = 'studySentinelTaskViewMode';

interface ViewModeContextType {
    viewMode: TaskViewMode;
    setViewMode: (mode: TaskViewMode) => void;
    isLoaded: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | null>(null);

export function ViewModeProvider({children}: {children: ReactNode}) {
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
  
  const value = {viewMode, setViewMode: setMode, isLoaded};

  return (
    <ViewModeContext.Provider value={value}>
        {children}
    </ViewModeContext.Provider>
  )
}


export function useViewMode() {
    const context = useContext(ViewModeContext);
    if (!context) {
        throw new Error("useViewMode must be used within a ViewModeProvider");
    }
  return context;
}
