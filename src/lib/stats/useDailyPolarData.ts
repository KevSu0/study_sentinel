import React from 'react';

// Describes a generic session with time, duration, and paused seconds.
export type PolarActivity = {
  time: [number, number];
  durationSec?: number;
  pausedSec?: number;
  pauseCount?: number;
};

// Represents a single hour's aggregated data.
export type HourBin = {
  idx: number;
  hour: number;
  label: string;
  productiveMin: number;
  pausedMin: number;
  pauseCount: number;
  weeklyAvgProductiveMin: number;
  weeklyAvgPausedMin: number;
};

// Pure function to distribute a session's productive seconds into 24 hourly bins.
export function binSession(session: PolarActivity, bins: HourBin[]): void {
  const clamp = (x: number, a: number, b: number) => Math.min(Math.max(x, a), b);
  let start = clamp(session.time[0], 4, 28);
  const end = clamp(session.time[1], 4, 28);
  if (end <= start) return;

  const totalSessionHours = end - start;
  
  // Correctly calculate productive time by subtracting pauses.
  const pausedSec = session.pausedSec ?? 0;
  const productiveSec = (session.durationSec ?? totalSessionHours * 3600) - pausedSec;

  // If totalSessionHours is 0, we can't distribute, so we shouldn't proceed to avoid division by zero.
  if (totalSessionHours <= 0) return;

  while (start < end) {
    const hourStart = Math.floor(start);
    const next = Math.min(end, hourStart + 1);
    const overlapHrs = next - start;
    const bucketIdx = (hourStart - 4 + 24) % 24;
    const overlapRatio = overlapHrs / totalSessionHours;

    const p = overlapRatio * productiveSec;
    bins[bucketIdx].productiveMin += p / 60;

    const z = overlapRatio * pausedSec;
    bins[bucketIdx].pausedMin += z / 60;

    if (session.pauseCount && session.pauseCount > 0) {
      bins[bucketIdx].pauseCount += overlapRatio * session.pauseCount;
    }

    start = next;
  }
}

// Hook to compute daily polar data from today's sessions and the last 7 days.
export function useDailyPolarData({ today, last7 }: { today: PolarActivity[]; last7?: PolarActivity[][] }) {
  const {
    bins,
    maxProductiveMin,
    totalProductiveMin,
    totalPausedMin,
    totalWeeklyAvgProductiveMin,
    totalWeeklyAvgPausedMin,
  } = React.useMemo(() => {
    const newBins: HourBin[] = Array.from({ length: 24 }, (_, k) => ({
      idx: k,
      hour: (k + 4) % 24,
      label: ((k + 4) % 24).toString(),
      productiveMin: 0,
      pausedMin: 0,
      pauseCount: 0,
      weeklyAvgProductiveMin: 0,
      weeklyAvgPausedMin: 0,
    }));

    for (const session of today) {
      binSession(session, newBins);
    }

    let totalWeeklyAvgProductive = 0;
    let totalWeeklyAvgPaused = 0;

    if (last7 && last7.length > 0) {
      const weeklyBins: HourBin[] = Array.from({ length: 24 }, (_, k) => ({
        idx: k,
        hour: (k + 4) % 24,
        label: ((k + 4) % 24).toString(),
        productiveMin: 0,
        pausedMin: 0,
        pauseCount: 0,
        weeklyAvgProductiveMin: 0,
        weeklyAvgPausedMin: 0,
      }));

      for (const day of last7) {
        for (const session of day) {
          binSession(session, weeklyBins);
        }
      }

      for (let i = 0; i < 24; i++) {
        newBins[i].weeklyAvgProductiveMin = weeklyBins[i].productiveMin / last7.length;
        newBins[i].weeklyAvgPausedMin = weeklyBins[i].pausedMin / last7.length;
        totalWeeklyAvgProductive += newBins[i].weeklyAvgProductiveMin;
        totalWeeklyAvgPaused += newBins[i].weeklyAvgPausedMin;
      }
    }

    const productiveMinutes = newBins.map(b => b.productiveMin);
    const max = Math.max(60, ...productiveMinutes);
    const totalProductive = productiveMinutes.reduce((sum, min) => sum + min, 0);
    const totalPaused = newBins.reduce((sum, b) => sum + b.pausedMin, 0);

    return {
      bins: newBins,
      maxProductiveMin: max,
      totalProductiveMin: totalProductive,
      totalPausedMin: totalPaused,
      totalWeeklyAvgProductiveMin: totalWeeklyAvgProductive,
      totalWeeklyAvgPausedMin: totalWeeklyAvgPaused,
    };
  }, [today, last7]);

  return {
    bins,
    maxProductiveMin,
    totalProductiveMin,
    totalPausedMin,
    totalWeeklyAvgProductiveMin,
    totalWeeklyAvgPausedMin,
  };
}
