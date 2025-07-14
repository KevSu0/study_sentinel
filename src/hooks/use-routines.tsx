
'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import {type Routine} from '@/lib/types';

const ROUTINES_KEY = 'studySentinelRoutines';

interface RoutinesContextType {
  routines: Routine[];
  addRoutine: (routine: Omit<Routine, 'id'>) => void;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (routineId: string) => void;
  isLoaded: boolean;
  todaysRoutines: Routine[];
}

const RoutinesContext = createContext<RoutinesContextType | null>(null);

export function RoutinesProvider({children}: {children: ReactNode}) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    try {
      const savedRoutines = localStorage.getItem(ROUTINES_KEY);
      if (savedRoutines) {
        setRoutines(JSON.parse(savedRoutines));
      }
    } catch (error) {
      console.error('Failed to load routines from localStorage', error);
      localStorage.removeItem(ROUTINES_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const addRoutine = useCallback((routine: Omit<Routine, 'id'>) => {
    setRoutines(prevRoutines => {
      const newRoutine: Routine = {
        ...routine,
        id: crypto.randomUUID(),
        description: routine.description || '',
      };
      const updatedRoutines = [...prevRoutines, newRoutine];
      const sortedRoutines = [...updatedRoutines].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(sortedRoutines));
      return sortedRoutines;
    });
  }, []);

  const updateRoutine = useCallback((updatedRoutine: Routine) => {
    setRoutines(prevRoutines => {
      const newRoutines = prevRoutines.map(routine =>
        routine.id === updatedRoutine.id ? updatedRoutine : routine
      );
      const sortedRoutines = [...newRoutines].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(sortedRoutines));
      return sortedRoutines;
    });
  }, []);

  const deleteRoutine = useCallback((routineId: string) => {
    setRoutines(prevRoutines => {
      const newRoutines = prevRoutines.filter(
        routine => routine.id !== routineId
      );
      const sortedRoutines = [...newRoutines].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(sortedRoutines));
      return sortedRoutines;
    });
  }, []);

  const todaysRoutines = useMemo(() => {
    const today = new Date().getDay();
    return routines.filter(r => r.days.includes(today));
  }, [routines]);

  const value = {
    routines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    isLoaded,
    todaysRoutines,
  };

  return (
    <RoutinesContext.Provider value={value}>
      {children}
    </RoutinesContext.Provider>
  );
}

export function useRoutines() {
  const context = useContext(RoutinesContext);
  if (!context) {
    throw new Error('useRoutines must be used within a RoutinesProvider');
  }
  return context;
}
