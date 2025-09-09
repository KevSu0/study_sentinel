import { startOfDay, addHours, startOfWeek } from 'date-fns'

// Defaults per decision: Asia/Kolkata local, day start 00:00 local, ISO week (Monday)
// Optionally switch fallbackHour to 5 for 05:00 IST if needed later
const FALLBACK_STUDY_START_HOUR = 0

export function getDayStart(date: Date, options?: { dayStartHour?: number }) {
  const hour = options?.dayStartHour ?? FALLBACK_STUDY_START_HOUR
  const base = startOfDay(date)
  return addHours(base, hour)
}

export function getIsoWeekStart(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 })
}
