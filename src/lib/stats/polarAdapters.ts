/**
 * Adapters to convert your existing timeline/Gantt sessions
 * into the generic PolarActivity shape used by the polar/radar charts.
 */
import type { PolarActivity } from '@/lib/stats/useDailyPolarData'
import type { Activity } from '@/components/stats/daily-activity-timeline'


// Extremely permissive session shape; adapt as needed
export type AnySession = {
  time: [number, number] // hours in 4..28
  duration?: number // DEPRECATED: now using durationSec
  durationSec?: number
  paused?: number // DEPRECATED: now using pausedSec
  pausedSec?: number
  pausedDuration?: number
  pauseCount?: number;
}


/** Map a list of Activity[] to AnySession[] */
export function sessionsToPolarActivities(sessions: AnySession[]): PolarActivity[] {
  return (sessions || [])
    .map((s) => {
      if (!s || !Array.isArray((s as any).time) || (s as any).time.length < 2) return null;
      return {
        time: (s as any).time as [number, number],
        durationSec: (s as any).durationSec || (s as any).duration || 0,
        pausedSec: (s as any).pausedSec || (s as any).pausedDuration || 0,
        pauseCount: (s as any).pauseCount || 0,
      } as PolarActivity;
    })
    .filter((x): x is PolarActivity => x !== null);
}


/** Map an array of day-arrays into PolarActivity[][] */
export function daysToPolarActivities<T extends AnySession>(days: T[][]): PolarActivity[][] {
  return days.map((day) => sessionsToPolarActivities(day));
}


import { getTimeSinceStudyDayStart } from '@/lib/utils';
import { HydratedActivityAttempt } from '../types';


/** Map a list of HydratedActivityAttempt to AnySession[] */
export function attemptsToAnySessions(attempts: HydratedActivityAttempt[]): AnySession[] {
	return attempts
		.map((attempt) => {
			const startEvent = attempt.events.find((e) => e.type === 'START');
			const endEvent = attempt.events.find((e) => e.type === 'COMPLETE');

			if (!startEvent || !endEvent) return null;

			const startMs = getTimeSinceStudyDayStart(startEvent.occurredAt)
			if (startMs === null) return null

			const startHour = 4 + startMs / (1000 * 60 * 60)
			const endHour = startHour + (attempt.productiveDuration || 0) / 3600

			return {
				time: [startHour, endHour] as [number, number],
				durationSec: attempt.productiveDuration,
			} as AnySession
		})
		.filter((item): item is AnySession => item !== null)
}
