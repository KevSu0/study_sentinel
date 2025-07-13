'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import {type LogEvent} from '@/lib/types';
import {subDays, formatISO} from 'date-fns';

// --- Context Setup ---
interface LoggerContextType {
  logs: LogEvent[];
  isLoaded: boolean;
  addLog: (type: LogEvent['type'], payload: LogEvent['payload']) => void;
  getPreviousDayLogs: () => LogEvent[];
  getAllLogs: () => LogEvent[];
}

const LoggerContext = createContext<LoggerContextType | null>(null);

const getSessionDate = () => {
  const now = new Date();
  // Day starts at 4 AM
  if (now.getHours() < 4) {
    return subDays(now, 1);
  }
  return now;
};

const getLogKeyForDate = (date: Date) => {
  return `studySentinelLogs_${date.toISOString().split('T')[0]}`;
};

// --- Provider Component ---
export function LoggerProvider({children}: {children: ReactNode}) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Memoize the load function to prevent re-creation
  const loadLogs = useCallback(() => {
    const sessionDate = getSessionDate();
    const logKey = getLogKeyForDate(sessionDate);
    try {
      const savedLogs = localStorage.getItem(logKey);
      const parsedLogs = savedLogs ? JSON.parse(savedLogs) : [];
      // Use functional update to avoid stale state issues if loadLogs is called rapidly
      setLogs(currentLogs => {
        // Simple check to see if logs are different to prevent needless re-renders
        if (JSON.stringify(currentLogs) !== JSON.stringify(parsedLogs)) {
          return parsedLogs;
        }
        return currentLogs;
      });
    } catch (error) {
      console.error('Failed to load logs', error);
      setLogs([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    // Check for new day every minute
    const interval = setInterval(loadLogs, 60 * 1000);
    return () => clearInterval(interval);
  }, [loadLogs]);

  const addLog = useCallback(
    (type: LogEvent['type'], payload: LogEvent['payload']) => {
      const newLog: LogEvent = {
        id: crypto.randomUUID(),
        timestamp: formatISO(new Date()),
        type,
        payload,
      };

      // Use functional update to ensure we're always working with the latest state
      setLogs(currentLogs => {
        const updatedLogs = [...currentLogs, newLog];
        const logKey = getLogKeyForDate(getSessionDate());
        try {
          localStorage.setItem(logKey, JSON.stringify(updatedLogs));
        } catch (error) {
          console.error('Failed to save log', error);
        }
        return updatedLogs;
      });
    },
    []
  );

  const getPreviousDayLogs = useCallback(() => {
    const sessionDate = getSessionDate();
    const previousDay = subDays(sessionDate, 1);
    const logKey = getLogKeyForDate(previousDay);
    try {
      const savedLogs = localStorage.getItem(logKey);
      return savedLogs ? JSON.parse(savedLogs) : [];
    } catch (error) {
      console.error('Failed to retrieve previous day logs', error);
      return [];
    }
  }, []);

  const getAllLogs = useCallback(() => {
    const allLogs: LogEvent[] = [];
    if (typeof window === 'undefined') return [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('studySentinelLogs_')) {
        try {
          const savedLogs = localStorage.getItem(key);
          if (savedLogs) {
            const parsedLogs = JSON.parse(savedLogs);
            if (Array.isArray(parsedLogs)) {
              allLogs.push(...parsedLogs.filter((log: any) => log.timestamp)); // Basic validation
            }
          }
        } catch (error) {
          console.error(`Failed to load logs for key ${key}`, error);
        }
      }
    }
    // Sort by timestamp to ensure chronological order
    allLogs.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return allLogs;
  }, []);

  const value = {
    logs,
    isLoaded,
    addLog,
    getPreviousDayLogs,
    getAllLogs,
  };

  return (
    <LoggerContext.Provider value={value}>{children}</LoggerContext.Provider>
  );
}

// --- Consumer Hook ---
export const useLogger = () => {
  const context = useContext(LoggerContext);
  if (!context) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }
  return context;
};
