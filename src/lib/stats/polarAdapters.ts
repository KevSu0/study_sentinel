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
  return sessions.map((s) => ({
    time: s.time,
    durationSec: s.durationSec || s.duration || 0,
    pausedSec: s.pausedSec || s.pausedDuration || 0,
    pauseCount: s.pauseCount || 0,
  }));
}


/** Map an array of day-arrays into PolarActivity[][] */
export function daysToPolarActivities<T extends AnySession>(days: T[][]): PolarActivity[][] {
  return days.map((day) => sessionsToPolarActivities(day));
}


import type { LogEvent } from '@/lib/types';
import { getTimeSinceStudyDayStart } from '@/lib/utils';


/** Map a list of LogEvents to AnySession[] */
export function logsToAnySessions(logs: LogEvent[]): AnySession[] {
	return logs
		.map((log) => {
			const startMs = getTimeSinceStudyDayStart(log.payload.startTime)
			if (startMs === null) return null

			const startHour = 4 + startMs / (1000 * 60 * 60)
			const endHour = startHour + log.payload.duration / 3600

			return {
				time: [startHour, endHour] as [number, number],
				durationSec: log.payload.duration,
                pausedSec: log.payload.pausedDuration,
                pauseCount: log.payload.pauseCount,
			} as AnySession
		})
		.filter((item): item is AnySession => item !== null)
}
