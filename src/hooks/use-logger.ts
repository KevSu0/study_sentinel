'use client';

import {useState, useEffect, useCallback} from 'react';
import {type LogEvent} from '@/lib/types';
import {subDays, formatISO} from 'date-fns';

const LOGS_KEY = 'studySentinelLogs';

const getSessionDate = () => {
  const now = new Date();
  // Day starts at 4 AM
  if (now.getHours() < 4) {
    return subDays(now, 1);
  }
  return now;
};

const getLogKeyForDate = (date: Date) => {
  return `${LOGS_KEY}_${date.toISOString().split('T')[0]}`;
};

export function useLogger() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadLogs = useCallback(() => {
    const sessionDate = getSessionDate();
    const logKey = getLogKeyForDate(sessionDate);
    try {
      const savedLogs = localStorage.getItem(logKey);
      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      } else {
        setLogs([]);
      }
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

  const addLog = useCallback((type: LogEvent['type'], payload: LogEvent['payload']) => {
    const newLog: LogEvent = {
      id: crypto.randomUUID(),
      timestamp: formatISO(new Date()),
      type,
      payload,
    };

    setLogs(prevLogs => {
      const updatedLogs = [...prevLogs, newLog];
      const logKey = getLogKeyForDate(getSessionDate());
      try {
        localStorage.setItem(logKey, JSON.stringify(updatedLogs));
      } catch (error) {
        console.error('Failed to save log', error);
      }
      return updatedLogs;
    });
  }, []);

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

  return {logs, addLog, getPreviousDayLogs, isLoaded};
}
