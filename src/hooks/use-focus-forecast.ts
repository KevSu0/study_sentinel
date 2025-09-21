'use client';

import { useMemo } from 'react';
import { useGlobalState } from './use-global-state';
import { CompletedWork } from '@/lib/types';

interface FocusForecast {
  predictedFocus: number;
  confidence: 'high' | 'medium' | 'low';
  factors: {
    recentTrend: 'up' | 'down' | 'stable';
    timeOfDayEffect: number;
    dayOfWeekEffect: number;
    sessionLengthEffect: number;
  };
  recommendedSessionLength: number; // in minutes
  riskLevel: 'low' | 'medium' | 'high';
}

interface UseFocusForecastReturn {
  forecast: FocusForecast | null;
  isLoading: boolean;
}

// Exponential Moving Average alpha for smoothing
const EMA_ALPHA = 0.25;

export function useFocusForecast(activityId?: string): UseFocusForecastReturn {
  const { state } = useGlobalState();
  const { allCompletedWork, isLoaded } = state;

  const forecast = useMemo(() => {
    if (!isLoaded) return null;

    // Get recent sessions (last 14 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);

    const relevantWork = activityId
      ? allCompletedWork.filter(w =>
          (w.subjectId === activityId || w.title === activityId) &&
          new Date(w.date) >= cutoffDate
        )
      : allCompletedWork.filter(w => new Date(w.date) >= cutoffDate);

    if (relevantWork.length < 3) {
      // Not enough data for forecast
      return null;
    }

    // Sort by timestamp
    const sortedWork = [...relevantWork].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate EMA of focus percentage
    let ema = sortedWork[0].focusPercentage;
    const emaValues: number[] = [ema];

    for (let i = 1; i < sortedWork.length; i++) {
      ema = EMA_ALPHA * sortedWork[i].focusPercentage + (1 - EMA_ALPHA) * ema;
      emaValues.push(ema);
    }

    // Base prediction on current EMA
    const basePrediction = ema;

    // Analyze factors
    const factors = {
      recentTrend: emaValues.length >= 3
        ? emaValues[emaValues.length - 1] > emaValues[emaValues.length - 3] + 2 ? 'up' as const
        : emaValues[emaValues.length - 1] < emaValues[emaValues.length - 3] - 2 ? 'down' as const
        : 'stable' as const
        : 'stable' as const,
      timeOfDayEffect: 0,
      dayOfWeekEffect: 0,
      sessionLengthEffect: 0,
    };

    // Time of day effect (based on historical performance by hour)
    const currentHour = new Date().getHours();
    const hourPerformance: { [hour: number]: number[] } = {};

    sortedWork.forEach(work => {
      const hour = new Date(work.timestamp).getHours();
      if (!hourPerformance[hour]) hourPerformance[hour] = [];
      hourPerformance[hour].push(work.focusPercentage);
    });

    if (hourPerformance[currentHour] && hourPerformance[currentHour].length >= 3) {
      const avgHourPerformance = hourPerformance[currentHour].reduce((sum, p) => sum + p, 0) / hourPerformance[currentHour].length;
      const overallAvg = sortedWork.reduce((sum, w) => sum + w.focusPercentage, 0) / sortedWork.length;
      factors.timeOfDayEffect = avgHourPerformance - overallAvg;
    }

    // Day of week effect
    const currentDayOfWeek = new Date().getDay();
    const dayPerformance: { [day: number]: number[] } = {};

    sortedWork.forEach(work => {
      const day = new Date(work.timestamp).getDay();
      if (!dayPerformance[day]) dayPerformance[day] = [];
      dayPerformance[day].push(work.focusPercentage);
    });

    if (dayPerformance[currentDayOfWeek] && dayPerformance[currentDayOfWeek].length >= 2) {
      const avgDayPerformance = dayPerformance[currentDayOfWeek].reduce((sum, p) => sum + p, 0) / dayPerformance[currentDayOfWeek].length;
      const overallAvg = sortedWork.reduce((sum, w) => sum + w.focusPercentage, 0) / sortedWork.length;
      factors.dayOfWeekEffect = avgDayPerformance - overallAvg;
    }

    // Session length effect (find optimal session length)
    const sessionLengths = sortedWork.map(w => w.totalDuration / 60000); // Convert to minutes
    const sessionLengthBuckets: { [length: string]: { focus: number[]; count: number } } = {
      '0-15': { focus: [], count: 0 },
      '15-30': { focus: [], count: 0 },
      '30-45': { focus: [], count: 0 },
      '45-60': { focus: [], count: 0 },
      '60+': { focus: [], count: 0 },
    };

    sortedWork.forEach(work => {
      const minutes = work.totalDuration / 60000;
      let bucket = '0-15';
      if (minutes > 60) bucket = '60+';
      else if (minutes > 45) bucket = '45-60';
      else if (minutes > 30) bucket = '30-45';
      else if (minutes > 15) bucket = '15-30';

      sessionLengthBuckets[bucket].focus.push(work.focusPercentage);
      sessionLengthBuckets[bucket].count++;
    });

    // Find bucket with best average focus (with minimum 3 sessions)
    let bestBucket = '30-45'; // Default
    let bestAvgFocus = 0;

    Object.entries(sessionLengthBuckets).forEach(([bucket, data]) => {
      if (data.count >= 3) {
        const avgFocus = data.focus.reduce((sum, f) => sum + f, 0) / data.focus.length;
        if (avgFocus > bestAvgFocus) {
          bestAvgFocus = avgFocus;
          bestBucket = bucket;
        }
      }
    });

    // Calculate recommended session length (middle of bucket)
    let recommendedSessionLength = 37.5; // Default (middle of 30-45)
    switch (bestBucket) {
      case '0-15': recommendedSessionLength = 7.5; break;
      case '15-30': recommendedSessionLength = 22.5; break;
      case '45-60': recommendedSessionLength = 52.5; break;
      case '60+': recommendedSessionLength = 75; break;
    }

    // Apply factors to base prediction
    let predictedFocus = basePrediction + factors.timeOfDayEffect + factors.dayOfWeekEffect;
    predictedFocus = Math.max(0, Math.min(100, predictedFocus));

    // Calculate confidence based on data volume and consistency
    const sessionCount = sortedWork.length;
    const focusStdDev = calculateStandardDeviation(sortedWork.map(w => w.focusPercentage));
    const confidence: 'high' | 'medium' | 'low' = sessionCount >= 10 && focusStdDev < 15
      ? 'high'
      : sessionCount >= 5 && focusStdDev < 25
        ? 'medium'
        : 'low';

    // Determine risk level
    const recentSessions = sortedWork.slice(-3);
    const avgRecentPauses = recentSessions.reduce((sum, s) => sum + s.pauseCount, 0) / recentSessions.length;
    const riskLevel: 'high' | 'medium' | 'low' = predictedFocus < 50 && avgRecentPauses > 3
      ? 'high'
      : predictedFocus < 60 || avgRecentPauses > 2
        ? 'medium'
        : 'low';

    return {
      predictedFocus: Math.round(predictedFocus * 10) / 10,
      confidence,
      factors,
      recommendedSessionLength: Math.round(recommendedSessionLength),
      riskLevel,
    };
  }, [allCompletedWork, isLoaded, activityId]);

  return {
    forecast,
    isLoading: !isLoaded,
  };
}

function calculateStandardDeviation(values: number[]): number {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}