'use client';
import {useState, useEffect, useCallback} from 'react';
import {useTasks} from './use-tasks';
import {useToast} from './use-toast';
import {ALL_BADGES} from '@/lib/badges';
import type {Badge} from '@/lib/types';

const BADGES_KEY = 'studySentinelEarnedBadges';

export function useBadges() {
  const {tasks, isLoaded: tasksLoaded} = useTasks();
  const {toast} = useToast();
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedBadges = localStorage.getItem(BADGES_KEY);
      if (savedBadges) {
        setEarnedBadges(new Set(JSON.parse(savedBadges)));
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
      // Use functional update to ensure we have the latest state
      setEarnedBadges(prev => {
        if (prev.has(badge.id)) {
          return prev; // Already earned, no change
        }

        const newEarnedBadges = new Set(prev);
        newEarnedBadges.add(badge.id);

        localStorage.setItem(
          BADGES_KEY,
          JSON.stringify(Array.from(newEarnedBadges))
        );
        
        setTimeout(() => {
          toast({
            title: 'Badge Unlocked! 🎉',
            description: `You've earned the "${badge.name}" badge.`,
          });
        }, 0);


        return newEarnedBadges;
      });
    },
    [toast]
  );

  useEffect(() => {
    if (!tasksLoaded || !isLoaded) return;

    const completedTasks = tasks.filter(task => task.status === 'completed');
    if (completedTasks.length === 0) return;

    for (const badge of ALL_BADGES) {
      if (!earnedBadges.has(badge.id)) {
        try {
          if (badge.checker(completedTasks)) {
            awardBadge(badge);
          }
        } catch (error) {
          console.error(`Error checking badge "${badge.name}":`, error);
        }
      }
    }
  }, [tasks, tasksLoaded, isLoaded, earnedBadges, awardBadge]);

  return {
    allBadges: ALL_BADGES,
    earnedBadges,
    isLoaded: isLoaded && tasksLoaded,
  };
}
