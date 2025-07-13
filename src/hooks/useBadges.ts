'use client';
import {useState, useEffect, useCallback, useMemo} from 'react';
import {useTasks} from './use-tasks.tsx';
import {useLogger} from './use-logger.tsx';
import {useToast} from './use-toast';
import {SYSTEM_BADGES, checkBadge} from '@/lib/badges';
import type {Badge} from '@/lib/types';
import {format} from 'date-fns';
import {useConfetti} from '@/components/providers/confetti-provider';

const EARNED_BADGES_KEY = 'studySentinelEarnedBadges_v3';
const CUSTOM_BADGES_KEY = 'studySentinelCustomBadges_v1';
const SYSTEM_BADGES_CONFIG_KEY = 'studySentinelSystemBadgesConfig_v1';


export function useBadges() {
  const {tasks, isLoaded: tasksLoaded} = useTasks();
  const {getAllLogs, isLoaded: loggerLoaded} = useLogger();
  const {toast} = useToast();
  const {fire} = useConfetti();

  const [earnedBadges, setEarnedBadges] = useState<Map<string, string>>(
    new Map()
  );
  const [customBadges, setCustomBadges] = useState<Badge[]>([]);
  const [systemBadges, setSystemBadges] = useState<Badge[]>([]);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load all badge data from localStorage
  useEffect(() => {
    try {
      // Load earned badge dates
      const savedEarnedBadges = localStorage.getItem(EARNED_BADGES_KEY);
      if (savedEarnedBadges) {
        setEarnedBadges(new Map(JSON.parse(savedEarnedBadges)));
      }

      // Load custom badges
      const savedCustomBadges = localStorage.getItem(CUSTOM_BADGES_KEY);
      if (savedCustomBadges) {
        setCustomBadges(JSON.parse(savedCustomBadges));
      }

      // Load system badge configurations (or initialize them)
      const systemBadgeConfigs = localStorage.getItem(SYSTEM_BADGES_CONFIG_KEY);
      if (systemBadgeConfigs) {
          setSystemBadges(JSON.parse(systemBadgeConfigs));
      } else {
          // First time load: create system badges from template
          const initialSystemBadges = SYSTEM_BADGES.map((b, i) => ({
              ...b,
              id: `system_${i + 1}`,
              isCustom: false,
              isEnabled: true,
          }));
          setSystemBadges(initialSystemBadges);
          localStorage.setItem(SYSTEM_BADGES_CONFIG_KEY, JSON.stringify(initialSystemBadges));
      }

    } catch (error) {
      console.error('Failed to parse badges from localStorage', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const allBadges = useMemo(() => [...systemBadges, ...customBadges], [systemBadges, customBadges]);

  const awardBadge = useCallback(
    (badge: Badge) => {
      // Use a functional update to ensure we have the latest state
      setEarnedBadges(prev => {
        // Double-check if the badge has been awarded in the meantime
        if (prev.has(badge.id)) {
          return prev;
        }

        const newEarnedBadges = new Map(prev);
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        newEarnedBadges.set(badge.id, todayStr);

        // Save to localStorage immediately
        localStorage.setItem(
          EARNED_BADGES_KEY,
          JSON.stringify(Array.from(newEarnedBadges.entries()))
        );

        // Fire UI effects
        fire();
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
  
  // --- Badge CRUD ---
  const addBadge = useCallback((badgeData: Omit<Badge, 'id'>) => {
      const newBadge: Badge = { ...badgeData, id: `custom_${crypto.randomUUID()}`};
      setCustomBadges(prev => {
          const updated = [...prev, newBadge];
          localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(updated));
          return updated;
      });
  }, []);

  const updateBadge = useCallback((updatedBadge: Badge) => {
      if (updatedBadge.isCustom) {
          setCustomBadges(prev => {
              const updated = prev.map(b => b.id === updatedBadge.id ? updatedBadge : b);
              localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(updated));
              return updated;
          });
      } else {
           setSystemBadges(prev => {
              const updated = prev.map(b => b.id === updatedBadge.id ? updatedBadge : b);
              localStorage.setItem(SYSTEM_BADGES_CONFIG_KEY, JSON.stringify(updated));
              return updated;
          });
      }
  }, []);

  const deleteBadge = useCallback((badgeId: string) => {
      setCustomBadges(prev => {
          const updated = prev.filter(b => b.id !== badgeId);
          localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(updated));
          return updated;
      });
      // Also remove from earned badges if it exists
      setEarnedBadges(prev => {
          if (!prev.has(badgeId)) return prev;
          const newEarned = new Map(prev);
          newEarned.delete(badgeId);
          localStorage.setItem(EARNED_BADGES_KEY, JSON.stringify(Array.from(newEarned.entries())));
          return newEarned;
      });
  }, []);

  // Main evaluation effect
  useEffect(() => {
    if (!tasksLoaded || !isLoaded || !loggerLoaded) return;

    // We only need to get all logs once for this evaluation cycle
    const allLogs = getAllLogs();
    
    // Create a stable copy of earnedBadges to check against
    const currentEarnedBadges = new Set(earnedBadges.keys());

    for (const badge of allBadges) {
      if (!currentEarnedBadges.has(badge.id)) {
        try {
          if (checkBadge(badge, {tasks, logs: allLogs})) {
            awardBadge(badge);
          }
        } catch (error) {
          console.error(`Error checking badge "${badge.name}":`, error);
        }
      }
    }
  // The dependency array is critical. We only want to re-run this when the underlying data changes.
  // `allBadges` and `awardBadge` are stable dependencies.
  }, [tasks, tasksLoaded, isLoaded, loggerLoaded, allBadges, earnedBadges, awardBadge, getAllLogs]);

  return {
    allBadges,
    earnedBadges,
    addBadge,
    updateBadge,
    deleteBadge,
    isLoaded: isLoaded && tasksLoaded && loggerLoaded,
  };
}
