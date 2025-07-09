'use client';
import {useState, useEffect, useCallback} from 'react';
import {useTasks} from './use-tasks';
import {useLogger} from './use-logger';
import {useToast} from './use-toast';
import {ALL_BADGES} from '@/lib/badges';
import type {Badge} from '@/lib/types';
import {format} from 'date-fns';
import {useConfetti} from '@/components/providers/confetti-provider';

const BADGES_KEY = 'studySentinelEarnedBadges_v2'; // v2 to handle new data structure

export function useBadges() {
  const {tasks, isLoaded: tasksLoaded} = useTasks();
  const {getAllLogs, isLoaded: loggerLoaded} = useLogger();
  const {toast} = useToast();
  const {fire} = useConfetti();
  const [earnedBadges, setEarnedBadges] = useState<Map<string, string>>(
    new Map()
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedBadges = localStorage.getItem(BADGES_KEY);
      if (savedBadges) {
        // New format is an array of [key, value] pairs
        setEarnedBadges(new Map(JSON.parse(savedBadges)));
      }
    } catch (error) {
      console.error('Failed to parse badges from localStorage', error);
      localStorage.removeItem(BADGES_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const awardBadge = useCallback(
    (badge: Badge) => {
      setEarnedBadges(prev => {
        if (prev.has(badge.id)) {
          return prev; // Already earned, no change
        }

        const newEarnedBadges = new Map(prev);
        newEarnedBadges.set(badge.id, format(new Date(), 'yyyy-MM-dd'));

        localStorage.setItem(
          BADGES_KEY,
          JSON.stringify(Array.from(newEarnedBadges.entries()))
        );

        fire(); // Trigger confetti!

        setTimeout(() => {
          toast({
            title: `Badge Unlocked: ${badge.name}! 🎉`,
            description: badge.motivationalMessage,
          });
        }, 500);

        return newEarnedBadges;
      });
    },
    [toast, fire]
  );

  useEffect(() => {
    if (!tasksLoaded || !isLoaded || !loggerLoaded) return;

    const completedTasks = tasks.filter(task => task.status === 'completed');
    const allLogs = getAllLogs();

    for (const badge of ALL_BADGES) {
      if (!earnedBadges.has(badge.id)) {
        try {
          if (badge.checker({completedTasks, logs: allLogs})) {
            awardBadge(badge);
          }
        } catch (error) {
          console.error(`Error checking badge "${badge.name}":`, error);
        }
      }
    }
  }, [
    tasks,
    tasksLoaded,
    isLoaded,
    loggerLoaded,
    earnedBadges,
    awardBadge,
    getAllLogs,
  ]);

  return {
    allBadges: ALL_BADGES,
    earnedBadges,
    isLoaded: isLoaded && tasksLoaded && loggerLoaded,
  };
}
