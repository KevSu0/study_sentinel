'use client';

import { useMemo } from 'react';
import { useGlobalState } from './use-global-state';
import { CompletedWork } from '@/lib/types';
import { calculateTimeWeightedFocusPercentage } from '@/lib/metrics';

interface ActivityBaseline {
  activityId: string;
  title: string;
  type: 'task' | 'routine';
  medianFocusPercentage: number;
  medianProductiveMinutes: number;
  sessionCount: number;
  lastSessionDate: string;
  trend: 'improving' | 'declining' | 'stable';
}

interface UseActivityBaselinesReturn {
  baselines: Map<string, ActivityBaseline>;
  isLoading: boolean;
}

export function useActivityBaselines(daysToLookback = 28): UseActivityBaselinesReturn {
  const { state } = useGlobalState();
  const { allCompletedWork, isLoaded } = state;

  const baselines = useMemo(() => {
    if (!isLoaded) return new Map();

    // Get sessions from the last N days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToLookback);

    const recentWork = allCompletedWork.filter(work =>
      new Date(work.date) >= cutoffDate
    );

    // Group by activity
    const activityGroups = new Map<string, CompletedWork[]>();

    recentWork.forEach(work => {
      const activityId = work.subjectId || work.title;
      if (!activityGroups.has(activityId)) {
        activityGroups.set(activityId, []);
      }
      activityGroups.get(activityId)!.push(work);
    });

    // Calculate baselines for each activity
    const baselineMap = new Map<string, ActivityBaseline>();

    activityGroups.forEach((sessions, activityId) => {
      if (sessions.length < 2) return; // Need at least 2 sessions for meaningful data

      // Sort by date
      sessions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Calculate medians
      const focusPercentages = sessions.map(s => s.focusPercentage).sort((a, b) => a - b);
      const productiveMinutes = sessions.map(s => Math.round(s.productiveDuration / 60000)).sort((a, b) => a - b);

      const medianFocus = focusPercentages.length % 2 === 0
        ? (focusPercentages[focusPercentages.length / 2 - 1] + focusPercentages[focusPercentages.length / 2]) / 2
        : focusPercentages[Math.floor(focusPercentages.length / 2)];

      const medianProductive = productiveMinutes.length % 2 === 0
        ? (productiveMinutes[productiveMinutes.length / 2 - 1] + productiveMinutes[productiveMinutes.length / 2]) / 2
        : productiveMinutes[Math.floor(productiveMinutes.length / 2)];

      // Calculate trend (compare first half vs second half)
      const halfPoint = Math.floor(sessions.length / 2);
      const firstHalf = sessions.slice(0, halfPoint);
      const secondHalf = sessions.slice(halfPoint);

      const firstHalfFocus = calculateTimeWeightedFocusPercentage(firstHalf);
      const secondHalfFocus = calculateTimeWeightedFocusPercentage(secondHalf);

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (secondHalfFocus > firstHalfFocus + 5) {
        trend = 'improving';
      } else if (secondHalfFocus < firstHalfFocus - 5) {
        trend = 'declining';
      }

      baselineMap.set(activityId, {
        activityId,
        title: sessions[0].title,
        type: sessions[0].type,
        medianFocusPercentage: Math.round(medianFocus * 10) / 10,
        medianProductiveMinutes: Math.round(medianProductive),
        sessionCount: sessions.length,
        lastSessionDate: sessions[sessions.length - 1].timestamp,
        trend,
      });
    });

    return baselineMap;
  }, [allCompletedWork, isLoaded, daysToLookback]);

  return {
    baselines,
    isLoading: !isLoaded,
  };
}